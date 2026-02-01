"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import {
  Video,
  Loader2,
  Search,
  Calendar,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface VideoLesson {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  category: string;
  level: string;
  duration_minutes: number | null;
  watched_at: string | null;
  watch_count: number;
  created_at: string;
  creator?: {
    full_name: string;
  };
}

export default function AtletaVideosPage() {
  const [videos, setVideos] = useState<VideoLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const categories = [
    { value: "generale", label: "Generale" },
    { value: "tecnica", label: "Tecnica" },
    { value: "tattica", label: "Tattica" },
    { value: "fitness", label: "Fitness" },
    { value: "mentale", label: "Mentale" },
  ];

  useEffect(() => {
    loadVideos();
  }, []);

  async function loadVideos() {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data: assignments } = await supabase
        .from("video_assignments")
        .select("video_id, watched_at, watch_count")
        .eq("user_id", user.id);

      if (!assignments || assignments.length === 0) {
        const { data: allVideos } = await supabase
          .from("video_lessons")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (allVideos) {
          const creatorIds = [...new Set(allVideos.map(v => v.created_by).filter(Boolean))];
          let creatorsMap = new Map();

          if (creatorIds.length > 0) {
            const { data: creatorsData } = await supabase
              .from("profiles")
              .select("id, full_name")
              .in("id", creatorIds);

            if (creatorsData) {
              creatorsMap = new Map(creatorsData.map(c => [c.id, c]));
            }
          }

          const enrichedVideos = allVideos.map(video => ({
            ...video,
            watched_at: null,
            watch_count: 0,
            creator: video.created_by ? creatorsMap.get(video.created_by) : null
          }));

          setVideos(enrichedVideos);
        }
        setLoading(false);
        return;
      }

      const videoIds = assignments.map(a => a.video_id);
      const { data: videosData } = (await supabase
        .from("video_lessons")
        .select("*")
        .in("id", videoIds)
        .eq("is_active", true)
        .order("created_at", { ascending: false })) as any;

      if (!videosData) {
        setVideos([]);
        setLoading(false);
        return;
      }

      const creatorIds = [...new Set(videosData.map(v => v.created_by).filter(Boolean))];
      let creatorsMap = new Map();

      if (creatorIds.length > 0) {
        const { data: creatorsData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", creatorIds);

        if (creatorsData) {
          creatorsMap = new Map(creatorsData.map(c => [c.id, c]));
        }
      }

      const assignmentsMap = new Map(assignments.map(a => [a.video_id, a]));
      const enrichedVideos = videosData.map((video: any) => {
        const assignment: any = assignmentsMap.get(video.id);
        return {
          ...video,
          watched_at: assignment?.watched_at || null,
          watch_count: assignment?.watch_count || 0,
          creator: video.created_by ? creatorsMap.get(video.created_by) : null
        };
      });

      setVideos(enrichedVideos);
    } catch (error) {
      console.error("Errore caricamento video:", error);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredVideos = videos.filter((video) => {
    const matchesSearch =
      !search ||
      video.title.toLowerCase().includes(search.toLowerCase()) ||
      video.description?.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-secondary" />
        <p className="mt-4 text-gray-600">Caricamento video...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div>
            <div className="text-xs font-semibold text-secondary/60 uppercase tracking-wider mb-1">
              LA TUA LIBRERIA
            </div>
            <h1 className="text-3xl font-bold text-secondary">Video Lezioni</h1>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Cerca per titolo, descrizione..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white pl-12 pr-4 py-3 text-secondary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
        />
      </div>

      {/* Videos List */}
      {filteredVideos.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Video className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nessun video trovato</h3>
          <p className="text-gray-600">
            {videos.length === 0
              ? "I tuoi maestri non hanno ancora condiviso video con te"
              : "Prova a modificare i filtri di ricerca"
            }
          </p>
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
                <div className="grid grid-cols-[160px_1fr_120px_100px_100px] items-center gap-4">
                  <div className="text-xs font-bold text-white/80 uppercase">Anteprima</div>
                  <div className="text-xs font-bold text-white/80 uppercase">Titolo</div>
                  <div className="text-xs font-bold text-white/80 uppercase text-center">Categoria</div>
                  <div className="text-xs font-bold text-white/80 uppercase text-center">Data</div>
                  <div className="text-xs font-bold text-white/80 uppercase text-center">Stato</div>
                </div>
              </div>

              {/* Data Rows */}
              {filteredVideos.map((video) => {
                const getYouTubeVideoId = (url: string) => {
                  const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
                  return match ? match[1] : null;
                };
                const videoId = getYouTubeVideoId(video.video_url);
                const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : video.thumbnail_url;

                return (
                  <Link
                    key={video.id}
                    href={`/dashboard/atleta/videos/${video.id}`}
                    className="block bg-white rounded-lg px-4 py-3 border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer border-l-4"
                    style={{ borderLeftColor: video.watched_at ? '#10b981' : '#08b3f7' }}
                  >
                    <div className="grid grid-cols-[160px_1fr_120px_100px_100px] items-center gap-4">
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
                            Nessuna descrizione
                          </p>
                        )}
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
                        {video.watched_at ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Completato
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                            <Clock className="h-3.5 w-3.5" />
                            Da vedere
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
