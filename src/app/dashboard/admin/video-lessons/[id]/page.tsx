"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  Trash2,
  Clock,
  Loader2,
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
  notes?: string | null;
  assigned_users?: { id: string; full_name: string; email: string; phone?: string }[];
  creator?: { full_name: string; email: string } | null;
};

export default function VideoDetailPage() {
  const router = useRouter();
  const params = useParams();
  const videoId = params.id as string;

  const [video, setVideo] = useState<VideoLesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [notesDirty, setNotesDirty] = useState(false);
  const [notesSaving, setNotesSaving] = useState(false);

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
        setNotes(data.notes ?? "");
        setNotesDirty(false);
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

  async function handleSaveNotes() {
    setNotesSaving(true);
    try {
      const { error } = await supabase
        .from("video_lessons")
        .update({ notes })
        .eq("id", videoId);
      if (error) throw error;
      setNotesDirty(false);
    } catch (error: any) {
      console.error("Error saving notes:", error);
      alert(error.message || "Errore durante il salvataggio delle note");
    } finally {
      setNotesSaving(false);
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
        <div className="bg-secondary rounded-xl border border-secondary p-6">
          <div className="flex items-start gap-6">
            <Play className="h-8 w-8 text-white flex-shrink-0" strokeWidth={2.5} />
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white">{video.title}</h1>
            </div>
          </div>
        </div>

        {/* Video Info & Details Combined */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
            <h2 className="text-base sm:text-lg font-semibold text-secondary">Informazioni e Dettagli</h2>
          </div>
          <div className="p-6 space-y-6">
            {/* Descrizione */}
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

            {/* Creator */}
            {video.creator && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8">
                <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Creato da</label>
                <div className="flex-1">
                  <p className="text-secondary font-semibold">{video.creator.full_name}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Assigned Users */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
            <h2 className="text-base sm:text-lg font-semibold text-secondary">Utenti Assegnati</h2>
          </div>
          <div className="px-6 py-4">
          {video.assigned_users && video.assigned_users.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {video.assigned_users.map((user: any, index: number) => (
                <li key={user.id}>
                  <div className="flex items-center gap-4 py-3 px-3 rounded-lg" style={{ background: "var(--secondary)" }}>
                    <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-white leading-none">
                        {user.full_name?.trim().split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase() || "U"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm truncate">{user.full_name}</p>
                      {(user.email || user.phone) && (
                        <p className="text-xs text-white/60 truncate mt-0.5">
                          {[user.email, user.phone].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                    <span className="flex-shrink-0 text-xs font-bold text-white/50 uppercase tracking-wide">ATLETA</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-secondary/50 text-center py-8">
              Video non assegnato a nessun utente
            </p>
          )}
          </div>
        </div>

        {/* Note */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent flex items-center justify-between gap-3">
            <h2 className="text-base sm:text-lg font-semibold text-secondary">Note</h2>
            {notesDirty && (
              <button
                onClick={handleSaveNotes}
                disabled={notesSaving}
                className="px-4 py-1.5 text-xs font-medium text-white bg-secondary rounded-md hover:opacity-90 transition-all disabled:opacity-60 inline-flex items-center gap-2"
              >
                {notesSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Salva
              </button>
            )}
          </div>
          <div className="p-6">
            <textarea
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setNotesDirty(true);
              }}
              rows={5}
              placeholder="Aggiungi note interne su questo video..."
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20 resize-y"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/dashboard/admin/video-lessons/new?id=${videoId}`}
            className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-3 text-white bg-secondary rounded-lg hover:bg-secondary/90 transition-all font-medium"
          >
            Modifica
          </Link>
          <button
            onClick={handleDelete}
            className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-3 text-white bg-[#022431] rounded-lg hover:bg-[#022431]/90 transition-all font-medium"
          >
            Elimina
          </button>
        </div>
      </div>
    </AuthGuard>
  );
}
