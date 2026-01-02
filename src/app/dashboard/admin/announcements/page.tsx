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
      
      if (res.ok) {
        setAnnouncements(data.announcements || []);
      }
    } catch {
      // Errore nel caricamento annunci
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
    announcement: { label: "Generale", color: "bg-blue-100 text-blue-700 border-blue-300" },
    event: { label: "Evento", color: "bg-purple-100 text-purple-700 border-purple-300" },
    promotion: { label: "Promozione", color: "bg-green-100 text-green-700 border-green-300" },
    partner: { label: "Partner", color: "bg-yellow-100 text-yellow-700 border-yellow-300" },
    news: { label: "Notizia", color: "bg-cyan-100 text-cyan-700 border-cyan-300" },
    tournament: { label: "Torneo", color: "bg-orange-100 text-orange-700 border-orange-300" },
    lesson: { label: "Lezione", color: "bg-pink-100 text-pink-700 border-pink-300" },
  };

  const priorityIcons = {
    low: "●",
    medium: "●●",
    high: "●●●",
    urgent: "●●●●",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-700 mb-2">Gestione Annunci</h1>
          <p className="text-gray-600">Gestisci gli annunci visibili nella bacheca</p>
        </div>
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
                className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-all ${
                  filter === key
                    ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-transparent shadow-sm"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
          ))}
        </div>

        <Link
          href="/dashboard/admin/announcements/new"
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 text-sm font-semibold text-white hover:from-cyan-600 hover:to-blue-700 transition-all shadow-sm"
          >
            <Plus className="h-5 w-5" />
            Nuovo Annuncio
          </Link>
        </div>

      {/* Announcements List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Caricamento...</p>
        </div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-12 rounded-xl border border-gray-200 bg-white shadow-sm">
          <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">Nessun annuncio trovato</p>
          <Link
            href="/dashboard/admin/announcements/new"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold"
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
                className={`group rounded-xl border border-gray-200 bg-white p-6 hover:shadow-md transition-all ${
                  isExpired ? "opacity-50" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      {announcement.is_pinned && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 border border-yellow-300 px-2 py-1 text-xs font-bold text-yellow-700">
                          <Pin className="h-3 w-3" />
                          Fissato
                        </span>
                      )}
                      <span className={`rounded-full border px-3 py-1 text-xs font-bold ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                      <span className="text-xs text-gray-600 font-semibold">
                        Priorità: {priorityIcons[announcement.priority]}
                      </span>
                      {announcement.expiry_date && (
                        <span className={`inline-flex items-center gap-1 text-xs ${isExpired ? "text-red-600" : "text-gray-600"}`}>
                          <Calendar className="h-3 w-3" />
                          {isExpired ? "Scaduto" : new Date(announcement.expiry_date).toLocaleDateString("it-IT")}
                        </span>
                      )}
                    </div>

                    <h3 className="text-xl font-bold text-gray-700 mb-2">{announcement.title}</h3>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">{announcement.content}</p>

                    <div className="flex items-center gap-4 text-xs text-gray-500">
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
                      className={`p-2 rounded-lg border transition-all ${
                        announcement.is_published
                          ? "bg-green-100 border-green-300 text-green-700 hover:bg-green-200"
                          : "bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200"
                      }`}
                      title={announcement.is_published ? "Pubblicato" : "Bozza"}
                    >
                      {announcement.is_published ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                    </button>

                    <Link
                      href={`/dashboard/admin/announcements/${announcement.id}/edit`}
                      className="p-2 rounded-lg border border-blue-300 bg-blue-100 text-blue-700 hover:bg-blue-200 transition-all"
                      title="Modifica"
                    >
                      <Edit2 className="h-5 w-5" />
                    </Link>

                    <button
                      onClick={() => deleteAnnouncement(announcement.id)}
                      className="p-2 rounded-lg border border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all"
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
    </div>
  );
}
