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
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-700 mb-2">
              Gestione News
            </h1>
            <p className="text-gray-600">Crea, modifica ed elimina le news visibili nella homepage</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-700 flex items-center gap-2">
              <Plus className="h-5 w-5 text-blue-600" />
              {editingId ? "Modifica News" : "Nuova News"}
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-sm px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-all"
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
              className="rounded-lg bg-white border border-gray-300 px-4 py-2.5 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-lg bg-white border border-gray-300 px-4 py-2.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="w-full rounded-lg bg-white border border-gray-300 px-4 py-2.5 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            className="w-full rounded-lg bg-white border border-gray-300 px-4 py-2.5 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />

          <label className="flex items-center gap-2 text-sm text-gray-700 font-semibold">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            Pubblicata
          </label>

          {error && (
            <p className="rounded-lg border border-red-300 bg-red-100 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          {success && (
            <p className="rounded-lg border border-green-300 bg-green-100 px-4 py-3 text-sm text-green-700">
              {success}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-600 hover:to-blue-700 transition-all disabled:opacity-50 shadow-sm"
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
          <h2 className="text-2xl font-bold text-gray-700">Tutte le News ({news.length})</h2>
          
          {loading ? (
            <div className="flex items-center gap-2 text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Caricamento...
            </div>
          ) : news.length === 0 ? (
            <p className="text-gray-500">Nessuna news presente. Crea la prima!</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {news.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl border border-gray-200 p-5 space-y-3 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold border ${
                      item.is_published ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-gray-100 text-gray-700 border-gray-300'
                    }`}>
                      {categoryLabels[item.category] || item.category}
                    </span>
                    <button
                      onClick={() => togglePublished(item.id, item.is_published)}
                      className="text-gray-500 hover:text-gray-700"
                      title={item.is_published ? "Nascondi" : "Pubblica"}
                    >
                      {item.is_published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                  </div>

                  {item.image_url && (
                    <div className="w-full rounded-lg overflow-hidden bg-gray-100">
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

                  <h3 className="text-base font-semibold text-gray-700">{item.title}</h3>
                  <p className="text-sm text-gray-500 line-clamp-3">{item.excerpt || item.content}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(item.published_at || item.created_at).toLocaleDateString("it-IT", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={() => editNews(item)}
                      className="flex-1 flex items-center justify-center gap-2 p-2 bg-blue-100 text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-200 transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                      Modifica
                    </button>
                    <button
                      onClick={() => deleteNews(item.id)}
                      className="flex items-center justify-center gap-2 p-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
