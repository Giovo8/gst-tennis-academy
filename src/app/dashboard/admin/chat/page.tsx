"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { createNotification } from "@/lib/notifications/createNotification";
import {
  Mail,
  Search,
  X,
  User,
  Send,
  ArrowLeft,
  MoreVertical,
  Plus,
  Users,
  Check,
  Settings,
  LogOut
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string | null;
  group_id: string | null;
  subject: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  recipient?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
}

interface ChatGroup {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  created_by: string;
  created_at: string;
  members?: GroupMember[];
}

interface GroupMember {
  id: string;
  user_id: string;
  role: "admin" | "member";
  profile: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

interface Conversation {
  id: string;
  type: "direct" | "group";
  name: string;
  avatar: string | null;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: Message[];
  // For direct chats
  userId?: string;
  // For group chats
  groupId?: string;
  group?: ChatGroup;
  memberCount?: number;
}

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: string;
}

type ModalType = "newChat" | "newGroup" | "groupSettings" | null;

export default function AdminChatPage() {
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageInput, setMessageInput] = useState("");

  // New chat/group state
  const [userSearch, setUserSearch] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [sending, setSending] = useState(false);

  // New group state
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<UserProfile[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);

  useEffect(() => {
    loadConversations();
    subscribeToNewMessages();
  }, []);

  function subscribeToNewMessages() {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;

      const channel = supabase
        .channel("new_messages_admin")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "internal_messages",
          },
          () => {
            loadConversations();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    });
  }

  useEffect(() => {
    if (userSearch.length > 1) {
      searchUsers();
    } else {
      setSearchResults([]);
    }
  }, [userSearch]);

  async function loadConversations() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUserId(user.id);

      // Load direct messages - try without group_id filter first (backwards compatibility)
      let directMessages: any[] = [];
      let directError: any = null;

      // First try with group_id filter (new schema)
      const result = await supabase
        .from("internal_messages")
        .select(`
          *,
          sender:sender_id(id, full_name, avatar_url),
          recipient:recipient_id(id, full_name, avatar_url)
        `)
        .is("group_id", null)
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (result.error && result.error.message.includes("group_id")) {
        // Fallback: group_id column doesn't exist yet, load all messages
        const fallbackResult = await supabase
          .from("internal_messages")
          .select(`
            *,
            sender:sender_id(id, full_name, avatar_url),
            recipient:recipient_id(id, full_name, avatar_url)
          `)
          .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
          .order("created_at", { ascending: false });

        directMessages = fallbackResult.data || [];
        directError = fallbackResult.error;
      } else {
        directMessages = result.data || [];
        directError = result.error;
      }

      if (directError?.message && directError.message.length > 0) {
        console.error("Error loading direct messages:", directError.message);
      }

      // Load groups via API
      let userGroups: any[] = [];

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          const res = await fetch('/api/chat-groups', {
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          });
          if (res.ok) {
            userGroups = await res.json();
          }
        }
      } catch (e) {
        // API not available yet, ignore
        console.log("Chat groups API not available yet");
      }

      // Process direct conversations
      const conversationMap = new Map<string, Message[]>();

      (directMessages || []).forEach((msg) => {
        if (!msg.recipient_id) return;
        const partnerId = msg.sender_id === user.id ? msg.recipient_id : msg.sender_id;
        if (!conversationMap.has(partnerId)) {
          conversationMap.set(partnerId, []);
        }
        conversationMap.get(partnerId)!.push(msg);
      });

      const directConvs: Conversation[] = [];
      conversationMap.forEach((messages, partnerId) => {
        const sortedMessages = messages.sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        const lastMessage = sortedMessages[sortedMessages.length - 1];
        const partner = lastMessage.sender_id === user.id ? lastMessage.recipient : lastMessage.sender;
        const unreadCount = messages.filter(
          (m) => m.recipient_id === user.id && !m.is_read
        ).length;

        directConvs.push({
          id: `direct-${partnerId}`,
          type: "direct",
          userId: partnerId,
          name: partner?.full_name || "Utente",
          avatar: partner?.avatar_url || null,
          lastMessage: lastMessage.content,
          lastMessageTime: lastMessage.created_at,
          unreadCount,
          messages: sortedMessages,
        });
      });

      // Process group conversations
      const groupConvs: Conversation[] = [];

      for (const group of (userGroups || [])) {
        if (!group) continue;

        // Get group messages via API
        let groupMessages: Message[] = [];
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            const res = await fetch(`/api/chat-groups/${group.id}/messages`, {
              headers: {
                'Authorization': `Bearer ${session.access_token}`
              }
            });
            if (res.ok) {
              groupMessages = await res.json();
            }
          }
        } catch (e) {
          console.log("Could not load group messages");
        }

        const messages = groupMessages || [];
        const lastMessage = messages[messages.length - 1];
        const memberCount = group.members?.length || 0;

        groupConvs.push({
          id: `group-${group.id}`,
          type: "group",
          groupId: group.id,
          group: group as ChatGroup,
          name: group.name,
          avatar: group.avatar_url,
          lastMessage: lastMessage?.content || "Nessun messaggio",
          lastMessageTime: lastMessage?.created_at || group.created_at,
          unreadCount: 0,
          messages,
          memberCount,
        });
      }

      // Combine and sort all conversations
      const allConvs = [...directConvs, ...groupConvs].sort(
        (a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
      );

      setConversations(allConvs);
    } catch (error) {
      console.error("Errore nel caricamento delle conversazioni:", error);
    } finally {
      setLoading(false);
    }
  }

  async function searchUsers() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url, role")
        .neq("id", user.id)
        .or(`full_name.ilike.%${userSearch}%,email.ilike.%${userSearch}%`)
        .limit(10);

      if (error) {
        console.error("Search error:", error);
        return;
      }

      setSearchResults(data || []);
    } catch (error) {
      console.error("Errore nella ricerca utenti:", error);
    }
  }

  async function handleSendMessage() {
    if (!messageInput.trim() || !selectedConversation) return;

    setSending(true);
    const messageContent = messageInput.trim();
    setMessageInput("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: { session } } = await supabase.auth.getSession();
      if (!user || !session?.access_token) return;

      let data: any = null;
      let error: any = null;

      if (selectedConversation.type === "group" && selectedConversation.groupId) {
        // Send group message via API
        const res = await fetch(`/api/chat-groups/${selectedConversation.groupId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ content: messageContent })
        });

        if (res.ok) {
          data = await res.json();
        } else {
          const errorData = await res.json();
          error = errorData;
        }
      } else {
        // Send direct message via supabase
        const insertData = {
          sender_id: user.id,
          recipient_id: selectedConversation.userId,
          subject: "Chat",
          content: messageContent,
        };

        const result = await supabase
          .from("internal_messages")
          .insert(insertData)
          .select(`
            *,
            sender:sender_id(id, full_name, avatar_url),
            recipient:recipient_id(id, full_name, avatar_url)
          `)
          .single();

        data = result.data;
        error = result.error;

        // Debug: log the full result if insert seems to fail silently
        if (!data && !error?.message) {
          console.log("Insert result (debug):", JSON.stringify(result, null, 2));
        }

        // Send notification for direct messages
        if (!error && data && selectedConversation.userId) {
          const { data: senderProfile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", user.id)
            .single();

          await createNotification({
            userId: selectedConversation.userId,
            type: "message",
            title: `Nuovo messaggio da ${senderProfile?.full_name || "Admin"}`,
            message: messageContent.substring(0, 100) + (messageContent.length > 100 ? "..." : ""),
            link: "/dashboard/atleta/mail",
          });
        }
      }

      if (data) {
        const updatedConversation = {
          ...selectedConversation,
          messages: [...selectedConversation.messages, data],
          lastMessage: data.content,
          lastMessageTime: data.created_at,
        };
        setSelectedConversation(updatedConversation);

        setConversations((prev) => {
          const filtered = prev.filter((c) => c.id !== selectedConversation.id);
          return [updatedConversation, ...filtered];
        });

        window.dispatchEvent(new Event('messageRead'));
      } else {
        // Only log if there's a real error message
        const errorMsg = error?.message || error?.error;
        if (errorMsg) {
          console.error("Error sending message:", errorMsg);
        }
        setMessageInput(messageContent);
      }
    } catch (error) {
      console.error("Errore:", error);
      setMessageInput(messageContent);
    } finally {
      setSending(false);
    }
  }

  async function startNewChat(userProfile: UserProfile) {
    const existingConv = conversations.find(
      (c) => c.type === "direct" && c.userId === userProfile.id
    );
    if (existingConv) {
      setSelectedConversation(existingConv);
      closeModal();
      return;
    }

    const newConv: Conversation = {
      id: `direct-${userProfile.id}`,
      type: "direct",
      userId: userProfile.id,
      name: userProfile.full_name,
      avatar: userProfile.avatar_url,
      lastMessage: "",
      lastMessageTime: new Date().toISOString(),
      unreadCount: 0,
      messages: [],
    };

    setSelectedConversation(newConv);
    closeModal();
  }

  async function createGroup() {
    if (!groupName.trim() || selectedMembers.length === 0) return;

    setCreatingGroup(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        alert("Sessione non valida");
        return;
      }

      // Create the group via API
      const res = await fetch('/api/chat-groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          name: groupName.trim(),
          description: groupDescription.trim() || null,
          member_ids: selectedMembers.map(m => m.id)
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error("Error creating group:", errorData);
        if (errorData.error?.includes("does not exist")) {
          alert("La funzionalità gruppi non è ancora disponibile. Esegui la migration del database.");
        } else {
          alert(errorData.error || "Errore nella creazione del gruppo");
        }
        return;
      }

      const group = await res.json();

      // Reload conversations and select the new group
      await loadConversations();

      const newGroupConv: Conversation = {
        id: `group-${group.id}`,
        type: "group",
        groupId: group.id,
        group: group as ChatGroup,
        name: group.name,
        avatar: null,
        lastMessage: "Gruppo creato",
        lastMessageTime: group.created_at,
        unreadCount: 0,
        messages: [],
        memberCount: selectedMembers.length + 1,
      };

      setSelectedConversation(newGroupConv);
      closeModal();

      // Reset form
      setGroupName("");
      setGroupDescription("");
      setSelectedMembers([]);
    } catch (error) {
      console.error("Errore nella creazione del gruppo:", error);
      alert("Errore nella creazione del gruppo");
    } finally {
      setCreatingGroup(false);
    }
  }

  function toggleMemberSelection(userProfile: UserProfile) {
    setSelectedMembers((prev) => {
      const isSelected = prev.some((m) => m.id === userProfile.id);
      if (isSelected) {
        return prev.filter((m) => m.id !== userProfile.id);
      }
      return [...prev, userProfile];
    });
  }

  async function markMessagesAsRead(conversation: Conversation) {
    if (conversation.type !== "direct") return;

    const unreadMessages = conversation.messages.filter(
      (m) => m.recipient_id === currentUserId && !m.is_read
    );

    if (unreadMessages.length === 0) return;

    const messageIds = unreadMessages.map((m) => m.id);
    await supabase
      .from("internal_messages")
      .update({ is_read: true })
      .in("id", messageIds);

    conversation.unreadCount = 0;
    window.dispatchEvent(new Event('messageRead'));
  }

  async function selectConversation(conv: Conversation) {
    setSelectedConversation(conv);
    await markMessagesAsRead(conv);
  }

  function closeModal() {
    setActiveModal(null);
    setUserSearch("");
    setSearchResults([]);
    setGroupName("");
    setGroupDescription("");
    setSelectedMembers([]);
  }

  async function leaveGroup() {
    if (!selectedConversation?.groupId) return;

    if (!confirm("Sei sicuro di voler abbandonare questo gruppo?")) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        alert("Sessione non valida");
        return;
      }

      const res = await fetch(`/api/chat-groups/${selectedConversation.groupId}/members`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error("Error leaving group:", errorData);
        alert(errorData.error || "Errore nell'abbandonare il gruppo");
        return;
      }

      setSelectedConversation(null);
      closeModal();
      await loadConversations();
    } catch (error) {
      console.error("Errore:", error);
      alert("Errore nell'abbandonare il gruppo");
    }
  }

  const filteredConversations = conversations.filter((conv) =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-secondary mb-2">Chat</h1>
          <p className="text-secondary/70 font-medium">
            Gestisci le conversazioni con atleti e staff
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveModal("newChat")}
            className="px-4 py-2.5 text-sm font-medium text-white bg-secondary rounded-md hover:opacity-90 transition-all flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Nuova Chat
          </button>
          <button
            onClick={() => setActiveModal("newGroup")}
            className="px-4 py-2.5 text-sm font-medium text-secondary bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-all flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            Nuovo Gruppo
          </button>
        </div>
      </div>

      {/* Chat Container */}
      <div className="h-[calc(100vh-16rem)] flex flex-col bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex h-full">
          {/* Sidebar - Lista conversazioni */}
          <div className={`w-full md:w-80 border-r border-gray-200 flex flex-col ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
            {/* Search */}
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cerca conversazioni..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-secondary/20"
                />
              </div>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Caricamento...</div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center">
                  <Mail className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">Nessuna conversazione</p>
                  <button
                    onClick={() => setActiveModal("newChat")}
                    className="mt-3 text-sm text-secondary hover:underline"
                  >
                    Inizia una nuova chat
                  </button>
                </div>
              ) : (
                filteredConversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => selectConversation(conv)}
                    className={`w-full p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left ${
                      selectedConversation?.id === conv.id ? "bg-blue-50" : ""
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 relative">
                        {conv.type === "group" ? (
                          <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
                            <Users className="h-6 w-6 text-secondary" />
                          </div>
                        ) : conv.avatar ? (
                          <img
                            src={conv.avatar}
                            alt={conv.name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className="h-6 w-6 text-gray-500" />
                          </div>
                        )}
                        {conv.unreadCount > 0 && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                            {conv.unreadCount}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between mb-1">
                          <h3 className={`font-semibold text-sm truncate ${conv.unreadCount > 0 ? 'text-gray-900' : 'text-gray-700'}`}>
                            {conv.name}
                          </h3>
                          <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                            {formatDistanceToNow(new Date(conv.lastMessageTime), {
                              addSuffix: true,
                              locale: it,
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {conv.type === "group" && (
                            <span className="text-xs text-secondary/60">{conv.memberCount} membri · </span>
                          )}
                          <p className={`text-sm truncate flex-1 ${conv.unreadCount > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                            {conv.lastMessage}
                          </p>
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Main Chat Area */}
          <div className={`flex-1 flex flex-col ${selectedConversation ? 'flex' : 'hidden md:flex'}`}>
            {!selectedConversation ? (
              <div className="flex-1 flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <Mail className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Seleziona una conversazione per iniziare</p>
                </div>
              </div>
            ) : (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-200 bg-white flex items-center gap-3">
                  <button
                    onClick={() => setSelectedConversation(null)}
                    className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>

                  {selectedConversation.type === "group" ? (
                    <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-secondary" />
                    </div>
                  ) : selectedConversation.avatar ? (
                    <img
                      src={selectedConversation.avatar}
                      alt={selectedConversation.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="h-5 w-5 text-gray-500" />
                    </div>
                  )}

                  <div className="flex-1">
                    <h2 className="font-semibold text-gray-900">{selectedConversation.name}</h2>
                    {selectedConversation.type === "group" && (
                      <p className="text-xs text-gray-500">{selectedConversation.memberCount} membri</p>
                    )}
                  </div>

                  {selectedConversation.type === "group" && (
                    <button
                      onClick={() => setActiveModal("groupSettings")}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <Settings className="h-5 w-5 text-gray-600" />
                    </button>
                  )}

                  <button className="p-2 hover:bg-gray-100 rounded-lg">
                    <MoreVertical className="h-5 w-5 text-gray-600" />
                  </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4">
                  {selectedConversation.messages.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500 text-sm">Nessun messaggio. Inizia la conversazione!</p>
                    </div>
                  ) : (
                    selectedConversation.messages.map((msg) => {
                      const isOwn = msg.sender_id === currentUserId;
                      return (
                        <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                          {!isOwn && selectedConversation.type === "group" && (
                            <div className="flex-shrink-0 mr-2">
                              {msg.sender?.avatar_url ? (
                                <img
                                  src={msg.sender.avatar_url}
                                  alt={msg.sender.full_name}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                  <User className="h-4 w-4 text-gray-500" />
                                </div>
                              )}
                            </div>
                          )}
                          <div className={`max-w-[70%] ${isOwn ? "text-right" : "text-left"}`}>
                            {!isOwn && selectedConversation.type === "group" && (
                              <p className="text-xs text-gray-600 mb-1 px-1">{msg.sender?.full_name}</p>
                            )}
                            <div
                              className={`inline-block rounded-2xl px-4 py-2 text-left ${
                                isOwn
                                  ? "bg-secondary text-white rounded-br-sm"
                                  : "bg-white border border-gray-200 rounded-bl-sm"
                              }`}
                              style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
                            >
                              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            </div>
                            <p className={`text-xs text-gray-500 mt-1 px-1 ${isOwn ? 'text-right' : 'text-left'}`}>
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

                {/* Message Input */}
                <div className="p-4 bg-white border-t border-gray-200">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Scrivi un messaggio..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-secondary/20"
                      disabled={sending}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!messageInput.trim() || sending}
                      className="p-3 bg-secondary text-white rounded-full hover:bg-secondary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* New Chat Modal */}
      {activeModal === "newChat" && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 bg-secondary rounded-t-xl">
              <div className="flex items-center gap-3">
                <Plus className="h-6 w-6 text-white" />
                <h3 className="text-lg font-bold text-white">Nuova Chat</h3>
              </div>
              <button
                onClick={closeModal}
                className="rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search */}
            <div className="p-6 border-b border-gray-200 bg-gray-50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
                <input
                  type="text"
                  placeholder="Cerca per nome o email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white pl-10 pr-4 py-3 text-secondary placeholder:text-secondary/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                />
              </div>
            </div>

            {/* User List */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              {searchResults.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-secondary/60">
                    {userSearch.length > 1
                      ? "Nessun utente trovato"
                      : "Cerca un utente per iniziare"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => startNewChat(user)}
                      className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 cursor-pointer transition-all hover:border-secondary/50 hover:shadow-sm"
                    >
                      <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-secondary text-white flex items-center justify-center text-sm font-bold overflow-hidden">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={user.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span>{user.full_name.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-secondary text-sm truncate">{user.full_name}</p>
                        </div>
                        <div className="flex-shrink-0 hidden sm:block max-w-[200px]">
                          <p className="text-xs text-secondary/70 truncate">{user.email}</p>
                        </div>
                        <span className="flex-shrink-0 rounded-full bg-secondary/10 px-2.5 py-1 text-xs text-secondary font-medium capitalize">
                          {user.role}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Group Modal */}
      {activeModal === "newGroup" && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 bg-secondary rounded-t-xl">
              <div className="flex items-center gap-3">
                <Users className="h-6 w-6 text-white" />
                <h3 className="text-lg font-bold text-white">Nuovo Gruppo</h3>
              </div>
              <button
                onClick={closeModal}
                className="rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Group Info */}
            <div className="p-6 border-b border-gray-200 bg-white space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Nome del gruppo *
                </label>
                <input
                  type="text"
                  placeholder="Es. Team Agonisti"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-secondary placeholder:text-secondary/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Descrizione (opzionale)
                </label>
                <input
                  type="text"
                  placeholder="Breve descrizione del gruppo"
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-secondary placeholder:text-secondary/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                />
              </div>
            </div>

            {/* Search Members */}
            <div className="p-6 border-b border-gray-200 bg-gray-50">
              <label className="block text-sm font-medium text-secondary mb-2">
                Aggiungi membri ({selectedMembers.length} selezionati)
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
                <input
                  type="text"
                  placeholder="Cerca per nome o email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white pl-10 pr-4 py-3 text-secondary placeholder:text-secondary/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                />
              </div>

              {/* Selected members chips */}
              {selectedMembers.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {selectedMembers.map((member) => (
                    <span
                      key={member.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-white rounded-full text-xs font-medium"
                    >
                      {member.full_name}
                      <button
                        onClick={() => toggleMemberSelection(member)}
                        className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* User List */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50 max-h-60">
              {searchResults.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-secondary/60">
                    {userSearch.length > 1
                      ? "Nessun utente trovato"
                      : "Cerca utenti da aggiungere"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((user) => {
                    const isSelected = selectedMembers.some((m) => m.id === user.id);
                    return (
                      <div
                        key={user.id}
                        onClick={() => toggleMemberSelection(user)}
                        className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-secondary bg-secondary/5 shadow-sm'
                            : 'border-gray-200 bg-white hover:border-secondary/50 hover:shadow-sm'
                        }`}
                      >
                        <div className={`w-5 h-5 flex-shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'border-secondary bg-secondary'
                            : 'border-gray-300'
                        }`}>
                          {isSelected && <Check className="h-3 w-3 text-white" />}
                        </div>

                        <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-secondary text-white flex items-center justify-center text-sm font-bold overflow-hidden">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt={user.full_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>{user.full_name.charAt(0).toUpperCase()}</span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0 flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-secondary text-sm truncate">{user.full_name}</p>
                          </div>
                          <div className="flex-shrink-0 hidden sm:block max-w-[200px]">
                            <p className="text-xs text-secondary/70 truncate">{user.email}</p>
                          </div>
                          <span className="flex-shrink-0 rounded-full bg-secondary/10 px-2.5 py-1 text-xs text-secondary font-medium capitalize">
                            {user.role}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 p-6 flex-shrink-0 bg-white">
              <button
                onClick={createGroup}
                disabled={!groupName.trim() || selectedMembers.length === 0 || creatingGroup}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-secondary px-6 py-3 text-sm font-semibold text-white hover:opacity-90 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingGroup ? (
                  <>
                    <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creazione in corso...
                  </>
                ) : (
                  <>
                    <Users className="h-5 w-5" />
                    Crea Gruppo {selectedMembers.length > 0 && `(${selectedMembers.length} membri)`}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Group Settings Modal */}
      {activeModal === "groupSettings" && selectedConversation?.type === "group" && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="relative w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 bg-secondary rounded-t-xl">
              <div className="flex items-center gap-3">
                <Settings className="h-6 w-6 text-white" />
                <h3 className="text-lg font-bold text-white">Impostazioni Gruppo</h3>
              </div>
              <button
                onClick={closeModal}
                className="rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Group Info */}
            <div className="p-6 bg-gray-50">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-xl bg-secondary/10 flex items-center justify-center">
                  <Users className="h-8 w-8 text-secondary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-secondary">{selectedConversation.name}</h3>
                  <p className="text-sm text-secondary/70">{selectedConversation.memberCount} membri</p>
                </div>
              </div>

              {selectedConversation.group?.description && (
                <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                  <h4 className="text-xs font-semibold text-secondary/60 uppercase tracking-wider mb-2">Descrizione</h4>
                  <p className="text-sm text-secondary">{selectedConversation.group.description}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 p-6 flex-shrink-0 bg-white">
              <button
                onClick={leaveGroup}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-red-50 border border-red-200 px-6 py-3 text-sm font-semibold text-red-600 hover:bg-red-100 transition-all"
              >
                <LogOut className="h-5 w-5" />
                Abbandona Gruppo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
