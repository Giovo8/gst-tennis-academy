"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Calendar, Pin, Eye, X, ExternalLink } from "lucide-react";

type Announcement = {
  id: string;
  title: string;
  content: string;
  announcement_type: "announcement" | "event" | "promotion" | "partner" | "news" | "tournament" | "lesson";
  priority: "low" | "medium" | "high" | "urgent";
  expiry_date: string | null;
  is_pinned: boolean;
  image_url: string | null;
  link_url: string | null;
  link_text: string | null;
  created_at: string;
  has_viewed: boolean;
  profiles: { full_name: string } | null;
};

export default function AnnouncementsWidget() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  async function loadAnnouncements() {
    try {
      const res = await fetch("/api/announcements?limit=10");
      const data = await res.json();
      if (res.ok) {
        setAnnouncements(data.announcements || []);
      }
    } catch (error) {
      console.error("Error loading announcements:", error);
    } finally {
      setLoading(false);
    }
  }

  async function markAsViewed(announcementId: string) {
    try {
      await fetch(`/api/announcements/${announcementId}`, {
        method: "GET",
      });
      setAnnouncements(
        announcements.map((a) =>
          a.id === announcementId ? { ...a, has_viewed: true } : a
        )
      );
    } catch (error) {
      console.error("Error marking as viewed:", error);
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

  if (loading) {
    return (
      <div className="rounded-2xl border-2 border-white/20 bg-white/5 backdrop-blur-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <MessageSquare className="h-6 w-6 text-cyan-400" />
          <h2 className="text-xl font-bold text-white">Bacheca Annunci</h2>
        </div>
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl border-2 border-white/20 bg-white/5 backdrop-blur-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-6 w-6 text-cyan-400" />
            <h2 className="text-xl font-bold text-white">Bacheca Annunci</h2>
          </div>
          {announcements.length > 0 && (
            <span className="px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-xs font-bold text-cyan-300">
              {announcements.filter((a) => !a.has_viewed).length} nuovi
            </span>
          )}
        </div>

        {announcements.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Nessun annuncio al momento</p>
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((announcement) => {
              const typeInfo = typeLabels[announcement.announcement_type];
              const isExpired = announcement.expiry_date && new Date(announcement.expiry_date) < new Date();

              return (
                <article
                  key={announcement.id}
                  onClick={() => {
                    setSelectedAnnouncement(announcement);
                    if (!announcement.has_viewed) {
                      markAsViewed(announcement.id);
                    }
                  }}
                  className={`group relative rounded-xl border-2 border-white/10 bg-white/5 p-4 cursor-pointer hover:border-cyan-400/40 hover:bg-white/10 transition-all ${
                    !announcement.has_viewed ? "border-cyan-400/40" : ""
                  } ${isExpired ? "opacity-50" : ""}`}
                >
                  {!announcement.has_viewed && (
                    <div className="absolute top-2 right-2 w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                  )}

                  <div className="flex items-start gap-3 mb-2">
                    {announcement.is_pinned && (
                      <Pin className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-1" />
                    )}
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${typeInfo.color}`}>
                      {typeInfo.label}
                    </span>
                    {announcement.expiry_date && (
                      <span className="ml-auto text-xs text-gray-400 flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        {new Date(announcement.expiry_date).toLocaleDateString("it-IT")}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-white mb-1 group-hover:text-cyan-300 transition-colors">
                    {announcement.title}
                  </h3>
                  <p className="text-sm text-gray-300 line-clamp-2">{announcement.content}</p>

                  <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                    <span>
                      {announcement.profiles?.full_name || "Admin"} • {new Date(announcement.created_at).toLocaleDateString("it-IT")}
                    </span>
                    <span className="text-cyan-400 group-hover:text-cyan-300 font-semibold">Leggi →</span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal for full announcement */}
      {selectedAnnouncement && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 pt-safe pb-safe px-safe"
          onClick={() => setSelectedAnnouncement(null)}
        >
          <div
            className="bg-[#021627] rounded-2xl border-2 border-white/20 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {selectedAnnouncement.image_url && (
              <div className="w-full h-64 overflow-hidden rounded-t-2xl">
                <img
                  src={selectedAnnouncement.image_url}
                  alt={selectedAnnouncement.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedAnnouncement.is_pinned && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/20 border border-yellow-500/40 px-2 py-1 text-xs font-bold text-yellow-300">
                      <Pin className="h-3 w-3" />
                      Fissato
                    </span>
                  )}
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-bold ${
                      typeLabels[selectedAnnouncement.announcement_type].color
                    }`}
                  >
                    {typeLabels[selectedAnnouncement.announcement_type].label}
                  </span>
                  {selectedAnnouncement.expiry_date && (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                      <Calendar className="h-3 w-3" />
                      Valido fino al {new Date(selectedAnnouncement.expiry_date).toLocaleDateString("it-IT")}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setSelectedAnnouncement(null)}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
                >
                  <X className="h-5 w-5 text-white" />
                </button>
              </div>

              <h2 className="text-2xl font-bold text-white mb-4">{selectedAnnouncement.title}</h2>

              <div className="text-gray-300 whitespace-pre-wrap mb-4">{selectedAnnouncement.content}</div>

              {selectedAnnouncement.link_url && (
                <a
                  href={selectedAnnouncement.link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-3 text-sm font-semibold text-white hover:shadow-lg hover:shadow-blue-500/30 transition-all"
                >
                  <ExternalLink className="h-4 w-4" />
                  {selectedAnnouncement.link_text || "Scopri di più"}
                </a>
              )}

              <div className="mt-6 pt-4 border-t border-white/10 text-xs text-gray-400">
                Pubblicato da {selectedAnnouncement.profiles?.full_name || "Admin"} il{" "}
                {new Date(selectedAnnouncement.created_at).toLocaleDateString("it-IT", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
