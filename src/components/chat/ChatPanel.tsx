"use client";

import { useState, useEffect, useRef } from "react";
import { 
  MessageCircle, 
  Send, 
  Search, 
  MoreVertical, 
  ArrowLeft,
  Check,
  CheckCheck,
  Clock,
  X,
  Image as ImageIcon,
  Paperclip
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

interface Profile {
  id: string;
  full_name: string;
  avatar_url?: string;
  user_role?: string;
}

interface Message {
  id: string;
  content: string;
  message_type: string;
  attachment_url?: string;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  sender_id: string;
  profiles: Profile;
}

interface Conversation {
  id: string;
  title?: string;
  is_group: boolean;
  last_message_at: string;
  last_message_preview?: string;
  unread_count: number;
  is_muted: boolean;
  is_archived: boolean;
  participants: Profile[];
}

export default function ChatPanel() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load current user
  useEffect(() => {
    loadCurrentUser();
  }, []);

  // Load conversations
  useEffect(() => {
    loadConversations();
  }, []);

  // Load messages when conversation selected
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation);
      markAsRead(selectedConversation);
    }
  }, [selectedConversation]);

  // Auto scroll to bottom
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Setup Realtime subscription for new messages
  useEffect(() => {
    if (!selectedConversation) return;

    const channel = supabase
      .channel(`conversation:${selectedConversation}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${selectedConversation}`,
        },
        async (payload) => {
          // Fetch full message with profile data
          const { data: newMessage } = await supabase
            .from("messages")
            .select(`
              id,
              content,
              message_type,
              attachment_url,
              is_edited,
              is_deleted,
              created_at,
              sender_id,
              profiles:sender_id (
                id,
                full_name,
                avatar_url
              )
            `)
            .eq("id", payload.new.id)
            .single();

          if (newMessage && newMessage.profiles) {
            // Transform profiles array to single profile object
            const messageWithProfile = {
              ...newMessage,
              profiles: Array.isArray(newMessage.profiles) 
                ? newMessage.profiles[0] 
                : newMessage.profiles
            };

            setMessages((prev) => {
              // Avoid duplicates
              if (prev.some((m) => m.id === messageWithProfile.id)) return prev;
              return [...prev, messageWithProfile as Message];
            });

            // Update conversation preview
            if (newMessage.sender_id !== currentUser?.id) {
              setConversations((prev) =>
                prev.map((conv) =>
                  conv.id === selectedConversation
                    ? {
                        ...conv,
                        last_message_preview: newMessage.content,
                        last_message_at: newMessage.created_at,
                        unread_count: 0, // Already marked as read since we're viewing it
                      }
                    : conv
                )
              );
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation, currentUser]);

  // Setup Realtime subscription for conversation updates
  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase
      .channel("conversations:updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "conversations",
        },
        (payload) => {
          setConversations((prev) =>
            prev.map((conv) =>
              conv.id === payload.new.id
                ? {
                    ...conv,
                    last_message_at: payload.new.last_message_at,
                    last_message_preview: payload.new.last_message_preview,
                  }
                : conv
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  async function loadCurrentUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, user_role")
          .eq("id", user.id)
          .single();
        
        if (profile) {
          setCurrentUser(profile);
        }
      }
    } catch (error) {
      console.error("Error loading current user:", error);
    }
  }

  async function loadConversations() {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch("/api/conversations", {
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages(conversationId: string) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/conversations/${conversationId}`, {
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  }

  async function sendMessage() {
    if (!messageInput.trim() || !selectedConversation || sending) return;

    try {
      setSending(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          conversation_id: selectedConversation,
          content: messageInput,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessages((prev) => [...prev, data.message]);
        setMessageInput("");
        
        // Update conversation preview
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === selectedConversation
              ? {
                  ...conv,
                  last_message_preview: messageInput,
                  last_message_at: new Date().toISOString(),
                }
              : conv
          )
        );
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  }

  async function markAsRead(conversationId: string) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await fetch(`/api/conversations/${conversationId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          last_read_at: new Date().toISOString(),
        }),
      });

      // Update local state
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId ? { ...conv, unread_count: 0 } : conv
        )
      );
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  function formatTime(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60));
      return minutes < 1 ? "Ora" : `${minutes}m fa`;
    }
    if (hours < 24) {
      return date.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
    }
    if (hours < 168) {
      const days = Math.floor(hours / 24);
      return `${days}g fa`;
    }
    return date.toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
  }

  function getConversationTitle(conversation: Conversation) {
    if (conversation.title) return conversation.title;
    if (conversation.is_group) return "Conversazione di gruppo";
    return conversation.participants[0]?.full_name || "Utente";
  }

  function getConversationAvatar(conversation: Conversation) {
    if (conversation.is_group) {
      return (
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
          <MessageCircle className="w-6 h-6" />
        </div>
      );
    }
    
    const participant = conversation.participants[0];
    if (participant?.avatar_url) {
      return (
        <img
          src={participant.avatar_url}
          alt={participant.full_name}
          className="w-12 h-12 rounded-full object-cover"
        />
      );
    }
    
    return (
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white font-semibold">
        {participant?.full_name?.charAt(0) || "?"}
      </div>
    );
  }

  const filteredConversations = conversations.filter((conv) => {
    const title = getConversationTitle(conv).toLowerCase();
    return title.includes(searchQuery.toLowerCase());
  });

  const totalUnread = conversations.reduce((sum, conv) => sum + conv.unread_count, 0);
  const currentConversation = conversations.find((c) => c.id === selectedConversation);

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden">
      {/* Conversations List */}
      <div
        className={`${
          selectedConversation ? "hidden md:flex" : "flex"
        } flex-col w-full md:w-80 border-r border-gray-200 dark:border-gray-700`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Messaggi</h2>
            {totalUnread > 0 && (
              <span className="bg-cyan-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                {totalUnread}
              </span>
            )}
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cerca conversazioni..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border-0 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 px-4">
              <MessageCircle className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-center">
                {searchQuery ? "Nessuna conversazione trovata" : "Nessun messaggio ancora"}
              </p>
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => setSelectedConversation(conversation.id)}
                className={`w-full p-4 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                  selectedConversation === conversation.id
                    ? "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500"
                    : ""
                }`}
              >
                {getConversationAvatar(conversation)}
                
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {getConversationTitle(conversation)}
                    </h3>
                    <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                      {formatTime(conversation.last_message_at)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {conversation.last_message_preview || "Nessun messaggio"}
                    </p>
                    {conversation.unread_count > 0 && (
                      <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full ml-2 flex-shrink-0">
                        {conversation.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Messages Panel */}
      {selectedConversation ? (
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedConversation(null)}
                className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              
              {currentConversation && (
                <>
                  {getConversationAvatar(currentConversation)}
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {getConversationTitle(currentConversation)}
                    </h3>
                    {!currentConversation.is_group && (
                      <p className="text-xs text-gray-500">
                        {currentConversation.participants[0]?.user_role || "Utente"}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
            
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
              <MoreVertical className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message, index) => {
              const isOwn = message.sender_id === currentUser?.id;
              const showAvatar = !isOwn && (
                index === 0 || 
                messages[index - 1]?.sender_id !== message.sender_id
              );

              return (
                <div
                  key={message.id}
                  className={`flex gap-2 ${isOwn ? "justify-end" : "justify-start"}`}
                >
                  {!isOwn && (
                    <div className="w-8 h-8 flex-shrink-0">
                      {showAvatar && (
                        message.profiles.avatar_url ? (
                          <img
                            src={message.profiles.avatar_url}
                            alt={message.profiles.full_name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-sm font-semibold">
                            {message.profiles.full_name.charAt(0)}
                          </div>
                        )
                      )}
                    </div>
                  )}

                  <div className={`max-w-[70%] ${isOwn ? "items-end" : "items-start"}`}>
                    {showAvatar && !isOwn && (
                      <p className="text-xs text-gray-500 mb-1 ml-2">
                        {message.profiles.full_name}
                      </p>
                    )}
                    
                    <div
                      className={`px-4 py-2 rounded-2xl ${
                        isOwn
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                      }`}
                    >
                      {message.is_deleted ? (
                        <p className="italic opacity-70">{message.content}</p>
                      ) : (
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                      )}
                      
                      {message.is_edited && !message.is_deleted && (
                        <span className="text-xs opacity-70 ml-2">(modificato)</span>
                      )}
                    </div>

                    <div className={`flex items-center gap-1 mt-1 px-2 ${isOwn ? "justify-end" : "justify-start"}`}>
                      <span className="text-xs text-gray-500">
                        {new Date(message.created_at).toLocaleTimeString("it-IT", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {isOwn && (
                        <CheckCheck className="w-3 h-3 text-gray-500" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-end gap-2">
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-400">
                <Paperclip className="w-5 h-5" />
              </button>
              
              <div className="flex-1 relative">
                <textarea
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Scrivi un messaggio..."
                  rows={1}
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border-0 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 max-h-32"
                />
              </div>

              <button
                onClick={sendMessage}
                disabled={!messageInput.trim() || sending}
                className="p-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                {sending ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center text-gray-500">
          <div className="text-center">
            <MessageCircle className="w-24 h-24 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Seleziona una conversazione per iniziare</p>
          </div>
        </div>
      )}
    </div>
  );
}
