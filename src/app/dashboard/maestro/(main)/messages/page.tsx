"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { MessageSquare, Loader2, Search, Send, User } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

type Conversation = {
  id: string;
  other_user_id: string;
  other_user_name: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
};

export default function CoachMessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadConversations();
  }, []);

  async function loadConversations() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: messages } = await supabase
        .from("chat_messages")
        .select("*, sender:sender_id(full_name), receiver:receiver_id(full_name)")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (!messages) {
        setConversations([]);
        return;
      }

      const conversationMap = new Map<string, Conversation>();
      
      messages.forEach((msg: any) => {
        const otherUserId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        const otherUserName = msg.sender_id === user.id 
          ? msg.receiver?.full_name || "Utente"
          : msg.sender?.full_name || "Utente";
        
        if (!conversationMap.has(otherUserId)) {
          conversationMap.set(otherUserId, {
            id: otherUserId,
            other_user_id: otherUserId,
            other_user_name: otherUserName,
            last_message: msg.content,
            last_message_at: msg.created_at,
            unread_count: !msg.is_read && msg.receiver_id === user.id ? 1 : 0,
          });
        } else {
          const conv = conversationMap.get(otherUserId)!;
          if (!msg.is_read && msg.receiver_id === user.id) {
            conv.unread_count++;
          }
        }
      });

      setConversations(Array.from(conversationMap.values()));
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setLoading(false);
    }
  }

  const filteredConversations = conversations.filter(c =>
    !search || c.other_user_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Messaggi</h1>
        <p className="text-white/50">Comunica con i tuoi allievi e lo staff</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
        <input
          type="text"
          placeholder="Cerca conversazione..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50"
        />
      </div>

      {/* Conversations List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-cyan-400" />
          <p className="mt-4 text-white/50">Caricamento conversazioni...</p>
        </div>
      ) : filteredConversations.length === 0 ? (
        <div className="text-center py-20 rounded-2xl border border-white/10 bg-white/5">
          <MessageSquare className="h-16 w-16 text-white/20 mx-auto mb-4" />
          <p className="text-white/50 mb-2">Nessuna conversazione</p>
          <p className="text-sm text-white/30">Le conversazioni con i tuoi allievi appariranno qui</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredConversations.map((conv) => (
            <div
              key={conv.id}
              className="group flex items-center gap-4 p-5 rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl hover:border-cyan-500/30 hover:bg-white/10 transition-all cursor-pointer"
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500/20 to-teal-500/20 flex items-center justify-center text-white font-bold text-lg">
                {conv.other_user_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-white group-hover:text-cyan-300 transition-colors truncate">
                    {conv.other_user_name}
                  </h3>
                  <span className="text-xs text-white/40">
                    {format(new Date(conv.last_message_at), "dd MMM HH:mm", { locale: it })}
                  </span>
                </div>
                <p className="text-sm text-white/50 truncate">{conv.last_message}</p>
              </div>
              {conv.unread_count > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-gradient-to-r from-cyan-500 to-teal-500 text-xs font-bold text-white">
                  {conv.unread_count}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
