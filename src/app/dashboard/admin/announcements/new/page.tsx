"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Save, AlertCircle, CheckCircle, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

export default function NewAnnouncementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const isEditMode = !!editId;

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEditMode);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    announcement_type: "announcement" as "announcement" | "event" | "promotion" | "partner" | "news" | "tournament" | "lesson",
    priority: "medium" as "low" | "medium" | "high" | "urgent",
    visibility: "all" as "all" | "atleti" | "maestri" | "public",
    expiry_date: "",
    is_published: false,
    is_pinned: false,
    image_url: "",
    link_url: "",
    link_text: "",
  });

  useEffect(() => {
    if (isEditMode) {
      loadAnnouncement();
    }
  }, [editId]);

  async function loadAnnouncement() {
    try {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("id", editId)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          title: data.title || "",
          content: data.content || "",
          announcement_type: data.announcement_type || "announcement",
          priority: data.priority || "medium",
          visibility: data.visibility || "all",
          expiry_date: data.expiry_date ? data.expiry_date.split("T")[0] : "",
          is_published: data.is_published ?? false,
          is_pinned: data.is_pinned ?? false,
          image_url: data.image_url || "",
          link_url: data.link_url || "",
          link_text: data.link_text || "",
        });
      }
    } catch (err: any) {
      setError("Errore nel caricamento dell'annuncio");
    } finally {
      setLoadingData(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Get session token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError("Sessione non valida");
        return;
      }

      const payload = {
        ...formData,
        expiry_date: formData.expiry_date || null,
        image_url: formData.image_url || null,
        link_url: formData.link_url || null,
        link_text: formData.link_text || null,
      };

      const res = await fetch(
        isEditMode ? `/api/announcements/${editId}` : "/api/announcements",
        {
          method: isEditMode ? "PATCH" : "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/dashboard/admin/announcements");
        }, 1500);
      } else {
        setError(data.error || "Errore durante il salvataggio");
      }
    } catch (error) {
      console.error("Error saving announcement:", error);
      setError("Errore durante il salvataggio dell'annuncio");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Sei sicuro di voler eliminare questo annuncio?")) {
      return;
    }

    try {
      const res = await fetch(`/api/announcements/${editId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.push("/dashboard/admin/announcements");
      } else {
        setError("Errore durante l'eliminazione");
      }
    } catch (error) {
      setError("Errore durante l'eliminazione");
    }
  }

  if (loadingData) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-secondary" />
        <p className="mt-4 text-gray-600">Caricamento...</p>
      </div>
    );
  }

  const typeOptions = [
    { value: "announcement", label: "Generale" },
    { value: "event", label: "Evento" },
    { value: "promotion", label: "Promozione" },
    { value: "partner", label: "Partner" },
    { value: "news", label: "Notizia" },
    { value: "tournament", label: "Torneo" },
    { value: "lesson", label: "Lezione" },
  ];

  const priorityOptions = [
    { value: "low", label: "Bassa" },
    { value: "medium", label: "Media" },
    { value: "high", label: "Alta" },
    { value: "urgent", label: "Urgente" },
  ];

  const visibilityOptions = [
    { value: "all", label: "Tutti" },
    { value: "atleti", label: "Solo Atleti" },
    { value: "maestri", label: "Solo Maestri" },
    { value: "public", label: "Pubblico" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div>
          <div className="text-xs font-semibold text-secondary/60 uppercase tracking-wider mb-1">
            GESTIONE ANNUNCI › {isEditMode ? "MODIFICA" : "CREA"} ANNUNCIO
          </div>
          <h1 className="text-3xl font-bold text-secondary">{isEditMode ? "Modifica" : "Crea"} annuncio</h1>
          <p className="text-gray-600 text-sm mt-1 max-w-2xl">
            {isEditMode ? "Modifica i dati dell'annuncio" : "Compila i campi per creare un nuovo annuncio per la bacheca"}
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
              <p className="text-sm text-green-700 mt-1">{isEditMode ? "Annuncio aggiornato con successo! Reindirizzamento..." : "Annuncio creato con successo! Reindirizzamento..."}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="py-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-secondary mb-6">Contenuto Annuncio</h2>
            
            <div className="space-y-6">
              {/* Title */}
              <div className="flex flex-col md:flex-row md:items-start gap-3 sm:gap-4 md:gap-8 pb-6 border-b border-gray-200">
                <label className="w-full md:w-48 pt-0 md:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
                  Titolo <span className="text-red-600">*</span>
                </label>
                <div className="flex-1">
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Inserisci il titolo dell'annuncio"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                    required
                  />
                </div>
              </div>

              {/* Content */}
              <div className="flex flex-col md:flex-row md:items-start gap-3 sm:gap-4 md:gap-8 pb-6 border-b border-gray-200">
                <label className="w-full md:w-48 pt-0 md:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
                  Contenuto <span className="text-red-600">*</span>
                </label>
                <div className="flex-1">
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Scrivi il contenuto dell'annuncio..."
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50 resize-none min-h-[150px]"
                    required
                  />
                </div>
              </div>

              {/* Type */}
              <div className="flex flex-col md:flex-row md:items-start gap-3 sm:gap-4 md:gap-8 pb-6 border-b border-gray-200">
                <label className="w-full md:w-48 pt-0 md:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
                  Tipo Annuncio <span className="text-red-600">*</span>
                </label>
                <div className="flex-1 flex flex-wrap gap-3">
                  {typeOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, announcement_type: option.value as any })}
                      className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                        formData.announcement_type === option.value
                          ? "text-white bg-secondary hover:opacity-90"
                          : "bg-white text-secondary border border-gray-300 hover:border-secondary"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority */}
              <div className="flex flex-col md:flex-row md:items-start gap-3 sm:gap-4 md:gap-8 pb-6 border-b border-gray-200">
                <label className="w-full md:w-48 pt-0 md:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Priorità</label>
                <div className="flex-1 flex gap-3">
                  {priorityOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, priority: option.value as any })}
                      className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                        formData.priority === option.value
                          ? "text-white bg-secondary hover:opacity-90"
                          : "bg-white text-secondary border border-gray-300 hover:border-secondary"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Visibility */}
              <div className="flex flex-col md:flex-row md:items-start gap-3 sm:gap-4 md:gap-8">
                <label className="w-full md:w-48 pt-0 md:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Visibilità</label>
                <div className="flex-1 flex flex-wrap gap-3">
                  {visibilityOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, visibility: option.value as any })}
                      className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                        formData.visibility === option.value
                          ? "text-white bg-secondary hover:opacity-90"
                          : "bg-white text-secondary border border-gray-300 hover:border-secondary"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-secondary mb-6">Media e Collegamenti</h2>
            
            <div className="space-y-6">
              {/* Image URL */}
              <div className="flex flex-col md:flex-row md:items-start gap-3 sm:gap-4 md:gap-8 pb-6 border-b border-gray-200">
                <label className="w-full md:w-48 pt-0 md:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">URL Immagine</label>
                <div className="flex-1">
                  <input
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder="https://esempio.com/immagine.jpg"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                  />
                </div>
              </div>

              {/* Link URL */}
              <div className="flex flex-col md:flex-row md:items-start gap-3 sm:gap-4 md:gap-8 pb-6 border-b border-gray-200">
                <label className="w-full md:w-48 pt-0 md:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">URL Link</label>
                <div className="flex-1">
                  <input
                    type="url"
                    value={formData.link_url}
                    onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                    placeholder="https://esempio.com"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                  />
                </div>
              </div>

              {/* Link Text */}
              <div className="flex flex-col md:flex-row md:items-start gap-3 sm:gap-4 md:gap-8">
                <label className="w-full md:w-48 pt-0 md:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Testo Link</label>
                <div className="flex-1">
                  <input
                    type="text"
                    value={formData.link_text}
                    onChange={(e) => setFormData({ ...formData, link_text: e.target.value })}
                    placeholder="Scopri di più"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-secondary mb-6">Impostazioni</h2>
            
            <div className="space-y-6">
              {/* Expiry Date */}
              <div className="flex flex-col md:flex-row md:items-start gap-3 sm:gap-4 md:gap-8 pb-6 border-b border-gray-200">
                <label className="w-full md:w-48 pt-0 md:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Data di Scadenza</label>
                <div className="flex-1">
                  <input
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                  />
                </div>
              </div>

              {/* Options */}
              <div className="flex flex-col md:flex-row md:items-start gap-3 sm:gap-4 md:gap-8">
                <label className="w-full md:w-48 pt-0 md:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Opzioni</label>
                <div className="flex-1 flex gap-6">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_published}
                      onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                      className="w-5 h-5 rounded border-2 border-gray-300 bg-white checked:bg-secondary checked:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30"
                    />
                    <span className="text-sm font-medium text-secondary">Pubblica subito</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_pinned}
                      onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
                      className="w-5 h-5 rounded border-2 border-gray-300 bg-white checked:bg-secondary checked:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30"
                    />
                    <span className="text-sm font-medium text-secondary">Fissa in alto</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Submit and Delete Buttons */}
          <div className="flex justify-between items-center pt-4">
            {isEditMode && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 px-6 py-4 text-base font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="h-5 w-5" />
                Elimina Annuncio
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className={`inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-white bg-secondary rounded-md hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed min-w-[200px] ${!isEditMode ? 'ml-auto' : ''}`}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {isEditMode ? "Aggiornamento..." : "Creazione in corso..."}
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5" />
                  {isEditMode ? "Aggiorna Annuncio" : "Conferma e Crea"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
