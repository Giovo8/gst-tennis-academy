"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthGuard from "@/components/auth/AuthGuard";
import { Newspaper, Plus, Pencil, Loader2, AlertCircle, CheckCircle } from "lucide-react";
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
            <Link
              href="/dashboard/admin/news"
              className="inline-flex items-center text-xs font-semibold text-secondary/60 uppercase tracking-wider mb-1 hover:text-secondary/80 transition-colors"
            >
              Gestione News
            </Link>
            <h1 className="text-3xl font-bold text-secondary">
              {editId ? "Modifica News" : "Crea nuova news"}
            </h1>
            <p className="text-secondary/70 text-sm mt-1 max-w-2xl">
              {editId ? "Modifica i dettagli della news" : "Compila i campi per creare una nuova news"}
            </p>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mt-2">
            <div className="bg-red-50 rounded-xl p-4 flex items-start gap-3">
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
            <div className="bg-green-50 rounded-xl p-4 flex items-start gap-3">
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
          <div className="space-y-6">
            {/* Form Card */}
            <div className="bg-white rounded-xl p-6 space-y-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Titolo e Categoria */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold text-secondary mb-2">
                      Titolo *
                    </label>
                    <input
                      type="text"
                      placeholder="Es. Torneo di Primavera 2026"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-secondary mb-2">
                      Categoria *
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-secondary appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
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
                <div>
                  <label className="block text-sm font-semibold text-secondary mb-2">URL Immagine</label>
                  <input
                    type="url"
                    placeholder="https://esempio.com/immagine.jpg"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
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
                              parent.innerHTML = '<div class="flex items-center justify-center h-full text-sm text-red-600"><svg class="w-8 h-8 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>URL immagine non valido</div>';
                            }
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Contenuto */}
                <div>
                  <label className="block text-sm font-semibold text-secondary mb-2">
                    Contenuto *
                  </label>
                  <textarea
                    placeholder="Scrivi il contenuto della news..."
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    rows={8}
                    className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50 resize-none"
                    required
                  />
                  <p className="text-xs text-secondary/50 mt-1">{summary.length} caratteri</p>
                </div>
              </form>
            </div>

            {/* Bottone Conferma */}
            <button
              onClick={handleSubmit}
              disabled={!title || !category || !summary || saving}
              className="w-full px-6 py-3 bg-secondary hover:opacity-90 disabled:bg-secondary/20 disabled:text-secondary/40 text-white font-medium rounded-md transition-all flex items-center justify-center gap-3"
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
        </div>

        {/* Bottom Spacer */}
        <div className="h-8" />
      </div>
    </AuthGuard>
  );
}
