"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Video, Loader2, Search, Plus, Play } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import AuthGuard from "@/components/auth/AuthGuard";

type VideoLesson = {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  duration_minutes: number | null;
  created_by: string | null;
  category: string;
  level: string;
  is_active: boolean;
  watched_at: string | null;
  watch_count: number;
  created_at: string;
  assigned_users?: { full_name: string; email: string }[];
  creator?: { full_name: string; email: string } | null;
};

export default function VideoLessonsPage() {
  const router = useRouter();
  const [videos, setVideos] = useState<VideoLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const categories = [
    { value: "generale", label: "Generale" },
    { value: "tecnica", label: "Tecnica" },
    { value: "tattica", label: "Tattica" },
    { value: "fitness", label: "Fitness" },
    { value: "mentale", label: "Mentale" },
  ];

  const levels = [
    { value: "tutti", label: "Tutti" },
    { value: "principiante", label: "Principiante" },
    { value: "intermedio", label: "Intermedio" },
    { value: "avanzato", label: "Avanzato" },
  ];

  useEffect(() => {
    loadVideos();
  }, []);

  async function loadVideos() {
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (sessionError || !token) {
        throw new Error("Sessione non valida. Effettua nuovamente il login.");
      }

      const response = await fetch("/api/admin/video-lessons", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || "Errore durante il caricamento dei video");
      }

      setVideos(payload?.videos || []);
    } catch (error) {
      console.error("Error loading videos:", error);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }
  const filteredVideos = videos.filter((video) => {
    const matchesCategory = filter === "all" || video.category === filter;
    const matchesSearch =
      !search ||
      video.title.toLowerCase().includes(search.toLowerCase()) ||
      video.description?.toLowerCase().includes(search.toLowerCase()) ||
      video.assigned_users?.some((u) => u.full_name?.toLowerCase().includes(search.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <AuthGuard allowedRoles={["admin", "gestore"]}>
      <div className="space-y-6">{/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div>
              <h1 className="text-4xl font-bold text-secondary">Video Lab</h1>
            </div>
          </div>
          <Link
            href="/dashboard/admin/video-lessons/new"
            className="px-4 py-2.5 text-sm font-medium text-white bg-secondary rounded-md hover:opacity-90 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>Nuovo Video</span>
          </Link>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
          <input
            type="text"
            placeholder="Cerca per titolo, descrizione o utente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-md bg-white border border-gray-200 text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20"
          />
        </div>

        {/* Videos List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-secondary" />
            <p className="mt-4 text-gray-600">Caricamento video...</p>
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Video className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nessun video trovato</h3>
            <p className="text-gray-600 mb-6">
              {search || filter !== "all"
                ? "Prova a modificare i filtri di ricerca"
                : "Inizia creando il primo video lezione"}
            </p>
            {!search && filter === "all" && (
              <Link
                href="/dashboard/admin/video-lessons/new"
                className="inline-flex items-center gap-2 px-6 py-3 bg-secondary hover:opacity-90 text-white font-medium rounded-lg transition-all"
              >
                <Plus className="h-5 w-5" />
                <span>Crea Primo Video</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
            {filteredVideos.map((video) => {
              const getYouTubeVideoId = (url: string) => {
                const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
                return match ? match[1] : null;
              };
              const videoId = getYouTubeVideoId(video.video_url);
              const thumbnailUrl = videoId
                ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
                : video.thumbnail_url;

              return (
                <div
                  key={video.id}
                  onClick={() => router.push(`/dashboard/admin/video-lessons/${video.id}`)}
                  className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-secondary/40 hover:shadow-md transition-all cursor-pointer flex flex-col"
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-gray-100 overflow-hidden">
                    {thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumbnailUrl}
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-secondary/5">
                        <Video className="w-12 h-12 text-secondary/20" />
                      </div>
                    )}

                    {/* Play overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-5 h-5 text-secondary fill-secondary ml-0.5" />
                      </div>
                    </div>

                    {/* Duration badge */}
                    {video.duration_minutes && (
                      <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-medium px-1.5 py-0.5 rounded">
                        {video.duration_minutes}:00
                      </div>
                    )}

                    {/* Status badge */}
                    {!video.is_active && (
                      <div className="absolute top-2 left-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded bg-gray-200 text-secondary">
                          Bozza
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4 flex flex-col gap-2 flex-1">
                    <h3 className="font-bold text-secondary text-xl sm:text-2xl line-clamp-2 leading-tight">
                      {video.title}
                    </h3>
                    {video.description ? (
                      <p className="text-xs text-secondary/60 line-clamp-2">
                        {video.description}
                      </p>
                    ) : (
                      <p className="text-xs text-secondary/40 italic">Aggiungi descrizione</p>
                    )}
                  </div>

                  {/* Meta footer */}
                  <div className="px-4 py-2.5 bg-secondary text-xs text-white">
                    {format(new Date(video.created_at), 'd MMM yyyy', { locale: it })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
