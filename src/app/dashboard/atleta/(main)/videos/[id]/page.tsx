"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useParams, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import {
  Video,
  Play,
  Clock,
  Loader2,
  ArrowLeft,
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
  created_by?: string | null;
  is_active?: boolean;
  watched_at: string | null;
  watch_count: number;
  created_at: string;
  creator?: {
    full_name: string;
  };
  assigned_users?: { id: string; full_name: string; email: string; phone?: string }[];
}

export default function VideoPlayerPage() {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const dashboardBase = pathname.split("/videos")[0];
  const isMaestroView = pathname.startsWith("/dashboard/maestro");
  const videoId = params.id as string;

  const [video, setVideo] = useState<VideoLesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

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
    setCurrentUserId(user.id);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (sessionError || !token) {
        throw new Error("Sessione non valida. Effettua nuovamente il login.");
      }

      const response = await fetch(`/api/video-lessons?id=${encodeURIComponent(videoId)}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.video) {
        setError(payload?.error || "Video non trovato");
        setLoading(false);
        return;
      }

      const videoData = payload.video;

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

      // Carica l'assegnazione per questo utente (best effort per update watch count)
      const { data: assignment } = await supabase
        .from("video_assignments")
        .select("watched_at, watch_count")
        .eq("video_id", videoId)
        .eq("user_id", user.id)
        .single();

      let assignedUsers: { id: string; full_name: string; email: string; phone?: string }[] = [];
      if (isMaestroView && videoData.created_by === user.id) {
        const { data: allAssignments } = await supabase
          .from("video_assignments")
          .select("user_id")
          .eq("video_id", videoId);

        if (allAssignments && allAssignments.length > 0) {
          const userIds = allAssignments.map((a) => a.user_id);
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name, email, phone")
            .in("id", userIds);

          assignedUsers = profiles || [];
        }
      }

      const enrichedVideo: VideoLesson = {
        ...videoData,
        watched_at: videoData.watched_at || assignment?.watched_at || null,
        watch_count: videoData.watch_count || assignment?.watch_count || 0,
        creator: creator,
        assigned_users: assignedUsers,
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

  async function handleDelete() {
    if (!video) return;
    if (!confirm(`Sei sicuro di voler eliminare "${video.title}"?`)) {
      return;
    }

    setDeleting(true);
    try {
      const { error: deleteError } = await supabase
        .from("video_lessons")
        .delete()
        .eq("id", videoId);

      if (deleteError) throw deleteError;

      alert("Video eliminato con successo!");
      router.push(`${dashboardBase}/videos`);
    } catch (deleteErr: any) {
      const dbErrorCode = deleteErr?.code;
      const baseMessage = deleteErr?.message || "Errore durante l'eliminazione";
      if (dbErrorCode === "42501") {
        alert(`${baseMessage}. Verifica che sia applicata la migration 039_allow_maestro_delete_own_video_lessons.sql.`);
      } else {
        alert(baseMessage);
      }
    } finally {
      setDeleting(false);
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
          href={`${dashboardBase}/videos`}
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
            href={`${dashboardBase}/videos`}
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
  const canManageMaestroVideo = isMaestroView && video.created_by === currentUserId;

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
      <div className="bg-secondary rounded-xl border border-secondary p-6">
        <div className="flex items-start gap-6">
          <Play className="h-8 w-8 text-white flex-shrink-0" strokeWidth={2.5} />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">{video.title}</h1>
          </div>
        </div>
      </div>

      {/* Video Info & Details */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
          <h2 className="text-base sm:text-lg font-semibold text-secondary">Informazioni e Dettagli</h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
            <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Descrizione</label>
            <div className="flex-1">
              {video.description ? (
                <p className="text-secondary/80 whitespace-pre-wrap">{video.description}</p>
              ) : (
                <p className="text-secondary/40 italic">Nessuna descrizione disponibile</p>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
            <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Data Creazione</label>
            <div className="flex-1">
              <p className="text-secondary font-semibold">{formatDateLong(video.created_at)}</p>
            </div>
          </div>

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

          {video.creator && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">
                {isMaestroView ? "Creato da" : "Assegnato da"}
              </label>
              <div className="flex-1">
                <p className="text-secondary font-semibold">{video.creator.full_name}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {isMaestroView && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
            <h2 className="text-base sm:text-lg font-semibold text-secondary">Utenti Assegnati</h2>
          </div>
          <div className="p-6">
            {video.assigned_users && video.assigned_users.length > 0 ? (
              <div className="space-y-3">
                <div className="bg-secondary rounded-lg px-5 py-3 mb-3 border border-secondary">
                  <div className="flex items-center gap-4">
                    <div className="w-10 flex-shrink-0 flex items-center justify-center">
                      <div className="text-xs font-bold text-white/80 uppercase">#</div>
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-bold text-white/80 uppercase">Nome</div>
                    </div>
                    <div className="w-48 hidden md:block">
                      <div className="text-xs font-bold text-white/80 uppercase">Email</div>
                    </div>
                    <div className="w-32 hidden lg:block">
                      <div className="text-xs font-bold text-white/80 uppercase">Telefono</div>
                    </div>
                  </div>
                </div>

                {video.assigned_users.map((user) => (
                  <div
                    key={user.id}
                    className="bg-white rounded-lg px-5 py-4 border border-gray-200 hover:border-gray-300 transition-all border-l-4"
                    style={{ borderLeftColor: "var(--secondary)" }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 flex-shrink-0 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-lg bg-secondary text-white flex items-center justify-center text-sm font-bold">
                          {user.full_name?.charAt(0)?.toUpperCase() || "U"}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-secondary">{user.full_name}</div>
                      </div>
                      <div className="w-48 hidden md:block">
                        <div className="text-sm text-secondary/70 truncate">{user.email}</div>
                      </div>
                      <div className="w-32 hidden lg:block">
                        {user.phone ? (
                          <div className="text-sm text-secondary/70 truncate">{user.phone}</div>
                        ) : (
                          <div className="text-sm text-secondary/40">-</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-secondary/50 text-center py-8">
                Video non assegnato a nessun utente
              </p>
            )}
          </div>
        </div>
      )}

      {canManageMaestroVideo && (
        <div className="flex flex-wrap gap-3">
          <Link
            href={`${dashboardBase}/videos/new?id=${videoId}`}
            className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-3 text-white bg-secondary rounded-lg hover:bg-secondary/90 transition-all font-medium"
          >
            Modifica
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-3 text-white bg-[#022431] rounded-lg hover:bg-[#022431]/90 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Elimina"}
          </button>
        </div>
      )}
    </div>
  );
}
