"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Plus, Edit2, Trash2, Eye, EyeOff, Pin, Calendar, Loader2, Search } from "lucide-react";
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
  const [searchQuery, setSearchQuery] = useState("");

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

  // Filter announcements based on search query
  const filteredAnnouncements = announcements.filter((announcement) => {
    const query = searchQuery.toLowerCase();
    return (
      announcement.title.toLowerCase().includes(query) ||
      announcement.content.toLowerCase().includes(query) ||
      announcement.profiles?.full_name.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div>
          <div className="text-xs font-semibold text-secondary/60 uppercase tracking-wider mb-1">
            GESTIONE ANNUNCI
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-secondary">Gestione Annunci</h1>
              <p className="text-gray-600 font-medium mt-1">Gestisci gli annunci visibili nella bacheca</p>
            </div>
            <Link
              href="/dashboard/admin/announcements/new"
              className="px-4 py-2.5 text-sm font-medium text-white bg-secondary rounded-md hover:opacity-90 transition-all flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Nuovo Annuncio
            </Link>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Cerca per titolo, contenuto o autore..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white pl-12 pr-4 py-3 text-secondary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
              filter === "all"
                ? "text-white bg-secondary hover:opacity-90"
                : "bg-white text-gray-600 hover:bg-gray-100"
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
                  : "bg-white text-gray-600 hover:bg-gray-100"
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
          <p className="mt-4 text-gray-600">Caricamento annunci...</p>
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-secondary">
            {searchQuery ? "Nessun risultato trovato" : "Nessun annuncio trovato"}
          </h3>
          <p className="text-gray-600 mt-1 mb-4">
            {searchQuery ? "Prova a modificare la ricerca" : "Prova a modificare i filtri di ricerca"}
          </p>
          {!searchQuery && (
            <Link
              href="/dashboard/admin/announcements/new"
              className="inline-flex items-center gap-2 text-secondary hover:opacity-80 font-semibold"
            >
              <Plus className="h-5 w-5" />
              Crea il primo annuncio
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAnnouncements.map((announcement) => {
            const typeInfo = typeLabels[announcement.announcement_type];
            const isExpired = announcement.expiry_date && new Date(announcement.expiry_date) < new Date();

            return (
              <Link
                key={announcement.id}
                href={`/dashboard/admin/announcements/new?id=${announcement.id}`}
                className={`block bg-white rounded-xl border-l-4 border-secondary shadow-md p-6 hover:bg-gray-100 transition-all cursor-pointer ${
                  isExpired ? "opacity-50" : ""
                }`}
              >
                <div className="flex items-start gap-3 mb-3 flex-wrap">
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
                  {!announcement.is_published && (
                    <>
                      <span>•</span>
                      <span className="text-orange-600 font-semibold">Bozza</span>
                    </>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
