"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Plus, Edit2, Trash2, Eye, EyeOff, Pin, Calendar, Loader2 } from "lucide-react";
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
    announcement: { label: "Generale", color: "bg-secondary text-white" },
    event: { label: "Evento", color: "bg-secondary text-white" },
    promotion: { label: "Promozione", color: "bg-secondary text-white" },
    partner: { label: "Partner", color: "bg-secondary text-white" },
    news: { label: "Notizia", color: "bg-secondary text-white" },
    tournament: { label: "Torneo", color: "bg-secondary text-white" },
    lesson: { label: "Lezione", color: "bg-secondary text-white" },
  };

  const priorityIcons = {
    low: "●",
    medium: "●●",
    high: "●●●",
    urgent: "●●●●",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-secondary mb-2">Gestione Annunci</h1>
          <p className="text-secondary/70 font-medium">Gestisci gli annunci visibili nella bacheca</p>
        </div>
        <Link
          href="/dashboard/admin/announcements/new"
          className="px-4 py-2.5 text-sm font-medium text-white bg-secondary rounded-md hover:opacity-90 transition-all flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Nuovo Annuncio
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
              filter === "all"
                ? "text-white bg-secondary hover:opacity-90"
                : "bg-white text-secondary/70 hover:bg-secondary/5"
            }`}
          >
            Tutti
          </button>
          {Object.entries(typeLabels).map(([key, { label }]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                filter === key
                  ? "text-white bg-secondary hover:opacity-90"
                  : "bg-white text-secondary/70 hover:bg-secondary/5"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Announcements List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-secondary" />
          <p className="mt-4 text-secondary/60">Caricamento annunci...</p>
        </div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-20 rounded-md bg-white">
          <MessageSquare className="w-16 h-16 mx-auto text-secondary/20 mb-4" />
          <h3 className="text-xl font-semibold text-secondary mb-2">Nessun annuncio trovato</h3>
          <p className="text-secondary/60 mb-4">Prova a modificare i filtri di ricerca</p>
          <Link
            href="/dashboard/admin/announcements/new"
            className="inline-flex items-center gap-2 text-secondary hover:opacity-80 font-semibold"
          >
            <Plus className="h-5 w-5" />
            Crea il primo annuncio
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((announcement) => {
            const typeInfo = typeLabels[announcement.announcement_type];
            const isExpired = announcement.expiry_date && new Date(announcement.expiry_date) < new Date();

            return (
              <article
                key={announcement.id}
                className={`bg-white rounded-md p-5 hover:bg-secondary/5 transition-all ${
                  isExpired ? "opacity-50" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      {announcement.is_pinned && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-secondary/10 px-2 py-1 text-xs font-bold text-secondary">
                          <Pin className="h-3 w-3" />
                          Fissato
                        </span>
                      )}
                      <span className={`rounded-md px-3 py-1 text-xs font-bold ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                      <span className="text-xs text-secondary/60 font-semibold">
                        Priorità: {priorityIcons[announcement.priority]}
                      </span>
                      {announcement.expiry_date && (
                        <span className={`inline-flex items-center gap-1 text-xs ${isExpired ? "text-red-600" : "text-secondary/60"}`}>
                          <Calendar className="h-3 w-3" />
                          {isExpired ? "Scaduto" : new Date(announcement.expiry_date).toLocaleDateString("it-IT")}
                        </span>
                      )}
                    </div>

                    <h3 className="text-xl font-bold text-secondary mb-2">{announcement.title}</h3>
                    <p className="text-secondary/70 text-sm mb-3 line-clamp-2">{announcement.content}</p>

                    <div className="flex items-center gap-4 text-xs text-secondary/50">
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
                      className={`p-2 rounded-md transition-all ${
                        announcement.is_published
                          ? "bg-secondary/10 text-secondary hover:bg-secondary/20"
                          : "bg-secondary/10 text-secondary/60 hover:bg-secondary/20"
                      }`}
                      title={announcement.is_published ? "Pubblicato" : "Bozza"}
                    >
                      {announcement.is_published ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                    </button>

                    <Link
                      href={`/dashboard/admin/announcements/${announcement.id}/edit`}
                      className="p-2 rounded-md bg-secondary/10 text-secondary hover:bg-secondary/20 transition-all"
                      title="Modifica"
                    >
                      <Edit2 className="h-5 w-5" />
                    </Link>

                    <button
                      onClick={() => deleteAnnouncement(announcement.id)}
                      className="p-2 rounded-md bg-red-50 text-red-600 hover:bg-red-100 transition-all"
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
