"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Plus, Edit2, Trash2, Eye, EyeOff, Pin, Calendar, AlertCircle } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

type Announcement = {
  id: string;
  title: string;
  content: string;
  announcement_type: "announcement" | "event" | "promotion" | "partner" | "news" | "tournament" | "lesson";
  priority: "low" | "medium" | "high" | "urgent";
  expiry_date: string | null;
  visibility: "all" | "atleti" | "maestri" | "public";
  is_published: boolean;
  is_pinned: boolean;
  view_count: number;
  created_at: string;
  profiles: { full_name: string } | null;
};

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    loadAnnouncements();
  }, [filter]);

  async function loadAnnouncements() {
    try {
      // Get session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      const params = new URLSearchParams();
      if (filter !== "all") params.set("type", filter);
      params.set("include_expired", "true");
      params.set("include_unpublished", "true"); // Admin sees all announcements

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(`/api/announcements?${params}`, { headers });
      const data = await res.json();
      
      console.log("API Response status:", res.status);
      console.log("API Response data:", JSON.stringify(data, null, 2));
      
      if (res.ok) {
        setAnnouncements(data.announcements || []);
        console.log("Loaded announcements:", data.announcements?.length || 0);
      } else {
        console.error("Error response:", res.status, data);
        console.error("Error details:", data.error, data.details, data.code);
      }
    } catch (error) {
      console.error("Error loading announcements:", error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteAnnouncement(id: string) {
    if (!confirm("Sei sicuro di voler eliminare questo annuncio?")) return;

    try {
      const res = await fetch(`/api/announcements/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setAnnouncements(announcements.filter((a) => a.id !== id));
      } else {
        alert("Errore durante l'eliminazione");
      }
    } catch (error) {
      console.error("Error deleting announcement:", error);
      alert("Errore durante l'eliminazione");
    }
  }

  async function togglePublish(announcement: Announcement) {
    try {
      const res = await fetch(`/api/announcements/${announcement.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_published: !announcement.is_published }),
      });

      if (res.ok) {
        setAnnouncements(
          announcements.map((a) =>
            a.id === announcement.id ? { ...a, is_published: !a.is_published } : a
          )
        );
      }
    } catch (error) {
      console.error("Error toggling publish:", error);
    }
  }

  const typeLabels = {
    announcement: { label: "Generale", color: "bg-blue-500/20 text-blue-300 border-blue-500/40" },
    event: { label: "Evento", color: "bg-purple-500/20 text-purple-300 border-purple-500/40" },
    promotion: { label: "Promozione", color: "bg-green-500/20 text-green-300 border-green-500/40" },
    partner: { label: "Partner", color: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40" },
    news: { label: "Notizia", color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" },
    tournament: { label: "Torneo", color: "bg-orange-500/20 text-orange-300 border-orange-500/40" },
    lesson: { label: "Lezione", color: "bg-pink-500/20 text-pink-300 border-pink-500/40" },
  };

  const priorityIcons = {
    low: "●",
    medium: "●●",
    high: "●●●",
  };

  return (
    <div className="min-h-screen bg-[#021627]">
      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold gradient-text mb-2">Bacheca Annunci</h1>
          <p className="text-gray-400">Gestisci gli annunci visibili nella bacheca</p>
        </div>

        {/* Actions Bar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                filter === "all"
                  ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg"
                  : "bg-white/5 text-gray-300 border border-white/10 hover:border-white/30"
              }`}
            >
              Tutti
            </button>
            {Object.entries(typeLabels).map(([key, { label }]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  filter === key
                    ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg"
                    : "bg-white/5 text-gray-300 border border-white/10 hover:border-white/30"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <Link
            href="/dashboard/admin/announcements/new"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-3 text-sm font-semibold text-white hover:shadow-lg hover:shadow-blue-500/30 transition-all"
          >
            <Plus className="h-5 w-5" />
            Nuovo Annuncio
          </Link>
        </div>

        {/* Announcements List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
            <p className="mt-4 text-gray-400">Caricamento...</p>
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border-2 border-white/10 bg-white/5 backdrop-blur-xl">
            <MessageSquare className="h-16 w-16 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">Nessun annuncio trovato</p>
            <Link
              href="/dashboard/admin/announcements/new"
              className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 font-semibold"
            >
              <Plus className="h-5 w-5" />
              Crea il primo annuncio
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => {
              const typeInfo = typeLabels[announcement.announcement_type];
              const isExpired = announcement.expiry_date && new Date(announcement.expiry_date) < new Date();

              return (
                <article
                  key={announcement.id}
                  className={`group rounded-2xl border-2 border-white/20 bg-white/5 backdrop-blur-xl p-6 hover:border-white/40 transition-all ${
                    isExpired ? "opacity-50" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        {announcement.is_pinned && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/20 border border-yellow-500/40 px-2 py-1 text-xs font-bold text-yellow-300">
                            <Pin className="h-3 w-3" />
                            Fissato
                          </span>
                        )}
                        <span className={`rounded-full border px-3 py-1 text-xs font-bold ${typeInfo.color}`}>
                          {typeInfo.label}
                        </span>
                        <span className="text-xs text-gray-400">
                          Priorità: {priorityIcons[announcement.priority]}
                        </span>
                        {announcement.expiry_date && (
                          <span className={`inline-flex items-center gap-1 text-xs ${isExpired ? "text-red-400" : "text-gray-400"}`}>
                            <Calendar className="h-3 w-3" />
                            {isExpired ? "Scaduto" : new Date(announcement.expiry_date).toLocaleDateString("it-IT")}
                          </span>
                        )}
                      </div>

                      <h3 className="text-xl font-bold text-white mb-2">{announcement.title}</h3>
                      <p className="text-gray-300 text-sm mb-3 line-clamp-2">{announcement.content}</p>

                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span>Autore: {announcement.profiles?.full_name || "Sconosciuto"}</span>
                        <span>•</span>
                        <span>{new Date(announcement.created_at).toLocaleDateString("it-IT")}</span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {announcement.view_count} visualizzazioni
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => togglePublish(announcement)}
                        className={`p-2 rounded-lg transition-all ${
                          announcement.is_published
                            ? "bg-green-500/20 text-green-300 hover:bg-green-500/30"
                            : "bg-gray-500/20 text-gray-400 hover:bg-gray-500/30"
                        }`}
                        title={announcement.is_published ? "Pubblicato" : "Bozza"}
                      >
                        {announcement.is_published ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                      </button>

                      <Link
                        href={`/dashboard/admin/announcements/${announcement.id}/edit`}
                        className="p-2 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition-all"
                        title="Modifica"
                      >
                        <Edit2 className="h-5 w-5" />
                      </Link>

                      <button
                        onClick={() => deleteAnnouncement(announcement.id)}
                        className="p-2 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-all"
                        title="Elimina"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
