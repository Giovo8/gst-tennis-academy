"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import {
  Video,
  Play,
  Calendar,
  Clock,
  CheckCircle2,
  ArrowLeft,
  Loader2,
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
  is_active?: boolean;
  watched_at: string | null;
  watch_count: number;
  created_at: string;
  creator?: {
    full_name: string;
  };
}

export default function VideoPlayerPage() {
  const params = useParams();
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

  const formatDateLong = (dateString: string) => {
    try {
      return format(new Date(dateString), "d MMMM yyyy", { locale: it })
        .replace(/^([a-z])/, (c) => c.toUpperCase())
        .replace(/\s([a-z])/g, (c) => " " + c.toUpperCase());
    } catch {
      return dateString;
    }
  };

  const getYouTubeVideoId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : null;
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

  const youtubeId = getYouTubeVideoId(video.video_url);

  return (
    <div className="space-y-6">
      {/* Video Player */}
      <div className="bg-black rounded-xl overflow-hidden aspect-video mt-2">
        {youtubeId ? (
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}`}
            title={video.title}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-secondary/10">
            <p className="text-secondary/60">Video non disponibile</p>
          </div>
        )}
      </div>

      {/* Header con titolo video */}
      <div
        className="bg-secondary rounded-xl border-t border-r border-b border-secondary p-6 border-l-4"
        style={{ borderLeftColor: video.watched_at ? '#10b981' : '#08b3f7' }}
      >
        <div className="flex items-start gap-6">
          <Play className="h-8 w-8 text-white flex-shrink-0" strokeWidth={2.5} />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">{video.title}</h1>
          </div>
        </div>
      </div>

      {/* Video Info & Details */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-secondary mb-6">Informazioni e Dettagli</h2>

        <div className="space-y-6">
          {/* Visualizzazioni */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
            <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Visualizzazioni</label>
            <div className="flex-1">
              <p className="text-secondary font-semibold">{video.watch_count}</p>
            </div>
          </div>

          {/* Data di creazione */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
            <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Data Creazione</label>
            <div className="flex-1">
              <p className="text-secondary font-semibold">{formatDateLong(video.created_at)}</p>
            </div>
          </div>

          {/* Durata */}
          {video.duration_minutes && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Durata</label>
              <div className="flex-1">
                <p className="text-secondary font-semibold flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {video.duration_minutes} minuti
                </p>
              </div>
            </div>
          )}

          {/* Categoria */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
            <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Categoria</label>
            <div className="flex-1">
              <p className="text-secondary font-semibold">
                {categories.find((c) => c.value === video.category)?.label || video.category}
              </p>
            </div>
          </div>

          {/* Livello */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
            <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Livello</label>
            <div className="flex-1">
              <p className="text-secondary font-semibold">
                {levels.find((l) => l.value === video.level)?.label || video.level}
              </p>
            </div>
          </div>

          {/* Stato */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
            <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Stato</label>
            <div className="flex-1">
              <p className={`font-semibold ${video.watched_at ? 'text-emerald-600' : 'text-amber-600'}`}>
                {video.watched_at ? "Completato" : "Da vedere"}
              </p>
            </div>
          </div>

          {/* Creator */}
          {video.creator && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Creato da</label>
              <div className="flex-1">
                <p className="text-secondary font-semibold">{video.creator.full_name}</p>
              </div>
            </div>
          )}

          {/* Descrizione */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8">
            <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Descrizione</label>
            <div className="flex-1">
              {video.description ? (
                <p className="text-secondary/80 whitespace-pre-wrap">{video.description}</p>
              ) : (
                <p className="text-secondary/40 italic">Nessuna descrizione disponibile</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
