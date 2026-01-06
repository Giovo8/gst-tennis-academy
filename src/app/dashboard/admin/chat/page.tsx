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
  MoreVertical
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  subject: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  recipient: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

interface Conversation {
  userId: string;
  userName: string;
  userAvatar: string | null;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: Message[];
}

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: string;
}

export default function AdminChatPage() {
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageInput, setMessageInput] = useState("");
  
  // New chat state
  const [userSearch, setUserSearch] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [sending, setSending] = useState(false);

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
            filter: `recipient_id=eq.${user.id}`,
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

      const { data: allMessages, error } = await supabase
        .from("internal_messages")
        .select(`
          *,
          sender:sender_id(id, full_name, avatar_url),
          recipient:recipient_id(id, full_name, avatar_url)
        `)
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (error || !allMessages) {
        console.error("Error loading messages:", error);
        return;
      }
      
      const conversationMap = new Map<string, Message[]>();
      
      allMessages.forEach((msg) => {
        const partnerId = msg.sender_id === user.id ? msg.recipient_id : msg.sender_id;
        if (!conversationMap.has(partnerId)) {
          conversationMap.set(partnerId, []);
        }
        conversationMap.get(partnerId)!.push(msg);
      });

      const convs: Conversation[] = [];
      conversationMap.forEach((messages, partnerId) => {
        const sortedMessages = messages.sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        const lastMessage = sortedMessages[sortedMessages.length - 1];
        const partner = lastMessage.sender_id === user.id ? lastMessage.recipient : lastMessage.sender;
        const unreadCount = messages.filter(
          (m) => m.recipient_id === user.id && !m.is_read
        ).length;

        convs.push({
          userId: partnerId,
          userName: partner.full_name,
          userAvatar: partner.avatar_url,
          lastMessage: lastMessage.content,
          lastMessageTime: lastMessage.created_at,
          unreadCount,
          messages: sortedMessages,
        });
      });

      convs.sort(
        (a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
      );

      setConversations(convs);
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
      if (!user) return;

      const { data, error } = await supabase
        .from("internal_messages")
        .insert({
          sender_id: user.id,
          recipient_id: selectedConversation.userId,
          subject: "Chat",
          content: messageContent,
        })
        .select(`
          *,
          sender:sender_id(id, full_name, avatar_url),
          recipient:recipient_id(id, full_name, avatar_url)
        `)
        .single();

      if (!error && data) {
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

        const updatedConversation = {
          ...selectedConversation,
          messages: [...selectedConversation.messages, data],
          lastMessage: data.content,
          lastMessageTime: data.created_at,
        };
        setSelectedConversation(updatedConversation);
        
        setConversations((prev) => {
          const filtered = prev.filter((c) => c.userId !== selectedConversation.userId);
          return [updatedConversation, ...filtered];
        });
        
        window.dispatchEvent(new Event('messageRead'));
      } else {
        console.error("Error sending message:", error);
        setMessageInput(messageContent);
      }
    } catch (error) {
      console.error("Errore:", error);
    } finally {
      setSending(false);
    }
  }

  async function startNewChat(user: UserProfile) {
    const existingConv = conversations.find((c) => c.userId === user.id);
    if (existingConv) {
      setSelectedConversation(existingConv);
      setShowNewChat(false);
      return;
    }

    const newConv: Conversation = {
      userId: user.id,
      userName: user.full_name,
      userAvatar: user.avatar_url,
      lastMessage: "",
      lastMessageTime: new Date().toISOString(),
      unreadCount: 0,
      messages: [],
    };

    setSelectedConversation(newConv);
    setShowNewChat(false);
  }

  async function markMessagesAsRead(conversation: Conversation) {
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

  const filteredConversations = conversations.filter((conv) =>
    conv.userName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="flex h-full">
        {/* Sidebar - Lista conversazioni */}
        <div className={`w-full md:w-80 border-r border-gray-200 flex flex-col ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Mail className="h-6 w-6 text-secondary" />
                Chat
              </h1>
              <button
                onClick={() => setShowNewChat(true)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Nuova chat"
              >
                <Send className="h-5 w-5 text-gray-600" />
              </button>
            </div>
            
            {/* Search */}
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
                  onClick={() => setShowNewChat(true)}
                  className="mt-3 text-sm text-secondary hover:underline"
                >
                  Inizia una nuova chat
                </button>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <button
                  key={conv.userId}
                  onClick={() => selectConversation(conv)}
                  className={`w-full p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left ${
                    selectedConversation?.userId === conv.userId ? "bg-blue-50" : ""
                  }`}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 relative">
                      {conv.userAvatar ? (
                        <img
                          src={conv.userAvatar}
                          alt={conv.userName}
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
                          {conv.userName}
                        </h3>
                        <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                          {formatDistanceToNow(new Date(conv.lastMessageTime), {
                            addSuffix: true,
                            locale: it,
                          })}
                        </span>
                      </div>
                      <p className={`text-sm truncate ${conv.unreadCount > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                        {conv.lastMessage}
                      </p>
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
                
                {selectedConversation.userAvatar ? (
                  <img
                    src={selectedConversation.userAvatar}
                    alt={selectedConversation.userName}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="h-5 w-5 text-gray-500" />
                  </div>
                )}
                
                <div className="flex-1">
                  <h2 className="font-semibold text-gray-900">{selectedConversation.userName}</h2>
                </div>

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
                        <div className={`max-w-[70%] ${isOwn ? "order-2" : "order-1"}`}>
                          <div
                            className={`rounded-2xl px-4 py-2 ${
                              isOwn
                                ? "bg-secondary text-white rounded-br-sm"
                                : "bg-white border border-gray-200 rounded-bl-sm"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
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

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Nuova Chat</h2>
              <button
                onClick={() => {
                  setShowNewChat(false);
                  setUserSearch("");
                  setSearchResults([]);
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cerca utenti..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-secondary/20"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {searchResults.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  {userSearch.length > 1
                    ? "Nessun utente trovato"
                    : "Cerca un utente per iniziare"}
                </p>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => startNewChat(user)}
                      className="w-full p-3 hover:bg-gray-50 rounded-lg flex items-center gap-3 text-left transition-colors"
                    >
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.full_name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <User className="h-5 w-5 text-gray-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">
                          {user.full_name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                      <span className="text-xs text-gray-400 capitalize">{user.role}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
