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

export default function AtletaMailPage() {
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
        .channel("new_messages")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "internal_messages",
            filter: `recipient_id=eq.${user.id}`,
          },
          () => {
            // Reload conversations when new message arrives
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
      
      // Group messages by conversation partner
      const conversationMap = new Map<string, Message[]>();
      
      allMessages.forEach((msg) => {
        const partnerId = msg.sender_id === user.id ? msg.recipient_id : msg.sender_id;
        if (!conversationMap.has(partnerId)) {
          conversationMap.set(partnerId, []);
        }
        conversationMap.get(partnerId)!.push(msg);
      });

      // Create conversation objects
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

      // Sort by last message time
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

      console.log("Search results:", data);
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
        // Create notification for recipient
        const { data: senderProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();

        await createNotification({
          userId: selectedConversation.userId,
          type: "message",
          title: `Nuovo messaggio da ${senderProfile?.full_name || "un utente"}`,
          message: messageContent.substring(0, 100) + (messageContent.length > 100 ? "..." : ""),
          link: "/dashboard/maestro/mail",
        });

        // Update immediately with optimistic UI
        const updatedConversation = {
          ...selectedConversation,
          messages: [...selectedConversation.messages, data],
          lastMessage: data.content,
          lastMessageTime: data.created_at,
        };
        setSelectedConversation(updatedConversation);
        
        // Update conversations list
        setConversations((prev) => {
          const filtered = prev.filter((c) => c.userId !== selectedConversation.userId);
          return [updatedConversation, ...filtered];
        });
        
        window.dispatchEvent(new Event('messageRead'));
      } else {
        console.error("Error sending message:", error);
        setMessageInput(messageContent); // Restore message on error
      }
    } catch (error) {
      console.error("Errore:", error);
    } finally {
      setSending(false);
    }
  }

  async function startNewChat(user: UserProfile) {
    // Check if conversation already exists
    const existingConv = conversations.find((c) => c.userId === user.id);
    if (existingConv) {
      setSelectedConversation(existingConv);
      setShowNewChat(false);
      return;
    }

    // Create new empty conversation
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

    if (unreadMessages.length > 0) {
      const messageIds = unreadMessages.map(m => m.id);
      
      await supabase
        .from("internal_messages")
        .update({ is_read: true })
        .in("id", messageIds);

      window.dispatchEvent(new Event('messageRead'));
    }
  }

  function handleSelectConversation(conversation: Conversation) {
    setSelectedConversation(conversation);
    markMessagesAsRead(conversation);
  }

  const filteredConversations = conversations.filter((c) =>
    c.userName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-secondary/20 border-t-secondary"></div>
          <p className="mt-4 text-secondary/70">Caricamento chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-secondary">Chat</h1>
          <p className="text-sm text-secondary/70 mt-1">Messaggi con altri utenti</p>
        </div>
        <button
          onClick={() => setShowNewChat(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-secondary rounded-md hover:opacity-90 transition-all"
        >
          Nuova Chat
        </button>
      </div>

      {/* Chat Interface */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden" style={{ height: "calc(100vh - 250px)" }}>
        <div className="grid grid-cols-1 lg:grid-cols-3 h-full">
          {/* Conversations List */}
          <div className="border-r border-gray-200 flex flex-col h-full lg:col-span-1">
            {/* Search Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-secondary/40" />
                <input
                  type="text"
                  placeholder="Cerca conversazioni..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary text-sm"
                />
              </div>
            </div>

            {/* Conversations */}
            <div className="flex-1 overflow-y-auto">
              {filteredConversations.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <Mail className="h-12 w-12 text-secondary/20 mx-auto mb-3" />
                  <p className="text-sm text-secondary/70">Nessuna conversazione</p>
                </div>
              ) : (
                <div>
                  {filteredConversations.map((conv) => (
                    <button
                      key={conv.userId}
                      onClick={() => handleSelectConversation(conv)}
                      className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-all border-b border-gray-100 ${
                        selectedConversation?.userId === conv.userId ? "bg-secondary/5" : ""
                      }`}
                    >
                      {conv.userAvatar ? (
                        <img
                          src={conv.userAvatar}
                          alt={conv.userName}
                          className="h-12 w-12 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0">
                          <User className="h-6 w-6 text-secondary" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-semibold text-secondary truncate">
                            {conv.userName}
                          </p>
                          <span className="text-xs text-secondary/60 flex-shrink-0 ml-2">
                            {formatDistanceToNow(new Date(conv.lastMessageTime), {
                              addSuffix: false,
                              locale: it,
                            })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-secondary/70 truncate">
                            {conv.lastMessage || "Inizia una conversazione"}
                          </p>
                          {conv.unreadCount > 0 && (
                            <span className="flex-shrink-0 ml-2 bg-secondary text-white text-xs px-2 py-0.5 rounded-full">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-2 flex flex-col h-full">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedConversation(null)}
                      className="lg:hidden p-2 hover:bg-gray-200 rounded-full"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    {selectedConversation.userAvatar ? (
                      <img
                        src={selectedConversation.userAvatar}
                        alt={selectedConversation.userName}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-secondary" />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-secondary">{selectedConversation.userName}</p>
                      <p className="text-xs text-secondary/60">Online</p>
                    </div>
                  </div>
                  <button className="p-2 hover:bg-gray-200 rounded-full">
                    <MoreVertical className="h-5 w-5 text-secondary/70" />
                  </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
                  {selectedConversation.messages.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-sm text-secondary/70">Nessun messaggio ancora</p>
                      <p className="text-xs text-secondary/50 mt-1">Invia un messaggio per iniziare</p>
                    </div>
                  ) : (
                    selectedConversation.messages.map((msg) => {
                      const isOwn = msg.sender_id === currentUserId;
                      return (
                        <div
                          key={msg.id}
                          className={`flex items-end gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}
                        >
                          {!isOwn && (
                            selectedConversation.userAvatar ? (
                              <img
                                src={selectedConversation.userAvatar}
                                alt={selectedConversation.userName}
                                className="h-8 w-8 rounded-full object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0">
                                <User className="h-4 w-4 text-secondary" />
                              </div>
                            )
                          )}
                          <div className={`max-w-[70%] ${isOwn ? "items-end" : "items-start"} flex flex-col`}>
                            <div
                              className={`px-4 py-2 rounded-2xl ${
                                isOwn
                                  ? "bg-secondary text-white rounded-br-sm"
                                  : "bg-white text-secondary border border-gray-200 rounded-bl-sm"
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                            </div>
                            <span className="text-xs text-secondary/50 mt-1 px-2">
                              {new Date(msg.created_at).toLocaleTimeString("it-IT", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-gray-200 bg-white">
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      placeholder="Scrivi un messaggio..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={sending || !messageInput.trim()}
                      className="p-3 bg-secondary text-white rounded-full hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-white">
                <div className="text-center">
                  <Mail className="h-16 w-16 text-secondary/20 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-secondary mb-2">Seleziona una chat</h3>
                  <p className="text-sm text-secondary/70">
                    Scegli una conversazione dalla lista o iniziane una nuova
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-secondary">Nuova Chat</h3>
              <button
                onClick={() => {
                  setShowNewChat(false);
                  setUserSearch("");
                }}
                className="p-2 hover:bg-gray-100 rounded-md"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-secondary/40" />
                <input
                  type="text"
                  placeholder="Cerca utente..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  autoFocus
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
                />
              </div>

              <div className="max-h-96 overflow-y-auto">
                {searchResults.length === 0 ? (
                  <p className="text-center text-sm text-secondary/70 py-8">
                    {userSearch ? "Nessun utente trovato" : "Inizia a digitare per cercare"}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {searchResults.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => startNewChat(user)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-secondary/5 rounded-md transition-all"
                      >
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={user.full_name}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-secondary" />
                          </div>
                        )}
                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium text-secondary">{user.full_name}</p>
                          <p className="text-xs text-secondary/60">{user.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
