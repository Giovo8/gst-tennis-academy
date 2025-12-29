"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import { Newspaper, Plus, Pencil, Trash2, Loader2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type News = {
  id: string;
  title: string;
  category: string;
  summary?: string;
  content: string;
  excerpt?: string;
  image_url: string | null;
  author_id?: string;
  is_published: boolean;
  published_at?: string;
  created_at: string;
  updated_at: string;
};

export default function AdminNewsPage() {
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [summary, setSummary] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [published, setPublished] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const categoryLabels: Record<string, string> = {
    'notizie': 'Notizie',
    'risultati': 'Risultati',
    'eventi': 'Eventi',
    'generale': 'Generale',
    'tornei': 'Tornei'
  };

  useEffect(() => {
    loadNews();
  }, []);

  async function loadNews() {
    setLoading(true);
    const { data, error } = await supabase
      .from("news")
      .select("*")
      .order("published_at", { ascending: false });

    if (error) {
      // Handle error silently
    } else {
      setNews(data || []);
    }
    setLoading(false);
  }

  function resetForm() {
    setTitle("");
    setCategory("");
    setSummary("");
    setImageUrl("");
    setPublished(true);
    setEditingId(null);
    setError(null);
    setSuccess(null);
  }

  function editNews(item: News) {
    setTitle(item.title);
    setCategory(item.category);
    setSummary(item.excerpt || item.content);
    setImageUrl(item.image_url || "");
    setPublished(item.is_published);
    setEditingId(item.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    if (!title || !category || !summary) {
      setError("Titolo, categoria e sommario sono obbligatori");
      setSaving(false);
      return;
    }

    try {
      if (editingId) {
        // Update existing
        const { error } = await supabase
          .from("news")
          .update({
            title,
            category,
            content: summary,
            excerpt: summary.substring(0, 200),
            image_url: imageUrl || null,
            is_published: published,
            published_at: published ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingId);

        if (error) throw error;
        setSuccess("News aggiornata!");
      } else {
        // Create new
        const { data: userData } = await supabase.auth.getUser();
        const { error } = await supabase
          .from("news")
          .insert({
            title,
            category,
            content: summary,
            excerpt: summary.substring(0, 200),
            image_url: imageUrl || null,
            is_published: published,
            author_id: userData.user?.id,
            published_at: published ? new Date().toISOString() : null,
          });

        if (error) throw error;
        setSuccess("News creata!");
      }

      resetForm();
      loadNews();
    } catch (err: any) {
      setError(err.message || "Errore durante il salvataggio");
    } finally {
      setSaving(false);
    }
  }

  async function deleteNews(id: string) {
    if (!confirm("Sei sicuro di voler eliminare questa news?")) return;

    const { error } = await supabase.from("news").delete().eq("id", id);

    if (error) {
      alert("Errore durante l'eliminazione: " + error.message);
    } else {
      setSuccess("News eliminata!");
      loadNews();
    }
  }

  async function togglePublished(id: string, currentState: boolean) {
    const newState = !currentState;
    const { error } = await supabase
      .from("news")
      .update({ 
        is_published: newState,
        published_at: newState ? new Date().toISOString() : null,
        updated_at: new Date().toISOString() 
      })
      .eq("id", id);

    if (error) {
      alert("Errore: " + error.message);
    } else {
      loadNews();
    }
  }

  return (
    <AuthGuard allowedRoles={["admin", "gestore"]}>
      <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-5 px-6 py-10 bg-[#021627] text-white">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-2 flex items-center gap-2">
            <Newspaper className="h-4 w-4" />
            Gestione News
          </p>
          <h1 className="text-4xl font-bold text-white">News dell'Academy</h1>
          <p className="text-sm text-muted">Crea, modifica ed elimina le news visibili nella homepage</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="rounded-xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Plus className="h-5 w-5 text-accent" />
              {editingId ? "Modifica News" : "Nuova News"}
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-sm px-4 py-2 rounded-xl border-2 border-gray-400/40 bg-gradient-to-r from-gray-500/20 to-gray-600/20 text-gray-300 hover:from-gray-500/30 hover:to-gray-600/30 hover:border-gray-400/60 hover:text-white transition-all duration-300"
              >
                Annulla modifica
              </button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <input
              type="text"
              placeholder="Titolo *"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-xl border border-white/15 bg-surface px-3 py-2 text-white outline-none focus-ring-accent"
              required
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-xl border border-white/15 bg-surface px-3 py-2 text-white outline-none focus-ring-accent"
              required
            >
              <option value="">Seleziona Categoria *</option>
              <option value="notizie">Notizie</option>
              <option value="risultati">Risultati</option>
              <option value="eventi">Eventi</option>
              <option value="generale">Generale</option>
              <option value="tornei">Tornei</option>
            </select>
          </div>

          <div className="space-y-2">
            <input
              type="url"
              placeholder="URL Immagine (opzionale)"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-surface px-3 py-2 text-white outline-none focus-ring-accent"
            />
            {imageUrl && (
              <div className="relative w-full rounded-xl overflow-hidden border border-white/15 bg-surface/50">
                <div className="aspect-video w-full">
                  <img
                    src={imageUrl}
                    alt="Anteprima"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = '<div class="flex items-center justify-center h-full text-sm text-red-400"><svg class="w-8 h-8 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>URL immagine non valido</div>';
                      }
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          <textarea
            placeholder="Sommario *"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-white/15 bg-surface px-3 py-2 text-white outline-none focus-ring-accent"
            required
          />

          <label className="flex items-center gap-2 text-sm text-white">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              className="h-4 w-4 rounded border-white/15"
            />
            Pubblicata
          </label>

          {error && (
            <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-100">
              {error}
            </p>
          )}

          {success && (
            <p className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100">
              {success}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold bg-[#2f7de1] text-white transition hover:bg-[#2563c7] disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvataggio...
              </>
            ) : (
              <>
                {editingId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {editingId ? "Aggiorna" : "Crea News"}
              </>
            )}
          </button>
        </form>

        {/* News List */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">Tutte le News ({news.length})</h2>
          
          {loading ? (
            <div className="flex items-center gap-2 text-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              Caricamento...
            </div>
          ) : news.length === 0 ? (
            <p className="text-muted">Nessuna news presente. Crea la prima!</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {news.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-5 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                      item.is_published ? 'bg-blue-500/20 text-blue-300' : 'bg-cyan-500/20 text-cyan-300'
                    }`}>
                      {categoryLabels[item.category] || item.category}
                    </span>
                    <button
                      onClick={() => togglePublished(item.id, item.is_published)}
                      className="text-muted hover:text-white"
                      title={item.is_published ? "Nascondi" : "Pubblica"}
                    >
                      {item.is_published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                  </div>

                  {item.image_url && (
                    <div className="w-full rounded-lg overflow-hidden bg-surface/50">
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-40 object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}

                  <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                  <p className="text-sm text-muted line-clamp-3">{item.excerpt || item.content}</p>
                  <p className="text-xs text-muted-2">
                    {new Date(item.published_at || item.created_at).toLocaleDateString("it-IT", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={() => editNews(item)}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl border-2 border-amber-400/40 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 px-3 py-2 text-sm font-semibold text-amber-200 hover:from-amber-500/30 hover:to-yellow-500/30 hover:border-amber-400/60 hover:shadow-lg hover:shadow-amber-500/30 transition-all duration-300"
                    >
                      <Pencil className="h-4 w-4" />
                      Modifica
                    </button>
                    <button
                      onClick={() => deleteNews(item.id)}
                      className="flex items-center justify-center gap-2 rounded-xl border-2 border-red-400/40 bg-gradient-to-r from-red-500/20 to-rose-500/20 px-3 py-2 text-sm font-semibold text-red-200 hover:from-red-500/30 hover:to-rose-500/30 hover:border-red-400/60 hover:shadow-lg hover:shadow-red-500/30 transition-all duration-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </AuthGuard>
  );
}
