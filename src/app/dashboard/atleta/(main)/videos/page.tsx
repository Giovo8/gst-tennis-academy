"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import {
  Video,
  Play,
  Calendar,
  User,
  ExternalLink,
  Search,
  Filter,
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

export default function AthleteVideosPage() {
  const [videos, setVideos] = useState<VideoLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  useEffect(() => {
    loadVideos();
  }, []);

  async function loadVideos() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const response = await fetch(`/api/video-lessons?assigned_to=${user.id}`);
      const data = await response.json();
      setVideos(data.videos || []);
    } catch (error) {
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
        <div className="h-10 skeleton rounded-lg w-48" />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 skeleton rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">I Miei Video</h1>
        <p className="text-[var(--foreground-muted)] mt-1">
          Video di allenamento assegnati dai tuoi maestri
        </p>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--foreground-subtle)]" />
          <input
            type="text"
            placeholder="Cerca video..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
          />
        </div>
        
        {categories.length > 0 && (
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--foreground-subtle)]" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="pl-10 pr-8 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 appearance-none"
            >
              <option value="all">Tutte le categorie</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Videos Grid */}
      {filteredVideos.length === 0 ? (
        <div className="text-center py-16 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
          <Video className="h-16 w-16 text-[var(--foreground-subtle)] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
            {videos.length === 0 ? "Nessun video assegnato" : "Nessun risultato"}
          </h3>
          <p className="text-[var(--foreground-muted)]">
            {videos.length === 0
              ? "I tuoi maestri non hanno ancora condiviso video con te"
              : "Prova a modificare i filtri di ricerca"
            }
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVideos.map((video) => {
            const youtubeId = getYouTubeId(video.video_url);
            const thumbnailUrl = video.thumbnail_url || 
              (youtubeId ? `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg` : null);

            return (
              <div
                key={video.id}
                className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video bg-[var(--background-muted)]">
                  {thumbnailUrl ? (
                    <img
                      src={thumbnailUrl}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Video className="h-12 w-12 text-[var(--foreground-subtle)]" />
                    </div>
                  )}
                  
                  <a
                    href={video.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => markAsWatched(video.id)}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity"
                  >
                    <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                      <Play className="h-8 w-8 text-[var(--primary)] ml-1" />
                    </div>
                  </a>

                  {video.watched_at && (
                    <span className="absolute top-2 right-2 px-2 py-1 bg-green-500 text-white text-xs font-medium rounded">
                      Visto
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-semibold text-[var(--foreground)] mb-1 line-clamp-1">
                    {video.title}
                  </h3>
                  
                  {video.description && (
                    <p className="text-sm text-[var(--foreground-muted)] mb-3 line-clamp-2">
                      {video.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-[var(--foreground-subtle)]">
                    <div className="flex items-center gap-3">
                      {video.creator && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {video.creator.full_name}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(video.created_at)}
                      </span>
                    </div>

                    <a
                      href={video.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => markAsWatched(video.id)}
                      className="text-[var(--primary)] hover:underline flex items-center gap-1"
                    >
                      Apri <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>

                  {video.category && (
                    <span className="inline-block mt-3 px-2 py-1 text-xs font-medium rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
                      {video.category}
                    </span>
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
