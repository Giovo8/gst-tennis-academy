"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import { MessageCircle, Loader2, Send, Search, User } from "lucide-react";

type Message = {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
  is_read: boolean;
};

type Conversation = {
  user_id: string;
  full_name: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
};

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (selectedUser && currentUserId) {
      loadMessages(selectedUser);
    }
  }, [selectedUser, currentUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
      loadConversations(user.id);
    }
  }

  async function loadConversations(userId: string) {
    try {
      // Load all profiles for conversations
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .neq("id", userId)
        .limit(50);

      if (!error && profiles) {
        const convos: Conversation[] = profiles.map((p) => ({
          user_id: p.id,
          full_name: p.full_name || "Utente",
          last_message: "",
          last_message_time: "",
          unread_count: 0,
        }));
        setConversations(convos);
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages(userId: string) {
    if (!currentUserId) return;
    
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${currentUserId})`)
        .order("created_at", { ascending: true });

      if (!error && data) {
        setMessages(data);
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  }

  async function sendMessage() {
    if (!newMessage.trim() || !selectedUser || !currentUserId) return;

    setSending(true);
    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          content: newMessage,
          sender_id: currentUserId,
          receiver_id: selectedUser,
        })
        .select()
        .single();

      if (!error && data) {
        setMessages((prev) => [...prev, data]);
        setNewMessage("");
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  }

  const filteredConversations = conversations.filter((c) =>
    c.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedConvo = conversations.find((c) => c.user_id === selectedUser);

  return (
    <div className="min-h-screen bg-[#021627] p-6">
      <div className="mb-6">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-cyan-200 to-white bg-clip-text text-transparent mb-2">
          Chat
        </h1>
        <p className="text-white/50">Messaggia con gli utenti del circolo</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Conversations List */}
        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-white/10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
              <input
                type="text"
                placeholder="Cerca utente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-10">
                <MessageCircle className="w-12 h-12 mx-auto text-white/20 mb-3" />
                <p className="text-white/50">Nessun utente trovato</p>
              </div>
            ) : (
              filteredConversations.map((convo) => (
                <button
                  key={convo.user_id}
                  onClick={() => setSelectedUser(convo.user_id)}
                  className={`w-full p-4 text-left border-b border-white/5 transition-all hover:bg-white/5 ${
                    selectedUser === convo.user_id ? "bg-cyan-500/10 border-l-2 border-l-cyan-500" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center text-white font-bold">
                      {convo.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-medium truncate">{convo.full_name}</h4>
                      {convo.last_message && (
                        <p className="text-sm text-white/50 truncate">{convo.last_message}</p>
                      )}
                    </div>
                    {convo.unread_count > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-cyan-500 text-white text-xs font-bold">
                        {convo.unread_count}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="lg:col-span-2 rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden flex flex-col">
          {selectedUser ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-white/10 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center text-white font-bold">
                  {selectedConvo?.full_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-white font-semibold">{selectedConvo?.full_name}</h3>
                  <p className="text-xs text-white/50">Online</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => {
                  const isOwn = msg.sender_id === currentUserId;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] px-4 py-2.5 rounded-2xl ${
                          isOwn
                            ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-br-md"
                            : "bg-white/10 text-white rounded-bl-md"
                        }`}
                      >
                        <p>{msg.content}</p>
                        <p className={`text-xs mt-1 ${isOwn ? "text-white/70" : "text-white/40"}`}>
                          {new Date(msg.created_at).toLocaleTimeString("it-IT", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-white/10">
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Scrivi un messaggio..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                    className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={sending || !newMessage.trim()}
                    className="px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold hover:shadow-lg hover:shadow-cyan-500/20 transition-all disabled:opacity-50"
                  >
                    {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center">
              <MessageCircle className="w-20 h-20 text-white/10 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Seleziona una conversazione</h3>
              <p className="text-white/50">Scegli un utente dalla lista per iniziare a chattare</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
