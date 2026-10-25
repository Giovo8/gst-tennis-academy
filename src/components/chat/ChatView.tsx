'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { Check, LogOut, Mail, Search, Send, Settings, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { getSessionUser } from '@/lib/auth/clientSession';
import logger from '@/lib/logger/secure-logger';
import { createNotification } from '@/lib/notifications/createNotification';
import { getMessageNotificationLink } from '@/lib/notifications/links';
import { CHAT_READ_EVENT } from '@/lib/hooks/useUnreadChat';
import { SESSION_EXPIRED, toastError } from '@/lib/toast';

/**
 * Chat delle dashboard (atleta, maestro, admin): messaggi diretti
 * (internal_messages) e gruppi (chat_groups, via /api/chat-groups).
 *
 * La conversazione aperta è derivata dalla lista tramite id, così i messaggi
 * che arrivano in realtime compaiono anche nella chat aperta. Il realtime
 * aggiunge il singolo messaggio; si ricarica tutto solo per conversazioni o
 * gruppi nuovi e quando la scheda torna visibile.
 */

interface ChatProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role?: string | null;
}

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string | null;
  group_id: string | null;
  content: string;
  is_read: boolean;
  created_at: string;
  sender?: ChatProfile | null;
  recipient?: ChatProfile | null;
}

interface GroupMember {
  id: string;
  user_id: string;
  role: 'admin' | 'member';
  user: ChatProfile | null;
}

interface ChatGroup {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  members: GroupMember[];
  last_message: { id: string; sender_id: string; content: string; created_at: string } | null;
  unread_count: number;
}

interface Conversation {
  /** "direct-<userId>" oppure "group-<groupId>" (stesso formato dei link delle notifiche) */
  id: string;
  type: 'direct' | 'group';
  name: string;
  avatar: string | null;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: Message[];
  /** I messaggi dei gruppi si scaricano solo all'apertura */
  messagesLoaded: boolean;
  partner?: ChatProfile;
  group?: ChatGroup;
}

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: string;
}

interface CurrentUser extends ChatProfile {
  role: string | null;
}

const MESSAGE_SELECT = `
  id,
  sender_id,
  recipient_id,
  group_id,
  content,
  is_read,
  created_at,
  sender:sender_id(id, full_name, avatar_url, role),
  recipient:recipient_id(id, full_name, avatar_url, role)
`;

// Messaggi diretti più recenti caricati all'apertura della pagina
const DIRECT_MESSAGES_LIMIT = 500;
const MAX_MESSAGE_LENGTH = 2000;

async function getAuthHeaders(): Promise<Record<string, string> | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : null;
}

function byDateAsc(a: { created_at: string }, b: { created_at: string }) {
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
}

function buildDirectConversations(messages: Message[], myId: string): Conversation[] {
  const byPartner = new Map<string, Message[]>();
  for (const msg of messages) {
    if (!msg.recipient_id) continue;
    const partnerId = msg.sender_id === myId ? msg.recipient_id : msg.sender_id;
    const list = byPartner.get(partnerId) ?? [];
    list.push(msg);
    byPartner.set(partnerId, list);
  }

  return [...byPartner.entries()].map(([partnerId, list]) => {
    const sorted = [...list].sort(byDateAsc);
    const last = sorted[sorted.length - 1];
    const partner = (last.sender_id === myId ? last.recipient : last.sender) ?? {
      id: partnerId,
      full_name: 'Utente',
      avatar_url: null,
    };

    return {
      id: `direct-${partnerId}`,
      type: 'direct',
      name: partner.full_name || 'Utente',
      avatar: partner.avatar_url,
      lastMessage: last.content,
      lastMessageTime: last.created_at,
      unreadCount: sorted.filter((m) => m.recipient_id === myId && !m.is_read).length,
      messages: sorted,
      messagesLoaded: true,
      partner,
    };
  });
}

function groupConversation(group: ChatGroup, previous?: Conversation): Conversation {
  // I messaggi già scaricati si tengono se nel frattempo non ne sono arrivati altri
  const previousLast = previous?.messages[previous.messages.length - 1];
  const keepMessages = !!previous?.messagesLoaded && previousLast?.id === group.last_message?.id;

  return {
    id: `group-${group.id}`,
    type: 'group',
    name: group.name,
    avatar: null,
    lastMessage: group.last_message?.content ?? '',
    lastMessageTime: group.last_message?.created_at ?? group.created_at,
    unreadCount: group.unread_count,
    messages: keepMessages ? previous.messages : [],
    messagesLoaded: keepMessages,
    group,
  };
}

function withMessage(conv: Conversation, msg: Message, countAsUnread: boolean): Conversation {
  if (conv.messages.some((m) => m.id === msg.id)) return conv;
  return {
    ...conv,
    messages: conv.messagesLoaded ? [...conv.messages, msg] : conv.messages,
    lastMessage: msg.content,
    lastMessageTime: msg.created_at,
    unreadCount: conv.unreadCount + (countAsUnread ? 1 : 0),
  };
}

/** Testo della ricerca utenti senza i caratteri che rompono il filtro .or() di PostgREST. */
function sanitizeSearch(term: string) {
  return term.replace(/[%,()*\\"]/g, ' ').trim();
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function ChatView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedConversation = searchParams.get('c');

  const [me, setMe] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  // Chat diretta appena avviata, senza messaggi: entra nella lista al primo invio
  const [draft, setDraft] = useState<Conversation | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);

  const [newChatOpen, setNewChatOpen] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<UserProfile[]>([]);
  const [groupName, setGroupName] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [chatContainerHeight, setChatContainerHeight] = useState<number>(520);

  // Stato letto dai callback realtime, registrati una sola volta
  const meRef = useRef<CurrentUser | null>(null);
  const conversationsRef = useRef<Conversation[]>([]);
  const selectedIdRef = useRef<string | null>(null);

  useEffect(() => {
    meRef.current = me;
  }, [me]);
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);
  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const selectedConversation = useMemo(
    () =>
      conversations.find((c) => c.id === selectedId) ??
      (draft && draft.id === selectedId ? draft : null),
    [conversations, draft, selectedId],
  );

  const loadConversations = useCallback(async (myId: string) => {
    const headers = await getAuthHeaders();

    const [directResult, groups] = await Promise.all([
      supabase
        .from('internal_messages')
        .select(MESSAGE_SELECT)
        .is('group_id', null)
        .or(`sender_id.eq.${myId},recipient_id.eq.${myId}`)
        .order('created_at', { ascending: false })
        .limit(DIRECT_MESSAGES_LIMIT),
      headers
        ? fetch('/api/chat-groups', { headers })
            .then(async (res) => {
              if (!res.ok) throw new Error(`chat-groups ${res.status}`);
              return (await res.json()) as ChatGroup[];
            })
            .catch((error) => {
              logger.error('Caricamento gruppi chat non riuscito', error);
              return null;
            })
        : Promise.resolve(null),
    ]);

    if (directResult.error) {
      logger.error('Caricamento messaggi diretti non riuscito', directResult.error);
    }

    // Se una delle due letture fallisce si tiene la parte già caricata
    setConversations((prev) => {
      const direct = directResult.error
        ? prev.filter((c) => c.type === 'direct')
        : buildDirectConversations((directResult.data ?? []) as unknown as Message[], myId);
      const groupConvs =
        groups === null
          ? prev.filter((c) => c.type === 'group')
          : groups.map((g) =>
              groupConversation(
                g,
                prev.find((c) => c.id === `group-${g.id}`),
              ),
            );
      return [...direct, ...groupConvs];
    });
  }, []);

  // Primo caricamento: profilo e conversazioni in parallelo
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const {
        data: { user },
      } = await getSessionUser();
      if (!user) {
        if (!cancelled) setLoading(false);
        return;
      }

      const [{ data: profile }] = await Promise.all([
        supabase.from('profiles').select('full_name, avatar_url, role').eq('id', user.id).single(),
        loadConversations(user.id),
      ]);

      if (cancelled) return;
      setMe({
        id: user.id,
        full_name: profile?.full_name || 'Utente',
        avatar_url: profile?.avatar_url ?? null,
        role: profile?.role ?? null,
      });
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [loadConversations]);

  const markNotificationsRead = useCallback(async (conversationId: string) => {
    const user = meRef.current;
    if (!user) return;
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('type', 'message')
      .eq('is_read', false)
      .eq('link', getMessageNotificationLink(user.role, conversationId));
    if (error) logger.error('Notifiche chat non segnate come lette', error);
  }, []);

  const markConversationRead = useCallback(async (conv: Conversation) => {
    const user = meRef.current;
    if (!user) return;

    setConversations((prev) =>
      prev.map((c) =>
        c.id === conv.id
          ? {
              ...c,
              unreadCount: 0,
              messages: c.messages.map((m) =>
                m.recipient_id === user.id && !m.is_read ? { ...m, is_read: true } : m,
              ),
            }
          : c,
      ),
    );

    const { error } =
      conv.type === 'group' && conv.group
        ? await supabase.rpc('mark_chat_group_read', { p_group_id: conv.group.id })
        : await supabase
            .from('internal_messages')
            .update({ is_read: true })
            .eq('recipient_id', user.id)
            .eq('sender_id', conv.partner?.id ?? '')
            .is('group_id', null)
            .eq('is_read', false);

    if (error) logger.error('Messaggi non segnati come letti', error);
    window.dispatchEvent(new Event(CHAT_READ_EVENT));
  }, []);

  // Realtime: nuovi messaggi (la RLS consegna solo quelli dell'utente) e
  // notifiche chat arrivate mentre la conversazione è già aperta.
  useEffect(() => {
    if (!me?.id) return;
    const myId = me.id;
    let reloadTimer: ReturnType<typeof setTimeout> | undefined;

    function scheduleReload() {
      clearTimeout(reloadTimer);
      reloadTimer = setTimeout(() => loadConversations(myId), 300);
    }

    function handleNewMessage(row: Message) {
      const partnerId = row.sender_id === myId ? row.recipient_id : row.sender_id;
      const convId = row.group_id ? `group-${row.group_id}` : `direct-${partnerId}`;
      const conv = conversationsRef.current.find((c) => c.id === convId);

      // Conversazione nuova (primo messaggio da qualcuno, gruppo appena creato)
      if (!conv) {
        scheduleReload();
        return;
      }

      const fromMe = row.sender_id === myId;
      const sender =
        conv.type === 'group'
          ? conv.group?.members.find((m) => m.user_id === row.sender_id)?.user
          : fromMe
          ? meRef.current
          : conv.partner;

      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? withMessage(c, { ...row, sender }, !fromMe) : c)),
      );
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') scheduleReload();
    }

    const channel = supabase
      .channel(`chat_${myId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'internal_messages' },
        (payload) => handleNewMessage(payload.new as Message),
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${myId}`,
        },
        (payload) => {
          const notification = payload.new as { type?: string; is_read?: boolean; link?: string };
          const openId = selectedIdRef.current;
          if (!openId || notification.type !== 'message' || notification.is_read) return;
          if (notification.link === getMessageNotificationLink(meRef.current?.role, openId)) {
            markNotificationsRead(openId);
          }
        },
      )
      .subscribe();

    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearTimeout(reloadTimer);
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [me?.id, loadConversations, markNotificationsRead]);

  // Conversazione aperta: segna come letti i messaggi, anche quelli che arrivano dopo
  useEffect(() => {
    if (selectedConversation && selectedConversation.unreadCount > 0) {
      markConversationRead(selectedConversation);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation?.id, selectedConversation?.unreadCount, markConversationRead]);

  useEffect(() => {
    if (selectedId && me) markNotificationsRead(selectedId);
  }, [selectedId, me, markNotificationsRead]);

  // Messaggi del gruppo scaricati all'apertura
  useEffect(() => {
    const conv = selectedConversation;
    if (!conv || conv.type !== 'group' || conv.messagesLoaded || !conv.group) return;

    let cancelled = false;
    const groupId = conv.group.id;

    (async () => {
      try {
        const headers = await getAuthHeaders();
        if (!headers) throw new Error(SESSION_EXPIRED);
        const res = await fetch(`/api/chat-groups/${groupId}/messages`, { headers });
        const body = await res.json().catch(() => null);
        if (!res.ok) throw body ?? new Error(`status ${res.status}`);
        if (cancelled) return;

        const messages = body as Message[];
        setConversations((prev) =>
          prev.map((c) => (c.id === conv.id ? { ...c, messages, messagesLoaded: true } : c)),
        );
      } catch (error) {
        if (!cancelled) toastError(error, 'Messaggi non caricati');
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation?.id, selectedConversation?.messagesLoaded]);

  // Apertura da notifica: ?c=<conversazione>, poi il parametro viene tolto dall'URL
  const [handledRequest, setHandledRequest] = useState<string | null>(null);
  if (!loading && requestedConversation && requestedConversation !== handledRequest) {
    setHandledRequest(requestedConversation);
    if (conversations.some((c) => c.id === requestedConversation)) {
      setSelectedId(requestedConversation);
      setNewChatOpen(false);
    }
  } else if (!requestedConversation && handledRequest) {
    setHandledRequest(null);
  }

  useEffect(() => {
    if (requestedConversation && !loading) router.replace(pathname, { scroll: false });
  }, [requestedConversation, loading, router, pathname]);

  // Sempre in fondo all'ultimo messaggio
  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [selectedId, selectedConversation?.messages.length]);

  // Ricerca utenti con attesa tra un tasto e l'altro
  const searchTerm = sanitizeSearch(userSearch);
  useEffect(() => {
    const term = searchTerm;
    if (term.length < 2 || !me) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, role')
        .neq('id', me.id)
        .or(`full_name.ilike.%${term}%,email.ilike.%${term}%`)
        .order('full_name')
        .limit(10);

      if (cancelled) return;
      if (error) logger.error('Ricerca utenti non riuscita', error);
      setSearchResults((data ?? []) as UserProfile[]);
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchTerm, me]);

  async function handleSendMessage() {
    const conv = selectedConversation;
    const content = messageInput.trim();
    if (!conv || !content || !me || sending) return;

    setSending(true);
    setMessageInput('');

    try {
      let message: Message;

      if (conv.type === 'group' && conv.group) {
        const headers = await getAuthHeaders();
        if (!headers) throw new Error(SESSION_EXPIRED);

        const res = await fetch(`/api/chat-groups/${conv.group.id}/messages`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        });
        const body = await res.json().catch(() => null);
        if (!res.ok) throw body ?? new Error(`status ${res.status}`);
        message = body as Message;
      } else if (conv.partner) {
        const { data, error } = await supabase
          .from('internal_messages')
          .insert({
            sender_id: me.id,
            recipient_id: conv.partner.id,
            subject: 'Chat',
            content,
          })
          .select(MESSAGE_SELECT)
          .single();
        if (error) throw error;
        message = data as unknown as Message;

        // Non bloccante; il server tiene una sola notifica non letta per conversazione
        void createNotification({
          userId: conv.partner.id,
          type: 'message',
          title: `Nuovo messaggio da ${me.full_name}`,
          message: content.length > 100 ? `${content.substring(0, 100)}...` : content,
          link: getMessageNotificationLink(conv.partner.role, `direct-${me.id}`),
        });
      } else {
        return;
      }

      setConversations((prev) =>
        prev.some((c) => c.id === conv.id)
          ? prev.map((c) => (c.id === conv.id ? withMessage(c, message, false) : c))
          : [withMessage(conv, message, false), ...prev],
      );
      if (draft?.id === conv.id) setDraft(null);
    } catch (error) {
      setMessageInput(content);
      toastError(error, 'Invio non riuscito');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function startNewChat(userProfile: UserProfile) {
    const id = `direct-${userProfile.id}`;
    if (!conversations.some((c) => c.id === id)) {
      setDraft({
        id,
        type: 'direct',
        name: userProfile.full_name,
        avatar: userProfile.avatar_url,
        lastMessage: '',
        lastMessageTime: new Date().toISOString(),
        unreadCount: 0,
        messages: [],
        messagesLoaded: true,
        partner: {
          id: userProfile.id,
          full_name: userProfile.full_name,
          avatar_url: userProfile.avatar_url,
          role: userProfile.role,
        },
      });
    }
    setSelectedId(id);
    closeNewChat();
  }

  function closeNewChat() {
    setNewChatOpen(false);
    setUserSearch('');
    setSearchResults([]);
    setGroupName('');
    setSelectedMembers([]);
  }

  function toggleMemberSelection(userProfile: UserProfile) {
    setSelectedMembers((prev) =>
      prev.some((m) => m.id === userProfile.id)
        ? prev.filter((m) => m.id !== userProfile.id)
        : [...prev, userProfile],
    );
  }

  async function createGroup() {
    if (selectedMembers.length < 2) return;

    setCreatingGroup(true);
    try {
      const headers = await getAuthHeaders();
      if (!headers) throw new Error(SESSION_EXPIRED);

      const res = await fetch('/api/chat-groups', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: groupName.trim() || getDefaultGroupName(),
          member_ids: selectedMembers.map((m) => m.id),
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toastError(body, 'Creazione gruppo non riuscita');
        return;
      }

      const group = body as ChatGroup;
      const conv = { ...groupConversation(group), messagesLoaded: true };
      setConversations((prev) => [conv, ...prev.filter((c) => c.id !== conv.id)]);
      setSelectedId(conv.id);
      closeNewChat();
    } catch (error) {
      toastError(error, 'Creazione gruppo non riuscita');
    } finally {
      setCreatingGroup(false);
    }
  }

  async function leaveGroup() {
    const conv = selectedConversation;
    if (!conv?.group) return;
    if (!confirm('Vuoi abbandonare questo gruppo?')) return;

    try {
      const headers = await getAuthHeaders();
      if (!headers) throw new Error(SESSION_EXPIRED);

      const res = await fetch(`/api/chat-groups/${conv.group.id}/members`, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) {
        toastError(await res.json().catch(() => null), 'Uscita non riuscita');
        return;
      }

      setConversations((prev) => prev.filter((c) => c.id !== conv.id));
      setSelectedId(null);
      setSettingsOpen(false);
      window.dispatchEvent(new Event(CHAT_READ_EVENT));
      toast.success('Hai lasciato il gruppo');
    } catch (error) {
      toastError(error, 'Uscita non riuscita');
    }
  }

  function getDefaultGroupName() {
    const usedNumbers = conversations
      .filter((conv) => conv.type === 'group')
      .map((conv) => {
        const match = conv.name.match(/^Gruppo\s+(\d+)$/i);
        return match ? Number(match[1]) : 0;
      });

    const nextNumber = (usedNumbers.length > 0 ? Math.max(...usedNumbers) : 0) + 1;
    return `Gruppo ${nextNumber}`;
  }

  const visibleConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return conversations
      .filter((conv) => conv.name.toLowerCase().includes(query))
      .sort(
        (a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime(),
      );
  }, [conversations, searchQuery]);

  // Risultati vecchi nascosti appena la ricerca torna sotto i 2 caratteri
  const shownResults = searchTerm.length >= 2 ? searchResults : [];
  const visibleMemberOptions = [
    ...selectedMembers,
    ...shownResults.filter((user) => !selectedMembers.some((member) => member.id === user.id)),
  ];

  useEffect(() => {
    const updateChatHeight = () => {
      if (!chatContainerRef.current || typeof window === 'undefined') return;

      const top = chatContainerRef.current.getBoundingClientRect().top;
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const bottomSpacing = window.innerWidth >= 1024 ? 44 : 36;
      const nextHeight = Math.max(320, Math.floor(viewportHeight - top - bottomSpacing));

      setChatContainerHeight((prev) => (Math.abs(prev - nextHeight) > 1 ? nextHeight : prev));
    };

    updateChatHeight();
    window.addEventListener('resize', updateChatHeight);
    window.addEventListener('orientationchange', updateChatHeight);
    window.visualViewport?.addEventListener('resize', updateChatHeight);
    window.visualViewport?.addEventListener('scroll', updateChatHeight);

    return () => {
      window.removeEventListener('resize', updateChatHeight);
      window.removeEventListener('orientationchange', updateChatHeight);
      window.visualViewport?.removeEventListener('resize', updateChatHeight);
      window.visualViewport?.removeEventListener('scroll', updateChatHeight);
    };
  }, [newChatOpen]);

  return (
    <div className="space-y-6 pt-3">
      <h1 className="text-4xl font-bold text-secondary">Chat</h1>

      {!newChatOpen && (
        <div className="w-full">
          <button
            onClick={() => setNewChatOpen(true)}
            className="w-full px-4 py-3 text-sm font-semibold text-white bg-secondary rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
          >
            Nuova Chat
          </button>
        </div>
      )}

      {newChatOpen && (
        <div className="bg-white rounded-lg border border-black/10 overflow-hidden">
          <div className="px-6 py-4 border-b border-black/10 bg-gray-50 flex items-center justify-between gap-3">
            <h2 className="text-base sm:text-lg font-semibold text-secondary">
              {selectedMembers.length > 1 ? 'Nuovo Gruppo' : 'Nuova Chat'}
            </h2>
            <button
              onClick={closeNewChat}
              className="rounded-lg p-2 text-secondary/70 hover:bg-secondary/10 hover:text-secondary transition-colors"
              aria-label="Chiudi nuova chat"
              title="Chiudi"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 border-b border-black/10 bg-white space-y-4">
            {selectedMembers.length > 1 && (
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Nome del gruppo
                </label>
                <input
                  type="text"
                  placeholder={`Es. ${getDefaultGroupName()}`}
                  value={groupName}
                  maxLength={80}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full rounded-lg border border-black/10 bg-white px-4 py-3 text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-0 focus:border-black/10"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-secondary mb-2">Cerca persone</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
                <input
                  type="text"
                  placeholder="Cerca per nome o email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full rounded-lg border border-black/10 bg-white pl-10 pr-4 py-3 text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-0 focus:border-black/10"
                />
              </div>
            </div>
          </div>

          {(selectedMembers.length > 0 || userSearch.trim().length > 0) && (
            <div className="p-6 bg-white max-h-[360px] overflow-y-auto">
              {visibleMemberOptions.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-secondary/60">
                    {userSearch.length > 1
                      ? 'Nessun utente trovato'
                      : 'Cerca un utente per iniziare'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {visibleMemberOptions.map((user) => {
                    const isSelected = selectedMembers.some((m) => m.id === user.id);
                    return (
                      <div
                        key={user.id}
                        onClick={() => toggleMemberSelection(user)}
                        className="flex items-center gap-3 rounded-lg border border-secondary bg-secondary text-white p-3 cursor-pointer transition-all hover:opacity-95"
                      >
                        <div className="w-5 h-5 flex-shrink-0 rounded border-2 border-white bg-white flex items-center justify-center transition-colors">
                          {isSelected && <Check className="h-3 w-3 text-secondary" />}
                        </div>
                        <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-white/10 text-white flex items-center justify-center text-sm font-bold overflow-hidden">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt={user.full_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>{getInitials(user.full_name)}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate text-white">
                              {user.full_name}
                            </p>
                            <p className="text-xs mt-0.5 truncate text-white/80">{user.email}</p>
                          </div>
                          <span className="flex-shrink-0 text-xs font-semibold uppercase tracking-wide text-white/80">
                            {user.role}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="p-6 bg-white">
            <button
              onClick={() => {
                if (selectedMembers.length === 1) {
                  startNewChat(selectedMembers[0]);
                } else if (selectedMembers.length > 1) {
                  createGroup();
                }
              }}
              disabled={selectedMembers.length === 0 || creatingGroup}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-secondary px-6 py-3 text-sm font-semibold text-white hover:opacity-90 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creatingGroup ? (
                <>
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creazione in corso...
                </>
              ) : selectedMembers.length > 1 ? (
                <>Crea Gruppo</>
              ) : selectedMembers.length === 1 ? (
                <>Avvia Chat</>
              ) : (
                <>Seleziona almeno una persona</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Chat Container */}
      <div
        ref={chatContainerRef}
        style={{ height: `${chatContainerHeight}px` }}
        className="min-h-[320px] flex flex-col bg-white rounded-lg border border-black/10 overflow-hidden"
      >
        <div className="flex h-full">
          {/* Sidebar - Lista conversazioni */}
          <div
            className={`w-full ${
              selectedConversation ? 'md:w-80 border-r border-gray-200' : 'md:w-full border-r-0'
            } flex flex-col ${selectedConversation ? 'hidden md:flex' : 'flex'}`}
          >
            <div className="h-16 px-6 border-b border-black/10 bg-gray-50 flex items-center">
              <h2 className="text-base sm:text-lg font-semibold text-secondary">Chat</h2>
            </div>

            <div className="px-6 pt-4 bg-white">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
                <input
                  type="text"
                  placeholder="Cerca conversazioni..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white border border-black/10 text-secondary placeholder-secondary/40 focus:outline-none focus:ring-0 focus:border-black/10"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pt-3 pb-4">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Caricamento...</div>
              ) : visibleConversations.length === 0 ? (
                <div className="p-8 text-center">
                  <Mail className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">Nessuna conversazione</p>
                  <button
                    onClick={() => setNewChatOpen(true)}
                    className="mt-3 text-sm text-secondary hover:underline"
                  >
                    Inizia una nuova chat
                  </button>
                </div>
              ) : (
                <ul className="space-y-2">
                  {visibleConversations.map((conv) => {
                    const isUnread = conv.unreadCount > 0;
                    const isSelected = selectedConversation?.id === conv.id;
                    const memberCount = conv.group?.members.length ?? 0;

                    return (
                      <li key={conv.id}>
                        <button
                          onClick={() => setSelectedId(conv.id)}
                          className={`w-full text-left rounded-lg border text-white transition-all ${
                            isSelected
                              ? 'bg-[#023047] border-[#023047]'
                              : 'bg-secondary border-secondary hover:opacity-90'
                          }`}
                        >
                          <div className="flex items-center gap-3 py-3 px-3">
                            <div className="flex-shrink-0 relative">
                              {conv.type === 'group' ? (
                                <div className="w-11 h-11 rounded-lg bg-white/15 flex items-center justify-center">
                                  <Users className="h-6 w-6 text-white" />
                                </div>
                              ) : conv.avatar ? (
                                <img
                                  src={conv.avatar}
                                  alt={conv.name}
                                  className="w-11 h-11 rounded-lg object-cover"
                                />
                              ) : (
                                <div className="w-11 h-11 rounded-lg bg-white/15 flex items-center justify-center overflow-hidden">
                                  <span className="text-sm font-bold text-white leading-none">
                                    {getInitials(conv.name)}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-sm truncate text-white">
                                  {conv.name}
                                </h3>
                                {isUnread && !isSelected && (
                                  <span className="ml-auto h-2 w-2 flex-shrink-0 rounded-full bg-white" />
                                )}
                              </div>

                              <p className="text-xs mt-0.5 truncate text-white/80">
                                {conv.type === 'group' && memberCount
                                  ? `${memberCount} membri · ${
                                      conv.lastMessage || 'Inizia una conversazione'
                                    }`
                                  : conv.lastMessage || 'Inizia una conversazione'}
                              </p>
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Main Chat Area */}
          <div className={`flex-1 flex flex-col ${selectedConversation ? 'flex' : 'hidden'}`}>
            {selectedConversation && (
              <>
                <div className="h-16 px-6 border-b border-black/10 bg-gray-50 flex items-center gap-3">
                  {selectedConversation.type === 'group' ? (
                    <div className="w-11 h-11 rounded-lg bg-secondary flex items-center justify-center">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                  ) : selectedConversation.avatar ? (
                    <img
                      src={selectedConversation.avatar}
                      alt={selectedConversation.name}
                      className="w-11 h-11 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-lg bg-secondary flex items-center justify-center overflow-hidden">
                      <span className="text-sm font-bold text-white leading-none">
                        {getInitials(selectedConversation.name)}
                      </span>
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-secondary truncate">
                      {selectedConversation.name}
                    </h2>
                  </div>

                  {selectedConversation.type === 'group' && (
                    <button
                      type="button"
                      onClick={() => setSettingsOpen(true)}
                      className="inline-flex items-center justify-center p-2.5 rounded-lg hover:bg-secondary/10 text-secondary touch-manipulation min-w-[40px] min-h-[40px]"
                      aria-label="Impostazioni gruppo"
                      title="Impostazioni gruppo"
                    >
                      <Settings className="h-5 w-5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    className="inline-flex items-center justify-center p-2.5 rounded-lg hover:bg-secondary/10 text-secondary touch-manipulation min-w-[40px] min-h-[40px]"
                    aria-label="Chiudi conversazione"
                    title="Chiudi"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div ref={messagesRef} className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4">
                  {!selectedConversation.messagesLoaded ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500 text-sm">Caricamento...</p>
                    </div>
                  ) : selectedConversation.messages.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500 text-sm">
                        Nessun messaggio. Inizia la conversazione!
                      </p>
                    </div>
                  ) : (
                    selectedConversation.messages.map((msg) => {
                      const isOwn = msg.sender_id === me?.id;
                      const showSender = !isOwn && selectedConversation.type === 'group';
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                        >
                          {showSender && (
                            <div className="flex-shrink-0 mr-2">
                              {msg.sender?.avatar_url ? (
                                <img
                                  src={msg.sender.avatar_url}
                                  alt={msg.sender.full_name}
                                  className="w-8 h-8 rounded-lg object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center overflow-hidden">
                                  <span className="text-xs font-bold text-white leading-none">
                                    {getInitials(msg.sender?.full_name || 'Utente')}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                          <div className={`max-w-[70%] ${isOwn ? 'text-right' : 'text-left'}`}>
                            {showSender && (
                              <p className="text-xs text-gray-600 mb-1 px-1">
                                {msg.sender?.full_name || 'Utente'}
                              </p>
                            )}
                            <div
                              className={`inline-block rounded-2xl px-4 py-2 text-left ${
                                isOwn
                                  ? 'bg-secondary text-white rounded-br-sm'
                                  : 'bg-white border border-black/10 rounded-bl-sm'
                              }`}
                              style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                            >
                              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            </div>
                            <p
                              className={`text-xs text-gray-500 mt-1 px-1 ${
                                isOwn ? 'text-right' : 'text-left'
                              }`}
                            >
                              {formatDistanceToNow(new Date(msg.created_at), {
                                addSuffix: true,
                                locale: it,
                              })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="p-4 bg-white border-t border-black/10">
                  <div className="flex items-center gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={messageInput}
                      maxLength={MAX_MESSAGE_LENGTH}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Scrivi un messaggio..."
                      className="h-11 flex-1 px-4 border border-gray-300 bg-white rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0 focus:border-black/10"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!messageInput.trim() || sending}
                      aria-label="Invia"
                      className="inline-flex h-11 w-11 items-center justify-center bg-secondary text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Impostazioni gruppo */}
      {settingsOpen && selectedConversation?.group && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSettingsOpen(false);
          }}
        >
          <div className="relative w-full max-w-md max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 bg-secondary rounded-t-xl">
              <div className="flex items-center gap-3 min-w-0">
                <Users className="h-6 w-6 text-white flex-shrink-0" />
                <h3 className="text-lg font-bold text-white truncate">
                  {selectedConversation.name}
                </h3>
              </div>
              <button
                onClick={() => setSettingsOpen(false)}
                className="rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                aria-label="Chiudi"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 bg-gray-50 overflow-y-auto space-y-4">
              {selectedConversation.group.description && (
                <p className="text-sm text-secondary">{selectedConversation.group.description}</p>
              )}

              <div>
                <h4 className="text-xs font-semibold text-secondary/60 uppercase tracking-wider mb-2">
                  {selectedConversation.group.members.length} membri
                </h4>
                <ul className="space-y-2">
                  {selectedConversation.group.members.map((member) => (
                    <li
                      key={member.id}
                      className="flex items-center gap-3 rounded-lg bg-white border border-black/10 p-2.5"
                    >
                      <div className="w-8 h-8 flex-shrink-0 rounded-lg bg-secondary flex items-center justify-center overflow-hidden">
                        {member.user?.avatar_url ? (
                          <img
                            src={member.user.avatar_url}
                            alt={member.user.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-bold text-white leading-none">
                            {getInitials(member.user?.full_name || 'Utente')}
                          </span>
                        )}
                      </div>
                      <span className="flex-1 min-w-0 truncate text-sm text-secondary">
                        {member.user?.full_name || 'Utente'}
                        {member.user_id === me?.id && ' (tu)'}
                      </span>
                      {member.role === 'admin' && (
                        <span className="text-xs font-semibold text-secondary/60">Admin</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="border-t border-gray-200 p-6 flex-shrink-0 bg-white">
              <button
                onClick={leaveGroup}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-secondary px-6 py-3 text-sm font-semibold text-secondary hover:bg-secondary/10 transition-all"
              >
                <LogOut className="h-5 w-5" />
                Abbandona gruppo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
