"use client";

import { useState, useEffect } from "react";
import { Play, Clock, Eye, ExternalLink, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { Card, Badge, LoadingScreen } from "@/components/ui";

interface VideoLesson {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  duration_minutes: number | null;
  category: string;
  level: string;
  watched_at: string | null;
  watch_count: number;
  created_at: string;
}

export default function MyVideoLessons() {
  const [videos, setVideos] = useState<VideoLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<VideoLesson | null>(null);

  useEffect(() => {
    loadVideos();
  }, []);

  async function loadVideos() {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      if (!token) return;

      const res = await fetch("/api/video-lessons", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (res.ok) {
        setVideos(data.videos || []);
      }
    } catch {
      // Error loading videos
    } finally {
      setLoading(false);
    }
  }

  async function markAsWatched(video: VideoLesson) {
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      await fetch(`/api/video-lessons?id=${video.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          watched_at: new Date().toISOString(),
          watch_count: video.watch_count + 1,
        }),
      });

      // Aggiorna lista locale
      setVideos(
        videos.map((v) =>
          v.id === video.id
            ? { ...v, watched_at: new Date().toISOString(), watch_count: v.watch_count + 1 }
            : v
        )
      );
    } catch {
      // Error updating watch status
    }
  }

  function openVideo(video: VideoLesson) {
    setSelectedVideo(video);
    markAsWatched(video);
    // Apri in nuova tab
    window.open(video.video_url, "_blank");
  }

  // Converti URL YouTube in embed
  function getEmbedUrl(url: string): string | null {
    const youtubeMatch = url.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/
    );
    if (youtubeMatch) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    }
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }
    return null;
  }

  if (loading) {
    return <LoadingScreen message="Caricamento video..." />;
  }

  if (videos.length === 0) {
    return (
      <Card variant="bordered" padding="lg">
        <div className="text-center text-muted py-8">
          <Play className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <h3 className="text-lg font-medium text-white mb-2">Nessun video assegnato</h3>
          <p className="text-sm">
            Non hai ancora video lezioni assegnate. Il tuo maestro ti assegnerà
            presto dei contenuti personalizzati!
          </p>
        </div>
      </Card>
    );
  }

  const unwatchedCount = videos.filter((v) => !v.watched_at).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">I Miei Video</h1>
        <p className="text-muted text-sm mt-1">
          {videos.length} video disponibili
          {unwatchedCount > 0 && (
            <span className="ml-2 text-accent">• {unwatchedCount} da vedere</span>
          )}
        </p>
      </div>

      {/* Video Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map((video) => {
          const embedUrl = getEmbedUrl(video.video_url);
          const isWatched = !!video.watched_at;

          return (
            <Card
              key={video.id}
              variant="default"
              hover
              padding="none"
              className={`cursor-pointer ${!isWatched ? "ring-2 ring-accent/30" : ""}`}
              onClick={() => openVideo(video)}
            >
              {/* Thumbnail / Embed */}
              <div className="relative aspect-video bg-white/5 rounded-t-xl overflow-hidden">
                {video.thumbnail_url ? (
                  <img
                    src={video.thumbnail_url}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                ) : embedUrl ? (
                  <iframe
                    src={embedUrl}
                    className="w-full h-full pointer-events-none"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/20 to-transparent">
                    <Play className="h-16 w-16 text-accent" />
                  </div>
                )}

                {/* Overlay */}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
                    <Play className="h-8 w-8 text-white fill-white" />
                  </div>
                </div>

                {/* Duration badge */}
                {video.duration_minutes && (
                  <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {video.duration_minutes} min
                  </div>
                )}

                {/* Watched badge */}
                {isWatched && (
                  <div className="absolute top-2 right-2 bg-green-500/90 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Visto
                  </div>
                )}

                {/* New badge */}
                {!isWatched && (
                  <div className="absolute top-2 left-2 bg-accent text-background text-xs font-bold px-2 py-1 rounded">
                    NUOVO
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4 space-y-3">
                <h3 className="font-semibold text-white line-clamp-2">{video.title}</h3>

                {video.description && (
                  <p className="text-sm text-muted line-clamp-2">{video.description}</p>
                )}

                <div className="flex flex-wrap gap-2">
                  <Badge variant="info" size="sm">
                    {video.category}
                  </Badge>
                  <Badge variant="default" size="sm">
                    {video.level}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-xs text-muted pt-2 border-t border-border">
                  <div className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    <span>Visto {video.watch_count} volte</span>
                  </div>
                  <div className="flex items-center gap-1 text-accent">
                    <ExternalLink className="h-3 w-3" />
                    <span>Apri</span>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
