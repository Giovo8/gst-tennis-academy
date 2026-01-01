"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  Video,
  Plus,
  Search,
  User,
  Calendar,
  ExternalLink,
  Trash2,
  X,
  Check,
  Loader2,
} from "lucide-react";

interface VideoLesson {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  category: string;
  level: string;
  created_at: string;
  assignee?: {
    full_name: string;
  };
}

interface Student {
  id: string;
  full_name: string;
  email: string;
}

export default function VideoLabPage() {
  const [videos, setVideos] = useState<VideoLesson[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    video_url: "",
    category: "Tecnica",
    level: "Principiante",
    assigned_to: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Load videos created by this coach
    try {
      const response = await fetch("/api/video-lessons");
      const data = await response.json();
      const myVideos = (data.videos || []).filter((v: any) => v.creator?.email);
      setVideos(myVideos);
    } catch {
      setVideos([]);
    }

    // Load students (athletes who have had lessons with this coach)
    const { data: bookings } = await supabase
      .from("bookings")
      .select("user_id")
      .eq("coach_id", user.id);

    const uniqueIds = [...new Set(bookings?.map(b => b.user_id) || [])];

    if (uniqueIds.length > 0) {
      const { data: studentProfiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", uniqueIds)
        .eq("role", "atleta");
      
      setStudents(studentProfiles || []);
    }

    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch("/api/video-lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowModal(false);
        setFormData({
          title: "",
          description: "",
          video_url: "",
          category: "Tecnica",
          level: "Principiante",
          assigned_to: "",
        });
        loadData();
      }
    } catch {}
    
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Sei sicuro di voler eliminare questo video?")) return;
    
    setDeleting(id);

    try {
      const response = await fetch(`/api/video-lessons?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setVideos(videos.filter(v => v.id !== id));
      }
    } catch {}
    
    setDeleting(null);
  }

  const filteredVideos = videos.filter((video) =>
    video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    video.assignee?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("it-IT", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const categories = ["Tecnica", "Tattica", "Esercizi", "Match Analysis", "Altro"];
  const levels = ["Principiante", "Intermedio", "Avanzato", "Agonista"];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 skeleton rounded-lg w-48" />
        <div className="grid gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 skeleton rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Video Lab</h1>
          <p className="text-[var(--foreground-muted)] mt-1">
            Carica e assegna video ai tuoi allievi
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-dark)] transition-colors"
        >
          <Plus className="h-5 w-5" />
          Nuovo Video
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--foreground-subtle)]" />
        <input
          type="text"
          placeholder="Cerca video o allievo..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
        />
      </div>

      {/* Videos List */}
      {filteredVideos.length === 0 ? (
        <div className="text-center py-16 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
          <Video className="h-16 w-16 text-[var(--foreground-subtle)] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
            {videos.length === 0 ? "Nessun video caricato" : "Nessun risultato"}
          </h3>
          <p className="text-[var(--foreground-muted)] mb-4">
            {videos.length === 0
              ? "Inizia caricando il tuo primo video"
              : "Prova con un'altra ricerca"
            }
          </p>
          {videos.length === 0 && (
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-dark)] transition-colors"
            >
              <Plus className="h-5 w-5" />
              Carica Video
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredVideos.map((video) => (
            <div
              key={video.id}
              className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                  <Video className="h-6 w-6 text-red-500" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-[var(--foreground)] truncate">
                    {video.title}
                  </h3>
                  <div className="flex items-center gap-3 text-sm text-[var(--foreground-muted)] mt-1">
                    {video.assignee && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {video.assignee.full_name}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(video.created_at)}
                    </span>
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
                      {video.category}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <a
                  href={video.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--foreground-muted)] hover:text-[var(--primary)] transition-colors"
                >
                  <ExternalLink className="h-5 w-5" />
                </a>
                <button
                  onClick={() => handleDelete(video.id)}
                  disabled={deleting === video.id}
                  className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-[var(--foreground-muted)] hover:text-red-500 transition-colors disabled:opacity-50"
                >
                  {deleting === video.id ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Trash2 className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[var(--surface)] rounded-2xl shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">
                Nuovo Video
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--foreground-muted)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                  Titolo *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
                  placeholder="Es: Tecnica di rovescio"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                  URL Video *
                </label>
                <input
                  type="url"
                  value={formData.video_url}
                  onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                  Descrizione
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] resize-none"
                  placeholder="Note o istruzioni per l'allievo..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                    Categoria
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                    Livello
                  </label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
                  >
                    {levels.map((lvl) => (
                      <option key={lvl} value={lvl}>{lvl}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                  Assegna a *
                </label>
                <select
                  value={formData.assigned_to}
                  onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
                >
                  <option value="">Seleziona allievo...</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.full_name}
                    </option>
                  ))}
                </select>
                {students.length === 0 && (
                  <p className="text-xs text-[var(--foreground-subtle)] mt-1">
                    Nessun allievo trovato. Gli allievi appariranno dopo aver avuto almeno una lezione.
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-[var(--border)] text-[var(--foreground)] font-medium hover:bg-[var(--surface-hover)] transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={saving || !formData.assigned_to}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--primary)] text-white font-medium hover:bg-[var(--primary-dark)] transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Salvataggio...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Salva Video
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
