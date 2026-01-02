"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Video, Loader2, Search, Plus, Edit2, Trash2, Check, X, Play, Eye } from "lucide-react";

type VideoLesson = {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  duration_minutes: number | null;
  created_by: string | null;
  assigned_to: string | null;
  category: string;
  level: string;
  is_active: boolean;
  watched_at: string | null;
  watch_count: number;
  created_at: string;
  assigned_user?: { full_name: string; email: string } | null;
  creator?: { full_name: string; email: string } | null;
};

type User = {
  id: string;
  full_name: string;
  email: string;
  role: string;
};

export default function VideoLessonsPage() {
  const [videos, setVideos] = useState<VideoLesson[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingVideo, setEditingVideo] = useState<VideoLesson | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    video_url: "",
    thumbnail_url: "",
    duration_minutes: "",
    assigned_to: "",
    category: "generale",
    level: "tutti"
  });

  useEffect(() => {
    loadVideos();
    loadUsers();
  }, []);

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

  async function loadVideos() {
    try {
      const { data, error } = await supabase
        .from("video_lessons")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Carica i dati degli utenti separatamente
      if (data && data.length > 0) {
        const userIds = [...new Set([
          ...data.map(v => v.assigned_to).filter(Boolean),
          ...data.map(v => v.created_by).filter(Boolean)
        ])];

        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name, email")
            .in("id", userIds);

          // Mappa i profili ai video
          const videosWithUsers = data.map(video => ({
            ...video,
            assigned_user: video.assigned_to ? profiles?.find(p => p.id === video.assigned_to) : null,
            creator: video.created_by ? profiles?.find(p => p.id === video.created_by) : null
          }));

          setVideos(videosWithUsers);
        } else {
          setVideos(data);
        }
      } else {
        setVideos(data || []);
      }
    } catch (error) {
      console.error("Error loading videos:", error);
    } finally {
      setLoading(false);
    }
  }

  async function createVideo() {
    if (!formData.title || !formData.video_url) {
      alert("Titolo e URL video sono obbligatori");
      return;
    }

    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("video_lessons")
        .insert({
          title: formData.title,
          description: formData.description,
          video_url: formData.video_url,
          thumbnail_url: formData.thumbnail_url || null,
          duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
          assigned_to: formData.assigned_to || null,
          category: formData.category,
          level: formData.level,
          created_by: user?.id,
          is_active: true
        });

      if (error) throw error;

      alert("Video creato con successo!");
      setShowCreateForm(false);
      setFormData({
        title: "",
        description: "",
        video_url: "",
        thumbnail_url: "",
        duration_minutes: "",
        assigned_to: "",
        category: "generale",
        level: "tutti"
      });
      loadVideos();
    } catch (error: any) {
      console.error("Error creating video:", error);
      alert(error.message || "Errore durante la creazione del video");
    } finally {
      setCreating(false);
    }
  }

  async function updateVideo() {
    if (!editingVideo) return;

    if (!formData.title || !formData.video_url) {
      alert("Titolo e URL video sono obbligatori");
      return;
    }

    try {
      const { error } = await supabase
        .from("video_lessons")
        .update({
          title: formData.title,
          description: formData.description,
          video_url: formData.video_url,
          thumbnail_url: formData.thumbnail_url || null,
          duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
          assigned_to: formData.assigned_to || null,
          category: formData.category,
          level: formData.level
        })
        .eq("id", editingVideo.id);

      if (error) throw error;

      alert("Video aggiornato con successo!");
      setEditingVideo(null);
      loadVideos();
    } catch (error: any) {
      console.error("Error updating video:", error);
      alert(error.message || "Errore durante l'aggiornamento del video");
    }
  }

  async function deleteVideo(videoId: string, title: string) {
    if (!confirm(`Sei sicuro di voler eliminare "${title}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("video_lessons")
        .delete()
        .eq("id", videoId);

      if (error) throw error;

      alert("Video eliminato con successo!");
      loadVideos();
    } catch (error: any) {
      console.error("Error deleting video:", error);
      alert(error.message || "Errore durante l'eliminazione del video");
    }
  }

  const categories = [
    { value: "generale", label: "Generale" },
    { value: "tecnica", label: "Tecnica" },
    { value: "tattica", label: "Tattica" },
    { value: "fitness", label: "Fitness" },
    { value: "mentale", label: "Mentale" }
  ];

  const levels = [
    { value: "tutti", label: "Tutti" },
    { value: "principiante", label: "Principiante" },
    { value: "intermedio", label: "Intermedio" },
    { value: "avanzato", label: "Avanzato" }
  ];

  const filteredVideos = videos.filter((video) => {
    const matchesCategory = filter === "all" || video.category === filter;
    const matchesSearch = !search || 
      video.title.toLowerCase().includes(search.toLowerCase()) ||
      video.description?.toLowerCase().includes(search.toLowerCase()) ||
      video.assigned_user?.full_name?.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const stats = {
    total: videos.length,
    assigned: videos.filter(v => v.assigned_to).length,
    watched: videos.filter(v => v.watch_count > 0).length,
    active: videos.filter(v => v.is_active).length
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-700 mb-2">
            Gestione Video Lezioni
          </h1>
          <p className="text-gray-600">Assegna video lezioni personalizzati agli atleti</p>
        </div>
        <button
          onClick={() => {
            setShowCreateForm(!showCreateForm);
            setEditingVideo(null);
          }}
          className="px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all flex items-center gap-2 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          {showCreateForm ? "Nascondi Form" : "Nuovo Video"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Video className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-700">{stats.total}</p>
          </div>
          <p className="text-sm font-semibold text-gray-600">Totale Video</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Check className="h-5 w-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-700">{stats.assigned}</p>
          </div>
          <p className="text-sm font-semibold text-gray-600">Assegnati</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <Eye className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-gray-700">{stats.watched}</p>
          </div>
          <p className="text-sm font-semibold text-gray-600">Visualizzati</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-cyan-50 rounded-lg">
              <Play className="h-5 w-5 text-cyan-600" />
            </div>
            <p className="text-2xl font-bold text-gray-700">{stats.active}</p>
          </div>
          <p className="text-sm font-semibold text-gray-600">Attivi</p>
        </div>
      </div>

      {/* Create/Edit Form */}
      {(showCreateForm || editingVideo) && (
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <h2 className="text-xl font-bold text-gray-700 mb-4">
            {editingVideo ? "Modifica Video" : "Nuovo Video"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Titolo *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg bg-white border border-gray-300 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Es: Dritto in slice"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">URL Video * (YouTube, Vimeo)</label>
              <input
                type="url"
                value={formData.video_url}
                onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg bg-white border border-gray-300 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://youtube.com/..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Descrizione</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2.5 rounded-lg bg-white border border-gray-300 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Descrizione del video..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">URL Thumbnail</label>
              <input
                type="url"
                value={formData.thumbnail_url}
                onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg bg-white border border-gray-300 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Durata (minuti)</label>
              <input
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg bg-white border border-gray-300 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="15"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Categoria</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg bg-white border border-gray-300 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Livello</label>
              <select
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg bg-white border border-gray-300 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {levels.map(lvl => (
                  <option key={lvl.value} value={lvl.value}>{lvl.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Assegna a Utente</label>
              <select
                value={formData.assigned_to}
                onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg bg-white border border-gray-300 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Nessuno (generale)</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.full_name} ({user.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            {editingVideo ? (
              <>
                <button
                  onClick={updateVideo}
                  className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all flex items-center gap-2 shadow-sm"
                >
                  <Check className="h-4 w-4" />
                  Salva Modifiche
                </button>
                <button
                  onClick={() => {
                    setEditingVideo(null);
                    setFormData({
                      title: "",
                      description: "",
                      video_url: "",
                      thumbnail_url: "",
                      duration_minutes: "",
                      assigned_to: "",
                      category: "generale",
                      level: "tutti"
                    });
                  }}
                  className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
                >
                  Annulla
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={createVideo}
                  disabled={creating}
                  className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creazione...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Crea Video
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
                >
                  Annulla
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Cerca per titolo, descrizione o utente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white border border-gray-300 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              filter === "all"
                ? "text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 shadow-sm"
                : "bg-white text-gray-700 border border-gray-200 hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            Tutti
          </button>
          {categories.map(cat => (
            <button
              key={cat.value}
              onClick={() => setFilter(cat.value)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                filter === cat.value
                  ? "text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 shadow-sm"
                  : "bg-white text-gray-700 border border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Videos List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
          <p className="mt-4 text-gray-600">Caricamento video...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredVideos.map((video) => (
            <div
              key={video.id}
              className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  {video.thumbnail_url && (
                    <div className="w-32 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-gray-700">
                      {video.title}
                    </h3>
                    {video.description && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{video.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      <span className="px-2 py-1 rounded text-xs font-bold bg-blue-100 text-blue-700 border border-blue-300">
                        {categories.find(c => c.value === video.category)?.label}
                      </span>
                      <span className="px-2 py-1 rounded text-xs font-bold bg-purple-100 text-purple-700 border border-purple-300">
                        {levels.find(l => l.value === video.level)?.label}
                      </span>
                      {video.duration_minutes && (
                        <span className="text-xs text-gray-500">{video.duration_minutes} min</span>
                      )}
                      {video.assigned_user && (
                        <span className="text-xs text-gray-500">
                          👤 {video.assigned_user.full_name}
                        </span>
                      )}
                      {video.watch_count > 0 && (
                        <span className="text-xs text-emerald-600 font-medium">
                          👁 {video.watch_count} visualizzazioni
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={video.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-lg hover:bg-emerald-200 transition-colors"
                    title="Guarda video"
                  >
                    <Play className="h-4 w-4" />
                  </a>
                  <button
                    onClick={() => {
                      setEditingVideo(video);
                      setFormData({
                        title: video.title,
                        description: video.description || "",
                        video_url: video.video_url,
                        thumbnail_url: video.thumbnail_url || "",
                        duration_minutes: video.duration_minutes?.toString() || "",
                        assigned_to: video.assigned_to || "",
                        category: video.category,
                        level: video.level
                      });
                      setShowCreateForm(false);
                    }}
                    className="p-2 bg-blue-100 text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-200 transition-colors"
                    title="Modifica"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteVideo(video.id, video.title)}
                    className="p-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
                    title="Elimina"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filteredVideos.length === 0 && (
            <div className="text-center py-12">
              <Video className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">Nessun video trovato</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
