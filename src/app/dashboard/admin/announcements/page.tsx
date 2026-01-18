"use client";

import { useState, useEffect } from "react";
import {
  MessageSquare,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Pin,
  Calendar,
  Loader2,
  Search,
  Megaphone,
  PartyPopper,
  Handshake,
  Newspaper,
  Trophy,
  GraduationCap,
  AlertCircle,
  Users,
  Globe,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Download
} from "lucide-react";
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
  const [sortBy, setSortBy] = useState<"date" | "title" | "type" | "priority" | "visibility" | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

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

  const priorityConfig = {
    low: { label: "Bassa", color: "text-gray-500", dots: 1 },
    medium: { label: "Media", color: "text-blue-500", dots: 2 },
    high: { label: "Alta", color: "text-orange-500", dots: 3 },
    urgent: { label: "Urgente", color: "text-red-600", dots: 4 },
  };

  const visibilityConfig = {
    all: { label: "Tutti", icon: Globe },
    atleti: { label: "Atleti", icon: Users },
    maestri: { label: "Maestri", icon: GraduationCap },
    public: { label: "Pubblico", icon: Globe },
  };

  const typeIconMap = {
    announcement: Megaphone,
    event: PartyPopper,
    promotion: AlertCircle,
    partner: Handshake,
    news: Newspaper,
    tournament: Trophy,
    lesson: GraduationCap,
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

  // Sorting logic
  const sortedAnnouncements = [...filteredAnnouncements].sort((a, b) => {
    if (!sortBy) return 0;

    let comparison = 0;
    switch (sortBy) {
      case "date":
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
      case "title":
        comparison = a.title.localeCompare(b.title);
        break;
      case "type":
        comparison = a.announcement_type.localeCompare(b.announcement_type);
        break;
      case "priority":
        const priorityOrder = { low: 1, medium: 2, high: 3, urgent: 4 };
        comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
        break;
      case "visibility":
        comparison = a.visibility.localeCompare(b.visibility);
        break;
    }

    return sortOrder === "asc" ? comparison : -comparison;
  });

  const handleSort = (column: "date" | "title" | "type" | "priority" | "visibility") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const formatted = date.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    return formatted.split(' ').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  function exportToCSV() {
    const csv = [
      ["Data", "Titolo", "Tipo", "Priorità", "Visibilità", "Stato", "Visualizzazioni", "Autore"].join(","),
      ...sortedAnnouncements.map((a) => [
        formatDate(a.created_at),
        `"${a.title.replace(/"/g, '""')}"`,
        typeLabels[a.announcement_type]?.label || a.announcement_type,
        priorityConfig[a.priority].label,
        visibilityConfig[a.visibility].label,
        a.is_published ? "Pubblicato" : "Bozza",
        a.view_count,
        a.profiles?.full_name || "Sconosciuto",
      ].join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `annunci-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-secondary mb-2">Gestione Annunci</h1>
          <p className="text-secondary/70 font-medium">
            Visualizza, modifica e gestisci tutti gli annunci della bacheca
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/admin/announcements/new"
            className="px-4 py-2.5 text-sm font-medium text-white bg-secondary rounded-md hover:opacity-90 transition-all flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Nuovo Annuncio
          </Link>
          <button
            onClick={() => loadAnnouncements()}
            className="p-2.5 text-secondary/70 bg-white border border-gray-200 rounded-md hover:bg-secondary hover:text-white transition-all"
            title="Ricarica"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          <button
            onClick={exportToCSV}
            className="p-2.5 text-secondary/70 bg-white border border-gray-200 rounded-md hover:bg-secondary hover:text-white transition-all"
            title="Esporta CSV"
          >
            <Download className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
        <input
          type="text"
          placeholder="Cerca per titolo, contenuto o autore..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-md bg-white border border-gray-200 text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20"
        />
      </div>

      {/* Announcements List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-secondary" />
          <p className="mt-4 text-secondary/60">Caricamento annunci...</p>
        </div>
      ) : sortedAnnouncements.length === 0 ? (
        <div className="text-center py-20 rounded-md bg-white">
          <MessageSquare className="w-16 h-16 mx-auto text-secondary/20 mb-4" />
          <h3 className="text-xl font-semibold text-secondary mb-2">
            {searchQuery ? "Nessun risultato trovato" : "Nessun annuncio trovato"}
          </h3>
          <p className="text-secondary/60">
            {searchQuery ? "Prova a modificare la ricerca" : "Prova a modificare i filtri di ricerca"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Header Row */}
          <div className="bg-secondary rounded-lg px-5 py-3 mb-3 border border-secondary">
            <div className="flex items-center gap-4">
              <div className="w-10 flex-shrink-0 flex items-center justify-center">
                <button
                  onClick={() => handleSort("type")}
                  className="text-xs font-bold text-white/80 uppercase hover:text-white transition-colors flex items-center gap-1"
                >
                  #
                  {sortBy === "type" && (
                    sortOrder === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                  )}
                </button>
              </div>
              <div className="w-28 flex-shrink-0">
                <button
                  onClick={() => handleSort("date")}
                  className="text-xs font-bold text-white/80 uppercase hover:text-white transition-colors flex items-center gap-1"
                >
                  Data
                  {sortBy === "date" && (
                    sortOrder === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                  )}
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <button
                  onClick={() => handleSort("title")}
                  className="text-xs font-bold text-white/80 uppercase hover:text-white transition-colors flex items-center gap-1"
                >
                  Titolo
                  {sortBy === "title" && (
                    sortOrder === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                  )}
                </button>
              </div>
              <div className="w-32 flex-shrink-0 text-center">
                <button
                  onClick={() => handleSort("priority")}
                  className="text-xs font-bold text-white/80 uppercase hover:text-white transition-colors flex items-center gap-1 mx-auto"
                >
                  Priorità
                  {sortBy === "priority" && (
                    sortOrder === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                  )}
                </button>
              </div>
              <div className="w-28 flex-shrink-0 text-center">
                <button
                  onClick={() => handleSort("visibility")}
                  className="text-xs font-bold text-white/80 uppercase hover:text-white transition-colors flex items-center gap-1 mx-auto"
                >
                  Visibilità
                  {sortBy === "visibility" && (
                    sortOrder === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                  )}
                </button>
              </div>
              <div className="w-24 flex-shrink-0 text-center">
                <div className="text-xs font-bold text-white/80 uppercase">Stato</div>
              </div>
              <div className="w-24 flex-shrink-0 text-center">
                <div className="text-xs font-bold text-white/80 uppercase">Visualizz.</div>
              </div>
            </div>
          </div>

          {/* Data Rows */}
          {sortedAnnouncements.map((announcement) => {
            const typeInfo = typeLabels[announcement.announcement_type];
            const TypeIcon = typeIconMap[announcement.announcement_type];
            const isExpired = announcement.expiry_date && new Date(announcement.expiry_date) < new Date();
            const VisibilityIcon = visibilityConfig[announcement.visibility].icon;
            const priorityInfo = priorityConfig[announcement.priority];

            // Determina il colore del bordo in base allo stato
            let borderStyle = {};
            if (isExpired) {
              borderStyle = { borderLeftColor: "#ef4444" }; // rosso - scaduto
            } else if (!announcement.is_published) {
              borderStyle = { borderLeftColor: "#f59e0b" }; // amber - bozza
            } else if (announcement.is_pinned) {
              borderStyle = { borderLeftColor: "#8b5cf6" }; // viola - fissato
            } else {
              borderStyle = { borderLeftColor: "#10b981" }; // emerald - pubblicato
            }

            return (
              <Link
                key={announcement.id}
                href={`/dashboard/admin/announcements/new?id=${announcement.id}`}
                className="bg-white rounded-lg px-5 py-4 border border-gray-200 hover:border-gray-300 transition-all block cursor-pointer border-l-4"
                style={borderStyle}
              >
                <div className="flex items-center gap-4">
                  {/* Icona Tipo */}
                  <div className="w-10 flex-shrink-0 flex items-center justify-center">
                    <TypeIcon className="h-5 w-5 text-secondary/60" strokeWidth={2} />
                  </div>

                  {/* Data */}
                  <div className="w-28 flex-shrink-0">
                    <div className="font-bold text-secondary text-sm">
                      {formatDate(announcement.created_at)}
                    </div>
                  </div>

                  {/* Titolo */}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-secondary text-sm truncate flex items-center gap-2">
                      {announcement.is_pinned && (
                        <Pin className="h-4 w-4 text-purple-500 flex-shrink-0" />
                      )}
                      {announcement.title}
                    </div>
                  </div>

                  {/* Priorità */}
                  <div className="w-32 flex-shrink-0 text-center">
                    <span className="text-sm font-bold text-secondary">
                      {priorityInfo.label}
                    </span>
                  </div>

                  {/* Visibilità */}
                  <div className="w-28 flex-shrink-0 text-center">
                    <span className="text-sm font-bold text-secondary">
                      {visibilityConfig[announcement.visibility].label}
                    </span>
                  </div>

                  {/* Stato */}
                  <div className="w-24 flex-shrink-0 text-center">
                    <span className="text-sm font-bold text-secondary">
                      {isExpired ? "Scaduto" : announcement.is_published ? "Pubblicato" : "Bozza"}
                    </span>
                  </div>

                  {/* Visualizzazioni */}
                  <div className="w-24 flex-shrink-0 text-center">
                    <span className="text-sm font-bold text-secondary">
                      {announcement.view_count}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
