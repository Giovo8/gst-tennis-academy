"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import { Newspaper, Plus, Pencil, Trash2, Loader2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type News = {
  id: string;
  title: string;
  category: string;
  summary: string;
  image_url: string | null;
  date: string;
  published: boolean;
  created_at: string;
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

  useEffect(() => {
    loadNews();
  }, []);

  async function loadNews() {
    setLoading(true);
    const { data, error } = await supabase
      .from("news")
      .select("*")
      .order("date", { ascending: false });

    if (error) {
      console.error("Error loading news:", error);
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
    setSummary(item.summary);
    setImageUrl(item.image_url || "");
    setPublished(item.published);
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
            summary,
            image_url: imageUrl || null,
            published,
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
            summary,
            image_url: imageUrl || null,
            published,
            created_by: userData.user?.id,
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
    const { error } = await supabase
      .from("news")
      .update({ published: !currentState, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      alert("Errore: " + error.message);
    } else {
      loadNews();
    }
  }

  return (
    <AuthGuard allowedRoles={["admin", "gestore"]}>
      <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-6 py-12 bg-[#021627] text-white">
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
                className="text-sm text-muted hover:text-white"
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
            <input
              type="text"
              placeholder="Categoria *"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-xl border border-white/15 bg-surface px-3 py-2 text-white outline-none focus-ring-accent"
              required
            />
          </div>

          <input
            type="url"
            placeholder="URL Immagine (opzionale)"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="w-full rounded-xl border border-white/15 bg-surface px-3 py-2 text-white outline-none focus-ring-accent"
          />

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
                      item.published ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {item.category}
                    </span>
                    <button
                      onClick={() => togglePublished(item.id, item.published)}
                      className="text-muted hover:text-white"
                      title={item.published ? "Nascondi" : "Pubblica"}
                    >
                      {item.published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                  </div>

                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  )}

                  <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                  <p className="text-sm text-muted line-clamp-3">{item.summary}</p>
                  <p className="text-xs text-muted-2">
                    {new Date(item.date).toLocaleDateString("it-IT", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={() => editNews(item)}
                      className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-sm font-semibold text-accent hover:bg-accent/20"
                    >
                      <Pencil className="h-4 w-4" />
                      Modifica
                    </button>
                    <button
                      onClick={() => deleteNews(item.id)}
                      className="flex items-center justify-center gap-2 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm font-semibold text-red-400 hover:bg-red-400/20"
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
