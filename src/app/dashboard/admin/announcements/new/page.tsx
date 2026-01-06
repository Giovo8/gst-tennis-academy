"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

export default function NewAnnouncementPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
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

      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/dashboard/admin/announcements");
        }, 1500);
      } else {
        setError(data.error || "Errore durante la creazione");
      }
    } catch (error) {
      console.error("Error creating announcement:", error);
      setError("Errore durante la creazione dell'annuncio");
    } finally {
      setLoading(false);
    }
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
          <Link
            href="/dashboard/admin/announcements"
            className="inline-flex items-center text-xs font-semibold text-secondary/60 uppercase tracking-wider mb-1 hover:text-secondary/80 transition-colors"
          >
            Annunci
          </Link>
          <h1 className="text-3xl font-bold text-secondary">Crea annuncio</h1>
          <p className="text-secondary/70 text-sm mt-1 max-w-2xl">
            Compila i campi per creare un nuovo annuncio per la bacheca
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
              <p className="text-sm text-green-700 mt-1">Annuncio creato con successo! Reindirizzamento...</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="py-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-xl p-6 space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-secondary mb-2">
                Titolo <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Inserisci il titolo dell'annuncio"
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                required
              />
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-semibold text-secondary mb-2">
                Contenuto <span className="text-red-600">*</span>
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Scrivi il contenuto dell'annuncio..."
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50 min-h-[150px]"
                required
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-semibold text-secondary mb-2">
                Tipo Annuncio <span className="text-red-600">*</span>
              </label>
              <div className="grid gap-3 md:grid-cols-5">
                {typeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, announcement_type: option.value as any })}
                    className={`p-3 rounded-md text-sm font-semibold transition-all ${
                      formData.announcement_type === option.value
                        ? "text-white bg-secondary hover:opacity-90"
                        : "bg-white text-secondary/70 hover:bg-secondary/5 border border-gray-200"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-semibold text-secondary mb-2">Priorità</label>
              <div className="flex gap-3">
                {priorityOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, priority: option.value as any })}
                    className={`flex-1 p-3 rounded-md text-sm font-semibold transition-all ${
                      formData.priority === option.value
                        ? "text-white bg-secondary hover:opacity-90"
                        : "bg-white text-secondary/70 hover:bg-secondary/5 border border-gray-200"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Visibility */}
            <div>
              <label className="block text-sm font-semibold text-secondary mb-2">Visibilità</label>
              <div className="grid gap-3 md:grid-cols-4">
                {visibilityOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, visibility: option.value as any })}
                    className={`p-3 rounded-md text-sm font-semibold transition-all ${
                      formData.visibility === option.value
                        ? "text-white bg-secondary hover:opacity-90"
                        : "bg-white text-secondary/70 hover:bg-secondary/5 border border-gray-200"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Expiry Date */}
            <div>
              <label className="block text-sm font-semibold text-secondary mb-2">Data di Scadenza (opzionale)</label>
              <input
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
              />
            </div>

            {/* Image URL */}
            <div>
              <label className="block text-sm font-semibold text-secondary mb-2">URL Immagine (opzionale)</label>
              <input
                type="url"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                placeholder="https://esempio.com/immagine.jpg"
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
              />
            </div>

            {/* Link */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-secondary mb-2">URL Link (opzionale)</label>
                <input
                  type="url"
                  value={formData.link_url}
                  onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                  placeholder="https://esempio.com"
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-secondary mb-2">Testo Link</label>
                <input
                  type="text"
                  value={formData.link_text}
                  onChange={(e) => setFormData({ ...formData, link_text: e.target.value })}
                  placeholder="Scopri di più"
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                />
              </div>
            </div>

            {/* Options */}
            <div className="flex gap-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_published}
                  onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                  className="w-5 h-5 rounded border-2 border-gray-300 bg-white checked:bg-secondary checked:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30"
                />
                <span className="text-sm font-semibold text-secondary">Pubblica subito</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_pinned}
                  onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
                  className="w-5 h-5 rounded border-2 border-gray-300 bg-white checked:bg-secondary checked:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30"
                />
                <span className="text-sm font-semibold text-secondary">Fissa in alto</span>
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-white bg-secondary rounded-md hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed min-w-[200px]"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Creazione in corso...
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5" />
                  Conferma e Crea
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
