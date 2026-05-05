"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthGuard from "@/components/auth/AuthGuard";
import { Newspaper, Plus, Pencil, Loader2, AlertCircle, CheckCircle, Upload, Link as LinkIcon, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import { createNotification } from "@/lib/notifications/createNotification";

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
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState("");
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
        const creatorId = userData.user?.id;
        const { data: insertedNews, error } = await supabase
          .from("news")
          .insert({
            title,
            category,
            content: summary,
            excerpt: summary.substring(0, 200),
            image_url: imageUrl || null,
            is_published: true,
            author_id: creatorId,
            published_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (error) throw error;

        // Notify all users except the creator
        if (insertedNews?.id) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id")
            .neq("id", creatorId ?? "");

          if (profiles && profiles.length > 0) {
            await Promise.allSettled(
              profiles.map((p) =>
                createNotification({
                  userId: p.id,
                  type: "announcement",
                  title: "Nuova news pubblicata",
                  message: title,
                  link: `/news/${insertedNews.id}`,
                })
              )
            );
          }
        }

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

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("L'immagine deve essere inferiore a 5MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Il file deve essere un'immagine");
      return;
    }

    setUploadingImage(true);
    setShowImageModal(false);
    setError(null);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      if (imageUrl) {
        uploadFormData.append("oldImageUrl", imageUrl);
      }

      const response = await fetch("/api/upload/news-image", {
        method: "POST",
        body: uploadFormData,
      });

      if (!response.ok) {
        let errorMessage = "Errore upload";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Keep fallback error message
        }
        throw new Error(errorMessage);
      }

      const responseData = await response.json();
      if (!responseData.url) {
        throw new Error("Server non ha restituito un URL valido");
      }

      setImageUrl(responseData.url);
    } catch (uploadError: any) {
      setError(uploadError?.message || "Errore durante l'upload dell'immagine");
    } finally {
      setUploadingImage(false);
      const fileInput = document.getElementById("news-image-upload") as HTMLInputElement | null;
      if (fileInput) fileInput.value = "";
    }
  }

  function handleImageUrl() {
    if (!imageUrlInput) return;

    try {
      new URL(imageUrlInput);
    } catch {
      setError("Inserisci un URL immagine valido");
      return;
    }

    setError(null);
    setImageUrl(imageUrlInput);
    setImageUrlInput("");
    setShowImageModal(false);
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
        <div>
          <div className="text-xs font-semibold text-secondary/60 uppercase tracking-wider mb-1">
            GESTIONE NEWS › {editId ? "MODIFICA" : "CREA"} NEWS
          </div>
          <h1 className="text-4xl font-bold text-secondary">
            {editId ? "Modifica News" : "Crea nuova news"}
          </h1>
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
        <div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
                <h2 className="text-base sm:text-lg font-semibold text-secondary">Informazioni News</h2>
              </div>

              <div className="p-6 space-y-6">
                {/* Titolo */}
                <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
                  <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
                    Titolo
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
                    Categoria
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
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setImageUrlInput(imageUrl);
                          setShowImageModal(true);
                        }}
                        disabled={uploadingImage}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm text-secondary font-medium hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        {imageUrl ? "Cambia immagine" : "Carica immagine"}
                      </button>
                      {imageUrl && (
                        <button
                          type="button"
                          onClick={() => setImageUrl("")}
                          className="p-2.5 rounded-lg border border-gray-300 bg-white text-secondary hover:bg-gray-50 transition-all"
                          title="Rimuovi immagine"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
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
                    Contenuto
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
            <div className="flex flex-col sm:flex-row gap-3">
              {editId && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting || saving}
                  className="w-full flex items-center justify-center px-6 py-3 text-white bg-[#022431] rounded-lg hover:bg-[#022431]/90 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Eliminazione...</span>
                    </>
                  ) : (
                    <span>Elimina</span>
                  )}
                </button>
              )}
              
              <button
                type="submit"
                disabled={!title || !category || !summary || saving || deleting}
                className="w-full flex items-center justify-center px-6 py-3 bg-secondary text-white font-medium rounded-lg hover:bg-secondary/90 transition-all disabled:bg-secondary/20 disabled:text-secondary/40 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Salvataggio...</span>
                  </>
                ) : (
                  <span>{editId ? "Aggiorna News" : "Crea News"}</span>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Image Modal */}
        {showImageModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="flex items-center justify-between p-6 bg-secondary rounded-t-xl">
                <h3 className="text-xl font-bold text-white">Scegli Immagine</h3>
                <button
                  type="button"
                  onClick={() => setShowImageModal(false)}
                  className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="h-5 w-5 text-white" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Carica un&apos;immagine
                  </label>
                  <button
                    type="button"
                    onClick={() => document.getElementById("news-image-upload")?.click()}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-secondary text-white rounded-xl font-semibold hover:bg-secondary/90 transition-all"
                  >
                    <Upload className="h-5 w-5" />
                    Scegli File
                  </button>
                  <input
                    id="news-image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Massimo 5MB - Formati: JPG, PNG, GIF
                  </p>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500 font-medium">oppure</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Inserisci URL immagine
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                      placeholder="https://esempio.com/immagine.jpg"
                      className="flex-1 px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
                      onKeyDown={(e) => e.key === "Enter" && handleImageUrl()}
                    />
                    <button
                      type="button"
                      onClick={handleImageUrl}
                      disabled={!imageUrlInput}
                      className="px-4 py-3 bg-secondary text-white rounded-xl font-semibold hover:bg-secondary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <LinkIcon className="h-5 w-5" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Incolla l&apos;URL di un&apos;immagine già caricata online
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Spacer */}
        <div className="h-8" />
      </div>
    </AuthGuard>
  );
}
