"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Video, Loader2, Search, Plus, Play, Users, Calendar, Edit } from "lucide-react";
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
  assigned_to: string | null;
  category: string;
  level: string;
  is_active: boolean;
  watched_at: string | null;
  watch_count: number;
  created_at: string;
  assigned_user?: { full_name: string; email: string } | null;
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
      const { data, error } = await supabase
        .from("video_lessons")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Load user data separately
      if (data && data.length > 0) {
        const userIds = [...new Set([
          ...data.map((v) => v.assigned_to).filter(Boolean),
          ...data.map((v) => v.created_by).filter(Boolean),
        ])];

        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name, email")
            .in("id", userIds);

          const videosWithUsers = data.map((video) => ({
            ...video,
            assigned_user: video.assigned_to
              ? profiles?.find((p) => p.id === video.assigned_to)
              : null,
            creator: video.created_by
              ? profiles?.find((p) => p.id === video.created_by)
              : null,
          }));

          setVideos(videosWithUsers);
        } else {
          setVideos(data);
        }
      } else {
        setVideos(data || []);
      }
    } catch (error) {
      console.error("Error loading videos:", error);
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
      video.assigned_user?.full_name?.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <AuthGuard allowedRoles={["admin", "gestore"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div>
              <div className="text-xs font-semibold text-secondary/60 uppercase tracking-wider mb-1">
                GESTIONE VIDEO
              </div>
              <h1 className="text-3xl font-bold text-secondary">Video Lezioni</h1>
              <p className="text-gray-600 text-sm mt-1 max-w-2xl">
                Gestisci e assegna video lezioni personalizzati agli atleti
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/admin/video-lessons/new"
            className="px-6 py-3 bg-secondary hover:opacity-90 text-white font-medium rounded-lg transition-all flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            <span>Nuovo Video</span>
          </Link>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Cerca per titolo, descrizione o utente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-secondary/20"
              />
            </div>
          </div>

          <div className="flex gap-2 flex-wrap mt-4">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${ 
                filter === "all"
                  ? "text-white bg-secondary"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Tutti
            </button>
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setFilter(cat.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === cat.value
                    ? "text-white bg-secondary"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
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
          <div className="space-y-4">
            {filteredVideos.map((video) => (
              <div
                key={video.id}
                onClick={() => router.push(`/dashboard/admin/video-lessons/new?id=${video.id}`)}
                className="rounded-xl border-l-4 border-secondary shadow-md p-6 hover:bg-gray-50 transition-colors cursor-pointer bg-white"
              >
                <div className="flex items-start gap-4">
                  {/* Thumbnail */}
                  {video.thumbnail_url && (
                    <div className="w-40 h-24 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      <img
                        src={video.thumbnail_url}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h3 className="text-lg font-semibold text-secondary">{video.title}</h3>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <a
                          href={video.video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 bg-secondary/10 text-secondary rounded-lg hover:bg-secondary/20 transition-colors"
                          title="Guarda video"
                        >
                          <Play className="h-4 w-4" />
                        </a>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/dashboard/admin/video-lessons/new?id=${video.id}`);
                          }}
                          className="p-2 bg-secondary/10 text-secondary rounded-lg hover:bg-secondary/20 transition-colors"
                          title="Modifica"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {video.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {video.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3">
                      <span className="px-3 py-1 rounded-md text-xs font-semibold bg-secondary/10 text-secondary">
                        {categories.find((c) => c.value === video.category)?.label}
                      </span>
                      <span className="px-3 py-1 rounded-md text-xs font-semibold bg-secondary/10 text-secondary">
                        {levels.find((l) => l.value === video.level)?.label}
                      </span>
                      {video.duration_minutes && (
                        <span className="text-xs text-gray-600 flex items-center gap-1">
                          <Video className="h-3.5 w-3.5" />
                          {video.duration_minutes} min
                        </span>
                      )}
                      {video.assigned_user && (
                        <span className="text-xs text-gray-600 flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {video.assigned_user.full_name}
                        </span>
                      )}
                      {video.watch_count > 0 && (
                        <span className="text-xs text-secondary font-medium flex items-center gap-1">
                          <Play className="h-3.5 w-3.5" />
                          {video.watch_count} visualizzazioni
                        </span>
                      )}
                      <span className="text-xs text-gray-500 flex items-center gap-1 ml-auto">
                        <Calendar className="h-3.5 w-3.5" />
                        {format(new Date(video.created_at), "dd MMM yyyy", { locale: it })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
