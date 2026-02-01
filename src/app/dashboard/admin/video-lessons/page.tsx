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
      const { data, error } = await supabase
        .from("video_lessons")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Load user data separately
      if (data && data.length > 0) {
        // Load assignments with user profiles
        const { data: assignments } = await supabase
          .from("video_assignments")
          .select("video_id, user_id")
          .in("video_id", data.map((v) => v.id));

        // Get unique user IDs from assignments
        const assignedUserIds = [...new Set(assignments?.map((a) => a.user_id).filter(Boolean) || [])];

        // Load all user profiles (both creators and assigned users)
        const creatorIds = [...new Set(data.map((v) => v.created_by).filter(Boolean))];
        const allUserIds = [...new Set([...creatorIds, ...assignedUserIds])];

        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", allUserIds);

        const videosWithUsers = data.map((video) => ({
          ...video,
          assigned_users: assignments
            ?.filter((a: any) => a.video_id === video.id)
            .map((a: any) => profiles?.find((p) => p.id === a.user_id))
            .filter(Boolean) || [],
          creator: video.created_by
            ? profiles?.find((p) => p.id === video.created_by)
            : null,
        }));

        setVideos(videosWithUsers);
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
      video.assigned_users?.some((u) => u.full_name?.toLowerCase().includes(search.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <AuthGuard allowedRoles={["admin", "gestore"]}>
      <div className="space-y-6">{/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
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
            className="sm:px-6 sm:py-3 px-4 py-3 bg-secondary hover:opacity-90 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2 sm:flex-shrink-0"
          >
            <Plus className="h-5 w-5" />
            <span>Nuovo Video</span>
          </Link>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Cerca per titolo, descrizione o utente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white pl-12 pr-4 py-3 text-secondary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
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
          <div className="bg-white rounded-lg">
            <div className="overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <style>{`
                .scrollbar-hide::-webkit-scrollbar {
                  display: none;
                }
              `}</style>
              <div className="space-y-3" style={{ minWidth: '900px' }}>
                {/* Header Row */}
                <div className="bg-secondary rounded-lg px-5 py-3 mb-3 border border-secondary">
                  <div className="grid grid-cols-[160px_1fr_100px_80px_100px_100px] items-center gap-4">
                    <div className="text-xs font-bold text-white/80 uppercase">Anteprima</div>
                    <div className="text-xs font-bold text-white/80 uppercase">Titolo</div>
                    <div className="text-xs font-bold text-white/80 uppercase text-center">Visibilità</div>
                    <div className="text-xs font-bold text-white/80 uppercase text-center">Categoria</div>
                    <div className="text-xs font-bold text-white/80 uppercase text-center">Data</div>
                    <div className="text-xs font-bold text-white/80 uppercase text-center">Stato</div>
                  </div>
                </div>

                {/* Data Rows */}
                {filteredVideos.map((video) => {
                  // Estrae l'ID del video YouTube dall'URL
                  const getYouTubeVideoId = (url: string) => {
                    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
                    return match ? match[1] : null;
                  };
                  const videoId = getYouTubeVideoId(video.video_url);
                  const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : video.thumbnail_url;

                  return (
                    <div
                      key={video.id}
                      onClick={() => router.push(`/dashboard/admin/video-lessons/${video.id}`)}
                      className="bg-white rounded-lg px-4 py-3 border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer border-l-4"
                      style={{ borderLeftColor: video.is_active ? '#08b3f7' : '#056c94' }}
                    >
                      <div className="grid grid-cols-[160px_1fr_100px_80px_100px_100px] items-center gap-4">
                        {/* Thumbnail */}
                        <div className="relative w-[140px] h-[80px] rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                          {thumbnailUrl ? (
                            <img
                              src={thumbnailUrl}
                              alt={video.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-secondary/5">
                              <Video className="w-8 h-8 text-secondary/20" />
                            </div>
                          )}
                          {video.duration_minutes && (
                            <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
                              {video.duration_minutes}:00
                            </div>
                          )}
                        </div>

                        {/* Title & Description */}
                        <div className="min-w-0">
                          <h3 className="font-bold text-secondary text-sm line-clamp-1 mb-1">
                            {video.title}
                          </h3>
                          {video.description ? (
                            <p className="text-xs text-secondary/60 line-clamp-1">
                              {video.description}
                            </p>
                          ) : (
                            <p className="text-xs text-secondary/40 italic">
                              Aggiungi descrizione
                            </p>
                          )}
                        </div>

                        {/* Visibility */}
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 text-xs text-secondary/60">
                            {video.assigned_users && video.assigned_users.length > 0 ? (
                              <>
                                <Users className="h-3.5 w-3.5" />
                                <span>{video.assigned_users.length} utenti</span>
                              </>
                            ) : (
                              <span>Non in elenco</span>
                            )}
                          </div>
                        </div>

                        {/* Category */}
                        <div className="text-center">
                          <span className="text-xs font-medium text-secondary">
                            {categories.find((c) => c.value === video.category)?.label || "Nessuna"}
                          </span>
                        </div>

                        {/* Date */}
                        <div className="text-center">
                          <span className="text-xs font-medium text-secondary">
                            {format(new Date(video.created_at), "d MMM yyyy", { locale: it })}
                          </span>
                        </div>

                        {/* Status */}
                        <div className="text-center">
                          <span className={`text-xs font-medium ${video.is_active ? 'text-[#08b3f7]' : 'text-[#056c94]'}`}>
                            {video.is_active ? 'Caricato' : 'Bozza'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
