"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  Video,
  Play,
  Calendar,
  User,
  ExternalLink,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  Clock,
  Eye,
} from "lucide-react";

interface VideoLesson {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  category: string;
  level: string;
  watched_at: string | null;
  watch_count: number;
  created_at: string;
  creator?: {
    full_name: string;
  };
}

export default function VideosPage() {
  const [videos, setVideos] = useState<VideoLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  useEffect(() => {
    loadVideos();
  }, []);

  async function loadVideos() {
    console.log("🔍 Caricamento video atleta...");
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log("❌ Nessun utente loggato");
      setLoading(false);
      return;
    }

    console.log("👤 User ID:", user.id);

    try {
      // Carica tutti i video disponibili
      const { data: videosData } = await supabase
        .from("video_lessons")
        .select("*")
        .order("created_at", { ascending: false });

      console.log("✅ Video caricati:", videosData?.length || 0);

      if (!videosData || videosData.length === 0) {
        console.log("⚠️ Nessun video trovato");
        setVideos([]);
        setLoading(false);
        return;
      }

      // Aggiungi i dati del creator se necessario
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

      // Combina i dati
      const enrichedVideos = videosData.map(video => ({
        ...video,
        watched_at: null,
        watch_count: 0,
        creator: video.created_by ? creatorsMap.get(video.created_by) : null
      }));

      console.log("📹 Video con dati creator:", enrichedVideos);
      setVideos(enrichedVideos);
    } catch (error) {
      console.error("❌ Errore generale:", error);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }

  async function markAsWatched(videoId: string) {
    try {
      await fetch(`/api/video-lessons/${videoId}/watch`, {
        method: "POST",
      });
      loadVideos();
    } catch {}
  }

  const filteredVideos = videos.filter((video) => {
    const matchesSearch = video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || video.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(videos.map((v) => v.category).filter(Boolean))];

  const stats = {
    total: videos.length,
    watched: videos.filter(v => v.watched_at).length,
    notWatched: videos.filter(v => !v.watched_at).length,
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("it-IT", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getYouTubeId = (url: string) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
    return match ? match[1] : null;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-24 bg-gray-200 rounded-xl animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />
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
          <h1 className="text-3xl font-bold text-secondary mb-2">
            Video
          </h1>
          <p className="text-secondary/70 font-medium">
            Video di allenamento e tecnica
          </p>
        </div>
        <button
          onClick={() => loadVideos()}
          className="p-2.5 text-secondary/70 bg-white rounded-md hover:bg-secondary hover:text-white transition-all"
          title="Ricarica"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cerca video..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-secondary/20 focus:border-secondary text-gray-900"
            />
          </div>
          
          {categories.length > 0 && (
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-600" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-secondary/20 focus:border-secondary text-gray-900 bg-white"
              >
                <option value="all">Tutte le categorie</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Videos Grid */}
      {filteredVideos.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Video className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            {videos.length === 0 ? "Nessun video assegnato" : "Nessun risultato"}
          </h3>
          <p className="text-gray-600">
            {videos.length === 0
              ? "I tuoi maestri non hanno ancora condiviso video con te"
              : "Prova a modificare i filtri di ricerca"
            }
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVideos.map((video) => {
            const youtubeId = getYouTubeId(video.video_url);
            const thumbnailUrl = video.thumbnail_url || 
              (youtubeId ? `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg` : null);

            return (
              <div
                key={video.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-gray-300 transition-all"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video bg-gray-100">
                  {thumbnailUrl ? (
                    <img
                      src={thumbnailUrl}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Video className="h-12 w-12 text-gray-300" />
                    </div>
                  )}
                  
                  <a
                    href={video.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => markAsWatched(video.id)}
                    className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity group"
                  >
                    <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Play className="h-8 w-8 text-secondary ml-1" />
                    </div>
                  </a>

                  {video.watched_at && (
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-lg">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Visto
                    </div>
                  )}

                  {video.watch_count > 0 && (
                    <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1 bg-black/70 text-white text-xs font-medium rounded-lg">
                      <Eye className="h-3 w-3" />
                      {video.watch_count}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-5">
                  <h3 className="font-bold text-gray-900 mb-2 line-clamp-2 text-lg">
                    {video.title}
                  </h3>
                  
                  {video.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {video.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                    {video.creator && (
                      <span className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5" />
                        {video.creator.full_name}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(video.created_at)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    {video.category && (
                      <span className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-md bg-purple-50 text-purple-700">
                        {video.category}
                      </span>
                    )}

                    <a
                      href={video.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => markAsWatched(video.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-secondary bg-secondary/10 rounded-lg hover:bg-secondary/20 transition-all"
                    >
                      Guarda
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
