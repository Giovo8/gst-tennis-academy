"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import {
  Video,
  Calendar,
  User,
  Clock,
  Eye,
  CheckCircle2,
  ArrowLeft,
  ExternalLink,
  BookOpen,
  Target,
  Loader2,
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

export default function VideoPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = params.id as string;

  const [video, setVideo] = useState<VideoLesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const categories = [
    { value: "generale", label: "Generale" },
    { value: "tecnica", label: "Tecnica" },
    { value: "tattica", label: "Tattica" },
    { value: "fitness", label: "Fitness" },
    { value: "mentale", label: "Mentale" },
  ];

  const levels = [
    { value: "tutti", label: "Tutti i livelli" },
    { value: "principiante", label: "Principiante" },
    { value: "intermedio", label: "Intermedio" },
    { value: "avanzato", label: "Avanzato" },
  ];

  useEffect(() => {
    if (videoId) {
      loadVideo();
    }
  }, [videoId]);

  async function loadVideo() {
    setLoading(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Devi essere autenticato per visualizzare questo video");
      setLoading(false);
      return;
    }

    try {
      // Carica il video
      const { data: videoData, error: videoError } = await supabase
        .from("video_lessons")
        .select("*")
        .eq("id", videoId)
        .eq("is_active", true)
        .single();

      if (videoError || !videoData) {
        setError("Video non trovato");
        setLoading(false);
        return;
      }

      // Carica il creator
      let creator = null;
      if (videoData.created_by) {
        const { data: creatorData } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", videoData.created_by)
          .single();
        creator = creatorData;
      }

      // Carica l'assegnazione per questo utente
      const { data: assignment } = await supabase
        .from("video_assignments")
        .select("watched_at, watch_count")
        .eq("video_id", videoId)
        .eq("user_id", user.id)
        .single();

      const enrichedVideo: VideoLesson = {
        ...videoData,
        watched_at: assignment?.watched_at || null,
        watch_count: assignment?.watch_count || 0,
        creator: creator,
      };

      setVideo(enrichedVideo);

      // Registra la visualizzazione
      await markAsWatched(user.id, assignment);
    } catch (err) {
      console.error("Errore caricamento video:", err);
      setError("Errore nel caricamento del video");
    } finally {
      setLoading(false);
    }
  }

  async function markAsWatched(userId: string, existingAssignment: any) {
    try {
      if (existingAssignment) {
        // Aggiorna l'assegnazione esistente
        await supabase
          .from("video_assignments")
          .update({
            watched_at: new Date().toISOString(),
            watch_count: (existingAssignment.watch_count || 0) + 1
          })
          .eq("video_id", videoId)
          .eq("user_id", userId);

        // Aggiorna lo stato locale
        setVideo(prev => prev ? {
          ...prev,
          watched_at: new Date().toISOString(),
          watch_count: (prev.watch_count || 0) + 1
        } : null);
      }
    } catch (error) {
      console.error("Errore aggiornamento visualizzazione:", error);
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("it-IT", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Estrai l'ID del video da vari formati URL
  const getVideoEmbed = (url: string) => {
    // YouTube
    const youtubeMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    if (youtubeMatch) {
      return {
        type: 'youtube',
        id: youtubeMatch[1],
        embedUrl: `https://www.youtube.com/embed/${youtubeMatch[1]}?rel=0&modestbranding=1`
      };
    }

    // Vimeo
    const vimeoMatch = url.match(/(?:vimeo\.com\/)(\d+)/);
    if (vimeoMatch) {
      return {
        type: 'vimeo',
        id: vimeoMatch[1],
        embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`
      };
    }

    // File video diretto (mp4, webm, etc.)
    if (url.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i)) {
      return {
        type: 'direct',
        id: null,
        embedUrl: url
      };
    }

    // URL generico
    return {
      type: 'unknown',
      id: null,
      embedUrl: url
    };
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-secondary" />
        <p className="mt-4 text-gray-600">Caricamento video...</p>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="space-y-6">
        <Link
          href="/dashboard/atleta/videos"
          className="inline-flex items-center gap-2 text-secondary hover:opacity-80 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Torna ai video
        </Link>

        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Video className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            {error || "Video non trovato"}
          </h3>
          <p className="text-gray-600 mb-6">
            Il video richiesto non è disponibile o non hai accesso
          </p>
          <Link
            href="/dashboard/atleta/videos"
            className="inline-flex items-center gap-2 px-6 py-3 bg-secondary hover:opacity-90 text-white font-medium rounded-lg transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            Torna ai video
          </Link>
        </div>
      </div>
    );
  }

  const embed = getVideoEmbed(video.video_url);

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        href="/dashboard/atleta/videos"
        className="inline-flex items-center gap-2 text-secondary hover:opacity-80 transition-colors font-medium"
      >
        <ArrowLeft className="h-4 w-4" />
        Torna ai video
      </Link>

      {/* Video Player */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-lg">
        <div className="aspect-video bg-black">
          {embed.type === 'youtube' || embed.type === 'vimeo' ? (
            <iframe
              src={embed.embedUrl}
              title={video.title}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : embed.type === 'direct' ? (
            <video
              src={embed.embedUrl}
              controls
              className="w-full h-full"
            >
              Il tuo browser non supporta la riproduzione video.
            </video>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-white bg-gray-900">
              <Video className="h-16 w-16 mb-4 opacity-50" />
              <p className="text-lg mb-4">Formato video non supportato per la riproduzione inline</p>
              <a
                href={video.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-secondary hover:opacity-90 text-white font-medium rounded-lg transition-all"
              >
                <ExternalLink className="h-4 w-4" />
                Apri in nuova scheda
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Video Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {/* Badges */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {video.category && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg bg-secondary/10 text-secondary">
              <BookOpen className="h-4 w-4" />
              {categories.find(c => c.value === video.category)?.label || video.category}
            </span>
          )}
          {video.level && video.level !== 'tutti' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-100 text-gray-700">
              <Target className="h-4 w-4" />
              {levels.find(l => l.value === video.level)?.label || video.level}
            </span>
          )}
          {video.watched_at && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Già visto
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {video.title}
        </h1>

        {/* Description */}
        {video.description && (
          <p className="text-gray-600 mb-6 whitespace-pre-wrap">
            {video.description}
          </p>
        )}

        {/* Meta Info */}
        <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-gray-200">
          {video.creator && (
            <div className="flex items-center gap-2 text-gray-600">
              <div className="p-2 bg-gray-100 rounded-lg">
                <User className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Creato da</p>
                <p className="font-medium text-gray-900">{video.creator.full_name}</p>
              </div>
            </div>
          )}

          {video.duration_minutes && (
            <div className="flex items-center gap-2 text-gray-600">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Durata</p>
                <p className="font-medium text-gray-900">{video.duration_minutes} minuti</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 text-gray-600">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Pubblicato il</p>
              <p className="font-medium text-gray-900">{formatDate(video.created_at)}</p>
            </div>
          </div>

          {video.watch_count > 0 && (
            <div className="flex items-center gap-2 text-gray-600">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Eye className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Visualizzazioni</p>
                <p className="font-medium text-gray-900">{video.watch_count} {video.watch_count === 1 ? 'volta' : 'volte'}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* External Link Button */}
      {(embed.type === 'youtube' || embed.type === 'vimeo') && (
        <div className="flex justify-center">
          <a
            href={video.video_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all"
          >
            <ExternalLink className="h-4 w-4" />
            Apri su {embed.type === 'youtube' ? 'YouTube' : 'Vimeo'}
          </a>
        </div>
      )}
    </div>
  );
}
