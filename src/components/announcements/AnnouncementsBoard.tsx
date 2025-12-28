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
  profiles: {
    full_name: string;
    avatar_url?: string;
  };
}

export default function AnnouncementsBoard() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");

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

  const typeIcons: Record<string, any> = {
    announcement: Megaphone,
    partner: Users,
    event: Calendar,
    tournament: Trophy,
    lesson: GraduationCap,
    promotion: Tag,
  };

  const typeColors: Record<string, string> = {
    announcement: "bg-blue-500",
    partner: "bg-cyan-500",
    event: "bg-blue-500",
    tournament: "bg-blue-600",
    lesson: "bg-cyan-600",
    promotion: "bg-blue-400",
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
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Bacheca GST Tennis Academy
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Rimani aggiornato su eventi, tornei e novità dell'accademia
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Filter className="w-5 h-5 text-gray-500 flex-shrink-0" />
        <button
          onClick={() => setFilterType("all")}
          className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${
            filterType === "all"
              ? "bg-blue-600 text-white shadow-lg"
              : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          }`}
        >
          Tutti
        </button>
        {Object.entries(typeIcons).map(([type, Icon]) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
              filterType === type
                ? "bg-blue-600 text-white shadow-lg"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="capitalize">{type}</span>
          </button>
        ))}
      </div>

      {/* Announcements Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Nessun annuncio disponibile
          </h3>
          <p className="text-gray-500">
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
                className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border-2 ${
                  priorityBorders[announcement.priority]
                } hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 ${
                  !announcement.has_viewed ? "ring-2 ring-blue-400 ring-opacity-50" : ""
                }`}
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
                      <div className="absolute top-3 right-3 bg-cyan-500 text-white p-2 rounded-full shadow-lg">
                        <Pin className="w-4 h-4" />
                      </div>
                    )}
                    {!announcement.has_viewed && (
                      <div className="absolute top-3 left-3 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                        NUOVO
                      </div>
                    )}
                  </div>
                )}

                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className={`${iconColor} p-3 rounded-lg text-white flex-shrink-0`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 line-clamp-2">
                        {announcement.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{formatDate(announcement.created_at)}</span>
                        {announcement.days_until_expiry !== null && announcement.days_until_expiry <= 7 && (
                          <span className="flex items-center gap-1 text-blue-400">
                            <Clock className="w-3 h-3" />
                            {announcement.days_until_expiry === 0
                              ? "Scade oggi"
                              : `${announcement.days_until_expiry}g rimanenti`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3">
                    {announcement.content}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      {announcement.profiles.avatar_url ? (
                        <img
                          src={announcement.profiles.avatar_url}
                          alt={announcement.profiles.full_name}
                          className="w-6 h-6 rounded-full"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-semibold">
                          {announcement.profiles.full_name.charAt(0)}
                        </div>
                      )}
                      <span className="text-xs text-gray-500">
                        {announcement.profiles.full_name}
                      </span>
                    </div>

                    {announcement.link_url && (
                      <a
                        href={announcement.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-semibold"
                      >
                        {announcement.link_text || "Scopri di più"}
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>

                  {/* Priority indicator */}
                  {announcement.priority === "urgent" && (
                    <div className="mt-4 bg-cyan-50 dark:bg-cyan-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                      <span className="text-xs text-red-800 dark:text-red-200 font-semibold">
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
    </div>
  );
}
