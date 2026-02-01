"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthGuard from "@/components/auth/AuthGuard";
import { Newspaper, Plus, Pencil, Loader2, AlertCircle, CheckCircle, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";

type News = {
  id: string;
  title: string;
  category: string;
  content: string;
  excerpt?: string;
  image_url: string | null;
  is_published: boolean;
  published_at?: string;
  created_at: string;
};

export default function CreateNewsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [summary, setSummary] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const categoryLabels: Record<string, string> = {
    'notizie': 'Notizie',
    'risultati': 'Risultati',
    'eventi': 'Eventi',
    'generale': 'Generale',
    'tornei': 'Tornei',
    'orari': 'Orari',
    'lezioni': 'Lezioni',
    'novità': 'Novità'
  };

  useEffect(() => {
    if (editId) {
      loadNews();
    }
  }, [editId]);

  async function loadNews() {
    if (!editId) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("news")
      .select("*")
      .eq("id", editId)
      .single();

    if (error || !data) {
      setError("News non trovata");
      setLoading(false);
      return;
    }

    setTitle(data.title);
    setCategory(data.category);
    setSummary(data.content);
    setImageUrl(data.image_url || "");
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    if (!title || !category || !summary) {
      setError("Titolo, categoria e contenuto sono obbligatori");
      setSaving(false);
      return;
    }

    try {
      if (editId) {
        // Update existing
        const { error } = await supabase
          .from("news")
          .update({
            title,
            category,
            content: summary,
            excerpt: summary.substring(0, 200),
            image_url: imageUrl || null,
            is_published: true,
            published_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", editId);

        if (error) throw error;
        setSuccess("News aggiornata con successo!");
        setTimeout(() => router.push("/dashboard/admin/news"), 1500);
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
            is_published: true,
            author_id: userData.user?.id,
            published_at: new Date().toISOString(),
          });

        if (error) throw error;
        setSuccess("News creata con successo!");
        setTimeout(() => router.push("/dashboard/admin/news"), 1500);
      }
    } catch (err: any) {
      setError(err.message || "Errore durante il salvataggio");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editId) return;
    
    const confirmed = confirm("Sei sicuro di voler eliminare questa news? Questa azione non può essere annullata.");
    if (!confirmed) return;

    setDeleting(true);
    setError(null);

    try {
      const { error } = await supabase
        .from("news")
        .delete()
        .eq("id", editId);

      if (error) throw error;

      setSuccess("News eliminata con successo!");
      setTimeout(() => router.push("/dashboard/admin/news"), 1000);
    } catch (err: any) {
      setError(err.message || "Errore durante l'eliminazione");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <AuthGuard allowedRoles={["admin", "gestore"]}>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-secondary mx-auto mb-3" />
            <p className="text-secondary/60">Caricamento...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard allowedRoles={["admin", "gestore"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <div>
            <div className="text-xs font-semibold text-secondary/60 uppercase tracking-wider mb-1">
              GESTIONE NEWS › {editId ? "MODIFICA" : "CREA"} NEWS
            </div>
            <h1 className="text-3xl font-bold text-secondary">
              {editId ? "Modifica News" : "Crea nuova news"}
            </h1>
            <p className="text-gray-600 text-sm mt-1 max-w-2xl">
              {editId ? "Modifica i dettagli della news" : "Compila i campi per creare una nuova news"}
            </p>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mt-2">
            <div className="bg-red-50 rounded-xl border border-red-200 p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-900">Errore</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        {success && (
          <div className="mt-2">
            <div className="bg-green-50 rounded-xl border border-green-200 p-4 flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-green-900">Successo</p>
                <p className="text-sm text-green-700 mt-1">{success}</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="py-4">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-secondary mb-6">Informazioni News</h2>
              
              <div className="space-y-6">
                {/* Titolo */}
                <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
                  <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
                    Titolo <span className="text-red-600">*</span>
                  </label>
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Es. Torneo di Primavera 2026"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                      required
                    />
                  </div>
                </div>

                {/* Categoria */}
                <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
                  <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
                    Categoria <span className="text-red-600">*</span>
                  </label>
                  <div className="flex-1">
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-secondary appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                      required
                    >
                      <option value="">Seleziona categoria</option>
                      {Object.entries(categoryLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* URL Immagine */}
                <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
                  <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">URL Immagine</label>
                  <div className="flex-1">
                    <input
                      type="url"
                      placeholder="https://esempio.com/immagine.jpg"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                    />
                    {imageUrl && (
                      <div className="relative w-full rounded-xl overflow-hidden border border-gray-200 bg-secondary/5 mt-3">
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
                                // Safely set error message without innerHTML
                                const errorDiv = document.createElement('div');
                                errorDiv.className = 'flex items-center justify-center h-full text-sm text-red-600';
                                errorDiv.textContent = 'URL immagine non valido';
                                parent.replaceChildren(errorDiv);
                              }
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contenuto */}
                <div className="flex items-start gap-8">
                  <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
                    Contenuto <span className="text-red-600">*</span>
                  </label>
                  <div className="flex-1">
                    <textarea
                      placeholder="Scrivi il contenuto della news..."
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      rows={8}
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50 resize-none"
                      required
                    />
                    <p className="text-xs text-secondary/50 mt-1">{summary.length} caratteri</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottoni Azione */}
            <div className="flex items-center justify-between gap-4">
              {editId && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting || saving}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Eliminazione...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-5 w-5" />
                      <span>Elimina</span>
                    </>
                  )}
                </button>
              )}
              
              <button
                type="submit"
                disabled={!title || !category || !summary || saving || deleting}
                className="ml-auto px-6 py-3 bg-secondary hover:opacity-90 disabled:bg-secondary/20 disabled:text-secondary/40 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-3"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Salvataggio...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    <span>{editId ? "Aggiorna News" : "Crea News"}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Bottom Spacer */}
        <div className="h-8" />
      </div>
    </AuthGuard>
  );
}
