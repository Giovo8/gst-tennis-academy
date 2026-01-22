"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  Edit,
  Trash2,
  Users,
  Calendar,
  Clock,
  Tag,
  BarChart3,
  Loader2,
  Eye,
  Play,
} from "lucide-react";
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
  watch_count: number;
  created_at: string;
  assigned_users?: { id: string; full_name: string; email: string; phone?: string }[];
  creator?: { full_name: string; email: string } | null;
};

export default function VideoDetailPage() {
  const router = useRouter();
  const params = useParams();
  const videoId = params.id as string;

  const [video, setVideo] = useState<VideoLesson | null>(null);
  const [loading, setLoading] = useState(true);

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
    try {
      const { data, error } = await supabase
        .from("video_lessons")
        .select("*")
        .eq("id", videoId)
        .single();

      if (error) throw error;

      if (data) {
        // Load assignments with user profiles
        const { data: assignments } = await supabase
          .from("video_assignments")
          .select("user_id")
          .eq("video_id", videoId);

        let assignedUsers: { id: string; full_name: string; email: string; phone?: string }[] = [];
        if (assignments && assignments.length > 0) {
          const userIds = assignments.map((a) => a.user_id);
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name, email, phone")
            .in("id", userIds);

          assignedUsers = profiles || [];
        }

        // Load creator profile
        let creator = null;
        if (data.created_by) {
          const { data: creatorProfile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", data.created_by)
            .single();

          creator = creatorProfile;
        }

        setVideo({
          ...data,
          assigned_users: assignedUsers,
          creator,
        });
      }
    } catch (error) {
      console.error("Error loading video:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!video) return;
    if (!confirm(`Sei sicuro di voler eliminare "${video.title}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("video_lessons")
        .delete()
        .eq("id", videoId);

      if (error) throw error;

      alert("Video eliminato con successo!");
      router.push("/dashboard/admin/video-lessons");
    } catch (error: any) {
      console.error("Error deleting video:", error);
      alert(error.message || "Errore durante l'eliminazione");
    }
  }

  // Extract YouTube video ID
  const getYouTubeVideoId = (url: string) => {
    const match = url.match(
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
    );
    return match ? match[1] : null;
  };

  if (loading) {
    return (
      <AuthGuard allowedRoles={["admin", "gestore"]}>
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-secondary" />
          <p className="mt-4 text-gray-600">Caricamento video...</p>
        </div>
      </AuthGuard>
    );
  }

  if (!video) {
    return (
      <AuthGuard allowedRoles={["admin", "gestore"]}>
        <div className="text-center py-20">
          <h2 className="text-xl font-semibold text-secondary mb-2">Video non trovato</h2>
          <p className="text-gray-600 mb-6">Il video richiesto non esiste o è stato eliminato.</p>
          <Link
            href="/dashboard/admin/video-lessons"
            className="inline-flex items-center gap-2 px-6 py-3 bg-secondary text-white rounded-lg hover:opacity-90 transition-all"
          >
            Torna alla lista
          </Link>
        </div>
      </AuthGuard>
    );
  }

  const youtubeId = getYouTubeVideoId(video.video_url);

  return (
    <AuthGuard allowedRoles={["admin", "gestore"]}>
      <div className="space-y-6">
        {/* Video Player */}
        <div className="bg-black rounded-xl overflow-hidden aspect-video mt-8">
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
        <div className="bg-secondary rounded-xl border-t border-r border-b border-secondary p-6 border-l-4" style={{ borderLeftColor: video.is_active ? '#08b3f7' : '#056c94' }}>
          <div className="flex items-start gap-6">
            <Play className="h-8 w-8 text-white flex-shrink-0" strokeWidth={2.5} />
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white">{video.title}</h1>
            </div>
          </div>
        </div>

        {/* Video Info & Details Combined */}
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
                <p className="text-secondary font-semibold">
                  {format(new Date(video.created_at), "d MMMM yyyy", { locale: it }).replace(/^([a-z])/, c => c.toUpperCase()).replace(/\s([a-z])/g, (c) => ' ' + c.toUpperCase())}
                </p>
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

            {/* Category */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Categoria</label>
              <div className="flex-1">
                <p className="text-secondary font-semibold">
                  {categories.find((c) => c.value === video.category)?.label || video.category}
                </p>
              </div>
            </div>

            {/* Level */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Livello</label>
              <div className="flex-1">
                <p className="text-secondary font-semibold">
                  {levels.find((l) => l.value === video.level)?.label || video.level}
                </p>
              </div>
            </div>

            {/* Status */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Stato</label>
              <div className="flex-1">
                <p className={`font-semibold ${video.is_active ? 'text-[#08b3f7]' : 'text-[#056c94]'}`}>
                  {video.is_active ? "Pubblicato" : "Bozza"}
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

        {/* Assigned Users */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-secondary mb-6">Utenti Assegnati</h2>

          {video.assigned_users && video.assigned_users.length > 0 ? (
            <div className="space-y-3">
              {/* Header Row */}
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

              {/* Data Rows */}
              {video.assigned_users.map((user: any, index: number) => (
                <div
                  key={user.id}
                  className="bg-white rounded-lg px-5 py-4 border border-gray-200 hover:border-gray-300 transition-all border-l-4"
                  style={{ borderLeftColor: "#0ea5e9" }}
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

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/dashboard/admin/video-lessons/new?id=${videoId}`}
            className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-3 text-white bg-secondary rounded-lg hover:bg-secondary/90 transition-all font-medium"
          >
            <Edit className="h-5 w-4" />
            Modifica
          </Link>
          <button
            onClick={handleDelete}
            className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-3 text-white bg-[#022431] rounded-lg hover:bg-[#022431]/90 transition-all font-medium"
          >
            <Trash2 className="h-5 w-4" />
            Elimina
          </button>
        </div>
      </div>
    </AuthGuard>
  );
}
