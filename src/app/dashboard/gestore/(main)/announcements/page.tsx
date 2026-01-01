"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Plus, Calendar, User } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { format } from "date-fns";
import { it } from "date-fns/locale";

type Announcement = {
  id: string;
  title: string;
  content: string;
  category: string;
  is_pinned: boolean;
  created_at: string;
  author: {
    full_name: string;
  } | null;
};

export default function GestoreAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  async function loadAnnouncements() {
    setLoading(true);
    
    const { data, error } = await supabase
      .from("announcements")
      .select(`
        id,
        title,
        content,
        category,
        is_pinned,
        created_at,
        author:profiles!announcements_author_id_fkey(full_name)
      `)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      const formatted = data.map(a => ({
        ...a,
        author: Array.isArray(a.author) ? a.author[0] : a.author
      }));
      setAnnouncements(formatted);
    }
    
    setLoading(false);
  }

  const getCategoryBadge = (category: string) => {
    const styles: Record<string, string> = {
      generale: "bg-blue-500/20 text-blue-300 border-blue-500/30",
      urgente: "bg-red-500/20 text-red-300 border-red-500/30",
      evento: "bg-purple-500/20 text-purple-300 border-purple-500/30",
      manutenzione: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    };
    return styles[category] || styles.generale;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Bacheca Annunci</h1>
          <p className="text-muted-2">Gestisci gli annunci e le comunicazioni</p>
        </div>
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-12 rounded-xl border border-white/10 bg-white/5">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 text-muted-2 opacity-50" />
            <p className="text-muted-2">Nessun annuncio trovato</p>
          </div>
        ) : (
          announcements.map((announcement) => (
            <div
              key={announcement.id}
              className={`rounded-xl border p-5 transition ${
                announcement.is_pinned
                  ? "border-amber-500/30 bg-amber-500/5"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {announcement.is_pinned && (
                    <span className="text-amber-400">📌</span>
                  )}
                  <h3 className="text-lg font-semibold text-white">{announcement.title}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs border ${getCategoryBadge(announcement.category)}`}>
                    {announcement.category}
                  </span>
                </div>
              </div>
              
              <p className="text-muted-2 mb-4 line-clamp-3">{announcement.content}</p>
              
              <div className="flex items-center gap-4 text-sm text-muted-2">
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  {announcement.author?.full_name || "Admin"}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {format(new Date(announcement.created_at), "d MMMM yyyy", { locale: it })}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
