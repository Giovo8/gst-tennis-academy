"use client";

import { useState, useEffect } from "react";
import {
  Megaphone,
  Users,
  Calendar,
  Trophy,
  GraduationCap,
  Tag,
  ExternalLink,
  Filter,
  AlertCircle,
  Clock,
  Pin,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

interface Announcement {
  id: string;
  title: string;
  content: string;
  announcement_type: string;
  priority: string;
  expiry_date: string | null;
  is_pinned: boolean;
  view_count: number;
  image_url: string | null;
  link_url: string | null;
  link_text: string | null;
  created_at: string;
  has_viewed: boolean;
  days_until_expiry: number | null;
  profiles?: {
    full_name: string;
    avatar_url?: string;
  };
}

export default function AnnouncementsBoard() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  async function loadAnnouncements() {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const headers: HeadersInit = {};
      if (session) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const response = await fetch("/api/announcements", { headers });

      if (response.ok) {
        const data = await response.json();
        setAnnouncements(data.announcements || []);
      }
    } catch (error) {
      console.error("Error loading announcements:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAnnouncementClick(announcement: Announcement) {
    setSelectedAnnouncement(announcement);
    
    // Mark as viewed
    if (!announcement.has_viewed) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        try {
          // Insert view directly with Supabase client
          const { error } = await supabase
            .from("announcement_views")
            .upsert({
              announcement_id: announcement.id,
              user_id: user.id,
              viewed_at: new Date().toISOString(),
            }, {
              onConflict: "announcement_id,user_id",
            });
          
          if (error) {
            console.error("Error marking announcement as viewed:", error);
          } else {
            // Update local state
            setAnnouncements(prev => 
              prev.map(a => 
                a.id === announcement.id 
                  ? { ...a, has_viewed: true }
                  : a
              )
            );
            
            // Dispatch custom event to update badge in layout
            window.dispatchEvent(new CustomEvent('announcementRead'));
          }
        } catch (error) {
          console.error("Error marking announcement as viewed:", error);
        }
      }
    }
  }

  const typeIcons: Record<string, any> = {
    announcement: Megaphone,
    partner: Users,
    event: Calendar,
    tournament: Trophy,
    lesson: GraduationCap,
    promotion: Tag,
  };

  const typeColors: Record<string, string> = {
    announcement: "bg-gradient-to-br from-blue-500 to-blue-600",
    partner: "bg-gradient-to-br from-cyan-500 to-cyan-600",
    event: "bg-gradient-to-br from-blue-500 to-blue-600",
    tournament: "bg-gradient-to-br from-cyan-600 to-blue-700",
    lesson: "bg-gradient-to-br from-cyan-500 to-blue-600",
    promotion: "bg-gradient-to-br from-blue-400 to-cyan-500",
  };

  const priorityBorders: Record<string, string> = {
    low: "border-gray-200",
    medium: "border-blue-300",
    high: "border-cyan-400",
    urgent: "border-cyan-500 ring-2 ring-cyan-200",
  };

  const filteredAnnouncements = filterType === "all"
    ? announcements
    : announcements.filter((a) => a.announcement_type === filterType);

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 24) {
      if (hours < 1) return "Meno di un'ora fa";
      return `${hours} ${hours === 1 ? "ora" : "ore"} fa`;
    }

    const days = Math.floor(hours / 24);
    if (days < 7) {
      return `${days} ${days === 1 ? "giorno" : "giorni"} fa`;
    }

    return date.toLocaleDateString("it-IT", { 
      day: "numeric", 
      month: "long", 
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined 
    });
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-3 overflow-x-auto">
          <Filter className="w-5 h-5 text-gray-500 flex-shrink-0" />
          <button
            onClick={() => setFilterType("all")}
            className={`px-4 py-2 rounded-lg whitespace-nowrap font-medium transition-all ${
              filterType === "all"
                ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md"
                : "bg-gray-50 text-gray-700 hover:bg-gray-100"
            }`}
          >
            Tutti
          </button>
          {Object.entries(typeIcons).map(([type, Icon]) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap font-medium transition-all ${
                filterType === type
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md"
                  : "bg-gray-50 text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="capitalize">{type}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Announcements Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="w-14 h-14 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin shadow-lg shadow-cyan-500/20" />
            <p className="text-gray-600 font-medium">Caricamento annunci...</p>
          </div>
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Nessun annuncio disponibile
          </h3>
          <p className="text-gray-600">
            {filterType === "all" 
              ? "Non ci sono annunci al momento"
              : "Nessun annuncio di questo tipo"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAnnouncements.map((announcement) => {
            const Icon = typeIcons[announcement.announcement_type] || Megaphone;
            const iconColor = typeColors[announcement.announcement_type] || "bg-gray-500";

            return (
              <div
                key={announcement.id}
                onClick={() => handleAnnouncementClick(announcement)}
                className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-300 cursor-pointer ${
                  !announcement.has_viewed ? "ring-2 ring-cyan-400" : ""
                } ${announcement.priority === "urgent" ? "border-orange-300" : ""}`}
              >
                {/* Image */}
                {announcement.image_url && (
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={announcement.image_url}
                      alt={announcement.title}
                      className="w-full h-full object-cover"
                    />
                    {announcement.is_pinned && (
                      <div className="absolute top-3 right-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white p-2 rounded-lg shadow-lg">
                        <Pin className="w-4 h-4" />
                      </div>
                    )}
                    {!announcement.has_viewed && (
                      <div className="absolute top-3 left-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-md">
                        NUOVO
                      </div>
                    )}
                  </div>
                )}

                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className={`${iconColor} p-3 rounded-xl text-white flex-shrink-0 shadow-sm`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-2">
                        {announcement.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(announcement.created_at)}</span>
                        {announcement.days_until_expiry !== null && announcement.days_until_expiry <= 7 && (
                          <span className="flex items-center gap-1 text-orange-500 font-medium">
                            • {announcement.days_until_expiry === 0
                              ? "Scade oggi"
                              : `${announcement.days_until_expiry}g rimanenti`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {announcement.content}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      {announcement.profiles?.avatar_url ? (
                        <img
                          src={announcement.profiles.avatar_url}
                          alt={announcement.profiles.full_name}
                          className="w-7 h-7 rounded-full border-2 border-gray-200"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                          {announcement.profiles?.full_name?.charAt(0) || "?"}
                        </div>
                      )}
                      <span className="text-xs text-gray-600 font-medium">
                        {announcement.profiles?.full_name || "Sconosciuto"}
                      </span>
                    </div>

                    {announcement.link_url && (
                      <a
                        href={announcement.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 text-cyan-600 hover:text-blue-700 text-sm font-semibold transition-colors"
                      >
                        {announcement.link_text || "Scopri di più"}
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>

                  {/* Priority indicator */}
                  {announcement.priority === "urgent" && (
                    <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />
                      <span className="text-xs text-orange-800 font-bold">
                        URGENTE
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal per annuncio completo */}
      {selectedAnnouncement && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedAnnouncement(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-3">
                {(() => {
                  const Icon = typeIcons[selectedAnnouncement.announcement_type] || Megaphone;
                  const iconColor = typeColors[selectedAnnouncement.announcement_type] || "bg-gray-500";
                  return (
                    <div className={`${iconColor} p-3 rounded-xl text-white shadow-sm`}>
                      <Icon className="w-6 h-6" />
                    </div>
                  );
                })()}
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedAnnouncement.title}
                  </h2>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                    <Clock className="w-4 h-4" />
                    <span>{formatDate(selectedAnnouncement.created_at)}</span>
                    {selectedAnnouncement.is_pinned && (
                      <>
                        <span>•</span>
                        <Pin className="w-4 h-4 text-cyan-500" />
                        <span className="text-cyan-600 font-medium">In evidenza</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            {/* Immagine */}
            {selectedAnnouncement.image_url && (
              <div className="w-full">
                <img
                  src={selectedAnnouncement.image_url}
                  alt={selectedAnnouncement.title}
                  className="w-full h-auto max-h-96 object-cover"
                />
              </div>
            )}

            {/* Contenuto */}
            <div className="p-6 space-y-6">
              {/* Priorità urgente */}
              {selectedAnnouncement.priority === "urgent" && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-orange-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-orange-800">ANNUNCIO URGENTE</p>
                    <p className="text-xs text-orange-600 mt-1">Richiede attenzione immediata</p>
                  </div>
                </div>
              )}

              {/* Scadenza */}
              {selectedAnnouncement.days_until_expiry !== null && selectedAnnouncement.days_until_expiry <= 7 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-500" />
                  <span className="text-sm text-blue-800 font-medium">
                    {selectedAnnouncement.days_until_expiry === 0
                      ? "Questo annuncio scade oggi"
                      : `Questo annuncio scade tra ${selectedAnnouncement.days_until_expiry} ${selectedAnnouncement.days_until_expiry === 1 ? 'giorno' : 'giorni'}`}
                  </span>
                </div>
              )}

              {/* Testo completo */}
              <div className="prose prose-gray max-w-none">
                <p className="text-gray-700 text-base leading-relaxed whitespace-pre-wrap">
                  {selectedAnnouncement.content}
                </p>
              </div>

              {/* Link esterno */}
              {selectedAnnouncement.link_url && (
                <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-lg p-4">
                  <a
                    href={selectedAnnouncement.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between group"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-1">
                        {selectedAnnouncement.link_text || "Per maggiori informazioni"}
                      </p>
                      <p className="text-xs text-gray-500">Clicca per aprire il link</p>
                    </div>
                    <ExternalLink className="w-5 h-5 text-cyan-600 group-hover:text-blue-700 transition-colors" />
                  </a>
                </div>
              )}

              {/* Autore */}
              <div className="pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-3">Pubblicato da</p>
                <div className="flex items-center gap-3">
                  {selectedAnnouncement.profiles?.avatar_url ? (
                    <img
                      src={selectedAnnouncement.profiles.avatar_url}
                      alt={selectedAnnouncement.profiles.full_name}
                      className="w-12 h-12 rounded-full border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-lg font-bold text-white shadow-sm">
                      {selectedAnnouncement.profiles?.full_name?.charAt(0) || "?"}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-gray-900">
                      {selectedAnnouncement.profiles?.full_name || "Autore sconosciuto"}
                    </p>
                    <p className="text-sm text-gray-500">GST Tennis Academy</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
