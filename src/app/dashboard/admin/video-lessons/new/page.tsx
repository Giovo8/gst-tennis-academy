"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { createNotification } from "@/lib/notifications/createNotification";
import { ArrowLeft, Trash2, Save } from "lucide-react";
import AuthGuard from "@/components/auth/AuthGuard";

type User = {
  id: string;
  full_name: string;
  email: string;
  role: string;
};

export default function VideoLessonFormPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const videoId = searchParams.get("id");
  const isEditMode = !!videoId;

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    video_url: "",
    thumbnail_url: "",
    duration_minutes: "",
    assigned_to: "",
    category: "generale",
    level: "tutti",
  });

  const categories = [
    { value: "generale", label: "Generale" },
    { value: "tecnica", label: "Tecnica" },
    { value: "tattica", label: "Tattica" },
    { value: "fitness", label: "Fitness" },
    { value: "mentale", label: "Mentale" },
  ];

  const levels = [
    { value: "tutti", label: "Tutti" },
    { value: "principiante", label: "Principiante" },
    { value: "intermedio", label: "Intermedio" },
    { value: "avanzato", label: "Avanzato" },
  ];

  useEffect(() => {
    loadUsers();
    if (isEditMode) {
      loadVideo();
    }
  }, [videoId]);

  async function loadUsers() {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, role")
        .in("role", ["atleta", "maestro"])
        .order("full_name", { ascending: true });

      if (!error && data) {
        setUsers(data);
      }
    } catch (error) {
      console.error("Error loading users:", error);
    }
  }

  async function loadVideo() {
    try {
      const { data, error } = await supabase
        .from("video_lessons")
        .select("*")
        .eq("id", videoId)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          title: data.title,
          description: data.description || "",
          video_url: data.video_url,
          thumbnail_url: data.thumbnail_url || "",
          duration_minutes: data.duration_minutes?.toString() || "",
          assigned_to: data.assigned_to || "",
          category: data.category,
          level: data.level,
        });
      }
    } catch (error) {
      console.error("Error loading video:", error);
      alert("Errore nel caricamento del video");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.title || !formData.video_url) {
      alert("Titolo e URL video sono obbligatori");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const videoData = {
        title: formData.title,
        description: formData.description,
        video_url: formData.video_url,
        thumbnail_url: formData.thumbnail_url || null,
        duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
        assigned_to: formData.assigned_to || null,
        category: formData.category,
        level: formData.level,
        is_active: true,
      };

      if (isEditMode) {
        const { error } = await supabase
          .from("video_lessons")
          .update(videoData)
          .eq("id", videoId);

        if (error) throw error;
        alert("Video aggiornato con successo!");
      } else {
        const { data: newVideo, error } = await supabase
          .from("video_lessons")
          .insert({
            ...videoData,
            created_by: user?.id,
          })
          .select()
          .single();

        if (error) throw error;

        // Send notification if video is assigned
        if (formData.assigned_to && newVideo) {
          await createNotification({
            userId: formData.assigned_to,
            type: "general",
            title: "Nuovo video assegnato",
            message: `Ti è stato assegnato il video: ${formData.title}`,
            link: "/dashboard/atleta/videos",
          });
        }

        alert("Video creato con successo!");
      }

      router.push("/dashboard/admin/video-lessons");
    } catch (error: any) {
      console.error("Error saving video:", error);
      alert(error.message || "Errore durante il salvataggio");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Sei sicuro di voler eliminare "${formData.title}"?`)) {
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

  return (
    <AuthGuard allowedRoles={["admin", "gestore"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div>
              <div className="text-xs font-semibold text-secondary/60 uppercase tracking-wider mb-1">
                GESTIONE VIDEO › {isEditMode ? "MODIFICA" : "NUOVO"}
              </div>
              <h1 className="text-3xl font-bold text-secondary">
                {isEditMode ? "Modifica Video Lezione" : "Nuovo Video Lezione"}
              </h1>
              <p className="text-gray-600 text-sm mt-1 max-w-2xl">
                {isEditMode
                  ? "Modifica i dettagli del video lezione"
                  : "Crea un nuovo video lezione e assegnalo agli atleti"}
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/admin/video-lessons"
            className="px-6 py-3 border border-gray-300 hover:bg-gray-50 text-secondary font-medium rounded-lg transition-all flex items-center gap-2"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Indietro</span>
          </Link>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-secondary mb-6">Informazioni Video</h2>
          <div className="space-y-6">
            {/* Title */}
            <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
              <label className="text-sm font-semibold text-secondary w-48 pt-2 shrink-0">
                Titolo *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-secondary/20"
                placeholder="Es: Dritto in slice"
                required
              />
            </div>

            {/* Description */}
            <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
              <label className="text-sm font-semibold text-secondary w-48 pt-2 shrink-0">
                Descrizione
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-secondary/20"
                placeholder="Descrizione dettagliata del video..."
              />
            </div>

            {/* Video URL */}
            <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
              <label className="text-sm font-semibold text-secondary w-48 pt-2 shrink-0">
                URL Video *
              </label>
              <input
                type="url"
                value={formData.video_url}
                onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-secondary/20"
                placeholder="https://youtube.com/..."
                required
              />
            </div>

            {/* Thumbnail URL */}
            <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
              <label className="text-sm font-semibold text-secondary w-48 pt-2 shrink-0">
                URL Thumbnail
              </label>
              <input
                type="url"
                value={formData.thumbnail_url}
                onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-secondary/20"
                placeholder="https://..."
              />
            </div>

            {/* Duration */}
            <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
              <label className="text-sm font-semibold text-secondary w-48 pt-2 shrink-0">
                Durata (minuti)
              </label>
              <input
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-secondary/20"
                placeholder="15"
                min="1"
              />
            </div>

            {/* Category */}
            <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
              <label className="text-sm font-semibold text-secondary w-48 pt-2 shrink-0">
                Categoria
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-secondary/20"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Level */}
            <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
              <label className="text-sm font-semibold text-secondary w-48 pt-2 shrink-0">
                Livello
              </label>
              <select
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-secondary/20"
              >
                {levels.map((lvl) => (
                  <option key={lvl.value} value={lvl.value}>
                    {lvl.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Assigned User */}
            <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
              <label className="text-sm font-semibold text-secondary w-48 pt-2 shrink-0">
                Assegna a Utente
              </label>
              <select
                value={formData.assigned_to}
                onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-secondary/20"
              >
                <option value="">Nessuno (generale)</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name} ({user.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
            <div>
              {isEditMode && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-6 py-3 border border-red-300 text-red-600 hover:bg-red-50 font-medium rounded-lg transition-all flex items-center gap-2"
                >
                  <Trash2 className="h-5 w-5" />
                  <span>Elimina Video</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/admin/video-lessons"
                className="px-6 py-3 border border-gray-300 hover:bg-gray-50 text-secondary font-medium rounded-lg transition-all"
              >
                Annulla
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-secondary hover:opacity-90 text-white font-medium rounded-lg transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="h-5 w-5" />
                <span>{loading ? "Salvataggio..." : isEditMode ? "Salva Modifiche" : "Crea Video"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </AuthGuard>
  );
}
