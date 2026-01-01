"use client";

import { useState, useEffect } from "react";
import { Play, Clock, Eye, Plus, Search, Filter, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { Button, Card, CardHeader, CardTitle, CardContent, Input, Select, Badge, LoadingScreen } from "@/components/ui";

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
  assignee?: {
    full_name: string;
    email: string;
  };
}

interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

const categoryOptions = [
  { value: "", label: "Tutte le categorie" },
  { value: "tecnica", label: "Tecnica" },
  { value: "tattica", label: "Tattica" },
  { value: "fitness", label: "Fitness" },
  { value: "mentale", label: "Mentale" },
  { value: "generale", label: "Generale" },
];

const levelOptions = [
  { value: "tutti", label: "Tutti i livelli" },
  { value: "principiante", label: "Principiante" },
  { value: "intermedio", label: "Intermedio" },
  { value: "avanzato", label: "Avanzato" },
];

export default function VideoLessonsAdmin() {
  const [videos, setVideos] = useState<VideoLesson[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  
  // Form state
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [filterCategory]);

  async function loadData() {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      if (!token) {
        setError("Non autenticato");
        return;
      }

      // Carica video
      let url = "/api/video-lessons";
      if (filterCategory) {
        url += `?category=${filterCategory}`;
      }

      const videosRes = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const videosData = await videosRes.json();
      if (videosRes.ok) {
        setVideos(videosData.videos || []);
      }

      // Carica utenti (atleti e maestri)
      const usersRes = await fetch("/api/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const usersData = await usersRes.json();
      if (usersRes.ok) {
        setUsers(usersData.users?.filter((u: User) => 
          ["atleta", "maestro"].includes(u.role)
        ) || []);
      }
    } catch {
      setError("Errore nel caricamento");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const res = await fetch("/api/video-lessons", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      setShowForm(false);
      setFormData({
        title: "",
        description: "",
        video_url: "",
        thumbnail_url: "",
        duration_minutes: "",
        assigned_to: "",
        category: "generale",
        level: "tutti",
      });
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminare questo video?")) return;

    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const res = await fetch(`/api/video-lessons?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        loadData();
      }
    } catch {
      setError("Errore nell'eliminazione");
    }
  }

  const filteredVideos = videos.filter((v) =>
    v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.assignee?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <LoadingScreen message="Caricamento video..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Video Lezioni</h1>
          <p className="text-muted text-sm mt-1">
            Gestisci i video assegnati agli utenti
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} leftIcon={<Plus className="h-4 w-4" />}>
          Nuovo Video
        </Button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Form nuovo video */}
      {showForm && (
        <Card variant="glass">
          <CardHeader>
            <CardTitle>Aggiungi Video</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Titolo"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
                <Input
                  label="URL Video"
                  type="url"
                  placeholder="https://youtube.com/... o https://vimeo.com/..."
                  value={formData.video_url}
                  onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                  required
                />
              </div>

              <Input
                label="Descrizione"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="URL Thumbnail (opzionale)"
                  type="url"
                  value={formData.thumbnail_url}
                  onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                />
                <Input
                  label="Durata (minuti)"
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                />
                <Select
                  label="Assegna a"
                  options={users.map((u) => ({
                    value: u.id,
                    label: `${u.full_name || u.email} (${u.role})`,
                  }))}
                  placeholder="Seleziona utente"
                  value={formData.assigned_to}
                  onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Categoria"
                  options={categoryOptions.slice(1)}
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                />
                <Select
                  label="Livello"
                  options={levelOptions}
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>
                  Annulla
                </Button>
                <Button type="submit" isLoading={saving}>
                  Salva Video
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filtri */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Cerca per titolo o utente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            options={categoryOptions}
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          />
        </div>
      </div>

      {/* Lista video */}
      {filteredVideos.length === 0 ? (
        <Card variant="bordered" padding="lg">
          <div className="text-center text-muted">
            <Play className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nessun video trovato</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVideos.map((video) => (
            <Card key={video.id} variant="default" hover padding="none">
              {/* Thumbnail */}
              <div className="relative aspect-video bg-white/5 rounded-t-xl overflow-hidden">
                {video.thumbnail_url ? (
                  <img
                    src={video.thumbnail_url}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Play className="h-12 w-12 text-muted" />
                  </div>
                )}
                {video.duration_minutes && (
                  <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                    {video.duration_minutes} min
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
                  <Badge variant="info" size="sm">{video.category}</Badge>
                  <Badge variant="default" size="sm">{video.level}</Badge>
                </div>

                <div className="flex items-center justify-between text-sm text-muted">
                  <span>
                    Assegnato a: {video.assignee?.full_name || "N/A"}
                  </span>
                  <div className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    <span>{video.watch_count}</span>
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-border">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(video.id)}
                    leftIcon={<Trash2 className="h-3 w-3" />}
                  >
                    Elimina
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
