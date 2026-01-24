"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import {
  Video,
  Play,
  User,
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  Eye,
  Filter,
  TrendingUp,
} from "lucide-react";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const categories = [
    { value: "generale", label: "Generale", color: "bg-blue-500" },
    { value: "tecnica", label: "Tecnica", color: "bg-emerald-500" },
    { value: "tattica", label: "Tattica", color: "bg-purple-500" },
    { value: "fitness", label: "Fitness", color: "bg-orange-500" },
    { value: "mentale", label: "Mentale", color: "bg-pink-500" },
  ];

  const levels = [
    { value: "tutti", label: "Tutti i livelli" },
    { value: "principiante", label: "Principiante" },
    { value: "intermedio", label: "Intermedio" },
    { value: "avanzato", label: "Avanzato" },
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
      const { data: videosData } = await supabase
        .from("video_lessons")
        .select("*")
        .in("id", videoIds)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

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
      const enrichedVideos = videosData.map(video => {
        const assignment = assignmentsMap.get(video.id);
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
    const matchesSearch = video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || video.category === categoryFilter;
    const matchesLevel = levelFilter === "all" || video.level === levelFilter;
    const matchesStatus = statusFilter === "all" ||
      (statusFilter === "watched" && video.watched_at) ||
      (statusFilter === "unwatched" && !video.watched_at);
    return matchesSearch && matchesCategory && matchesLevel && matchesStatus;
  });

  const uniqueCategories = [...new Set(videos.map((v) => v.category).filter(Boolean))];
  const uniqueLevels = [...new Set(videos.map((v) => v.level).filter(Boolean))];

  const stats = {
    total: videos.length,
    watched: videos.filter(v => v.watched_at).length,
    notWatched: videos.filter(v => !v.watched_at).length,
    totalMinutes: videos.reduce((acc, v) => acc + (v.duration_minutes || 0), 0),
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Oggi";
    if (diffDays === 1) return "Ieri";
    if (diffDays < 7) return `${diffDays} giorni fa`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} settimane fa`;

    return date.toLocaleDateString("it-IT", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getYouTubeThumbnail = (url: string) => {
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg` : null;
  };

  const getCategoryColor = (category: string) => {
    return categories.find(c => c.value === category)?.color || "bg-gray-500";
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}:00`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}:00`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-24 bg-gray-200 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-14 bg-gray-200 rounded-xl animate-pulse" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-secondary/60 uppercase tracking-wider mb-1">
            LA TUA LIBRERIA
          </div>
          <h1 className="text-3xl font-bold text-secondary mb-2">
            Video Lezioni
          </h1>
          <p className="text-secondary/70 font-medium">
            Contenuti formativi selezionati per il tuo percorso
          </p>
        </div>
        <button
          onClick={() => loadVideos()}
          className="p-2.5 text-secondary/70 bg-white border border-gray-200 rounded-lg hover:bg-secondary hover:text-white hover:border-secondary transition-all"
          title="Ricarica"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 border border-gray-200 hover:border-secondary/30 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-secondary/10 rounded-lg">
              <Video className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500">Video</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 hover:border-emerald-300 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{stats.watched}</p>
              <p className="text-xs text-gray-500">Completati</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 hover:border-amber-300 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{stats.notWatched}</p>
              <p className="text-xs text-gray-500">Da vedere</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 hover:border-purple-300 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{stats.totalMinutes}</p>
              <p className="text-xs text-gray-500">Minuti totali</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters Bar */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Search Row */}
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Cerca video..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-full focus:ring-2 focus:ring-secondary/20 focus:border-secondary text-gray-900 bg-gray-50 hover:bg-white transition-colors"
            />
          </div>
        </div>

        {/* Filter Pills Row */}
        <div className="p-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-gray-500">
            <Filter className="h-4 w-4" />
            <span className="text-sm font-medium">Filtri:</span>
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-2">
            {[
              { value: "all", label: "Tutti" },
              { value: "unwatched", label: "Da vedere" },
              { value: "watched", label: "Completati" },
            ].map((status) => (
              <button
                key={status.value}
                onClick={() => setStatusFilter(status.value)}
                className={`px-3 py-1.5 text-sm font-medium rounded-full transition-all ${
                  statusFilter === status.value
                    ? "bg-secondary text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {status.label}
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-gray-200 hidden sm:block" />

          {/* Category Filter */}
          {uniqueCategories.length > 0 && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-full focus:ring-2 focus:ring-secondary/20 focus:border-secondary text-gray-700 bg-white text-sm cursor-pointer hover:border-gray-300 transition-colors"
            >
              <option value="all">Tutte le categorie</option>
              {uniqueCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {categories.find(c => c.value === cat)?.label || cat}
                </option>
              ))}
            </select>
          )}

          {/* Level Filter */}
          {uniqueLevels.length > 0 && (
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-full focus:ring-2 focus:ring-secondary/20 focus:border-secondary text-gray-700 bg-white text-sm cursor-pointer hover:border-gray-300 transition-colors"
            >
              <option value="all">Tutti i livelli</option>
              {uniqueLevels.map((level) => (
                <option key={level} value={level}>
                  {levels.find(l => l.value === level)?.label || level}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Results Count */}
      {(searchQuery || categoryFilter !== "all" || levelFilter !== "all" || statusFilter !== "all") && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            {filteredVideos.length} video trovati
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setCategoryFilter("all");
              setLevelFilter("all");
              setStatusFilter("all");
            }}
            className="text-sm text-secondary hover:underline"
          >
            Rimuovi filtri
          </button>
        </div>
      )}

      {/* Videos List */}
      {filteredVideos.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Video className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            {videos.length === 0 ? "Nessun video disponibile" : "Nessun risultato"}
          </h3>
          <p className="text-gray-600">
            {videos.length === 0
              ? "I tuoi maestri non hanno ancora condiviso video con te"
              : "Prova a modificare i filtri di ricerca"
            }
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredVideos.map((video) => {
            const thumbnailUrl = video.thumbnail_url || getYouTubeThumbnail(video.video_url);
            const categoryColor = getCategoryColor(video.category);

            return (
              <Link
                key={video.id}
                href={`/dashboard/atleta/videos/${video.id}`}
                className="flex gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:border-secondary/30 hover:shadow-lg transition-all group"
              >
                {/* Thumbnail */}
                <div className="relative flex-shrink-0 w-44 sm:w-64 aspect-video rounded-xl overflow-hidden bg-gray-100">
                  {thumbnailUrl ? (
                    <img
                      src={thumbnailUrl}
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-secondary/10 to-secondary/30">
                      <Video className="h-10 w-10 text-secondary/40" />
                    </div>
                  )}

                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors duration-300">
                    <div className="w-14 h-14 rounded-full bg-secondary/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-75 group-hover:scale-100 shadow-xl">
                      <Play className="h-6 w-6 text-white ml-0.5" fill="white" />
                    </div>
                  </div>

                  {/* Duration Badge */}
                  {video.duration_minutes && (
                    <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 text-white text-xs font-semibold rounded-md">
                      {formatDuration(video.duration_minutes)}
                    </div>
                  )}

                  {/* Watched Badge */}
                  {video.watched_at && (
                    <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 bg-emerald-500 text-white text-xs font-semibold rounded-md shadow-lg">
                      <CheckCircle2 className="h-3 w-3" />
                      Visto
                    </div>
                  )}

                  {/* Category Color Bar */}
                  <div className={`absolute bottom-0 left-0 right-0 h-1 ${categoryColor}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 py-1 flex flex-col">
                  {/* Title */}
                  <h3 className="font-bold text-gray-900 text-lg line-clamp-2 group-hover:text-secondary transition-colors mb-2">
                    {video.title}
                  </h3>

                  {/* Description */}
                  {video.description && (
                    <p className="text-sm text-gray-500 line-clamp-2 mb-3 hidden sm:block">
                      {video.description}
                    </p>
                  )}

                  {/* Meta info */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mt-auto">
                    {video.creator && (
                      <span className="flex items-center gap-1.5">
                        <User className="h-4 w-4" />
                        {video.creator.full_name}
                      </span>
                    )}
                    <span>{formatDate(video.created_at)}</span>
                    {video.watch_count > 0 && (
                      <span className="flex items-center gap-1.5">
                        <Eye className="h-4 w-4" />
                        {video.watch_count} visualizzazioni
                      </span>
                    )}
                  </div>

                  {/* Tags */}
                  <div className="flex items-center gap-2 mt-3">
                    <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-lg text-white ${categoryColor}`}>
                      {categories.find(c => c.value === video.category)?.label || video.category}
                    </span>
                    {video.level && video.level !== 'tutti' && (
                      <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-lg bg-gray-100 text-gray-600">
                        {levels.find(l => l.value === video.level)?.label || video.level}
                      </span>
                    )}
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
