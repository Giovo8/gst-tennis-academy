"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, AlertCircle, CheckCircle } from "lucide-react";
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
    { value: "announcement", label: "Generale", color: "bg-blue-500/20 text-blue-300" },
    { value: "event", label: "Evento", color: "bg-purple-500/20 text-purple-300" },
    { value: "promotion", label: "Promozione", color: "bg-green-500/20 text-green-300" },
    { value: "partner", label: "Partner", color: "bg-yellow-500/20 text-yellow-300" },
    { value: "news", label: "Notizia", color: "bg-cyan-500/20 text-cyan-300" },
    { value: "tournament", label: "Torneo", color: "bg-orange-500/20 text-orange-300" },
    { value: "lesson", label: "Lezione", color: "bg-pink-500/20 text-pink-300" },
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
    <div className="p-6">
      <main className="container mx-auto">
        <div className="mb-8">
          <Link
            href="/dashboard/admin/announcements"
            className="inline-flex items-center gap-2 text-cyan-600 hover:text-cyan-700 mb-4 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Torna agli annunci
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Nuovo Annuncio</h1>
          <p className="text-gray-600">Crea un nuovo annuncio per la bacheca</p>
        </div>

        {success && (
          <div className="mb-6 rounded-xl bg-green-500/20 border-2 border-green-500/40 p-4 flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
            <p className="text-green-300 text-sm">Annuncio creato con successo! Reindirizzamento...</p>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl bg-red-500/20 border-2 border-red-500/40 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-2xl border-2 border-white/20 bg-white/5 backdrop-blur-xl p-8 space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-white mb-3">
                Titolo <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Inserisci il titolo dell'annuncio"
                className="w-full rounded-xl bg-white/5 border-2 border-white/10 px-4 py-3 text-white placeholder-gray-500 focus:border-cyan-400/60 focus:outline-none"
                required
              />
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-semibold text-white mb-3">
                Contenuto <span className="text-red-400">*</span>
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Scrivi il contenuto dell'annuncio..."
                className="w-full rounded-xl bg-white/5 border-2 border-white/10 px-4 py-3 text-white placeholder-gray-500 focus:border-cyan-400/60 focus:outline-none min-h-[150px]"
                required
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-semibold text-white mb-3">
                Tipo Annuncio <span className="text-red-400">*</span>
              </label>
              <div className="grid gap-3 md:grid-cols-5">
                {typeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, announcement_type: option.value as any })}
                    className={`p-4 rounded-xl text-sm font-semibold transition-all ${
                      formData.announcement_type === option.value
                        ? "bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-2 border-blue-400/60"
                        : "bg-white/5 border-2 border-white/10 hover:border-white/30 text-gray-300"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-semibold text-white mb-3">Priorità</label>
              <div className="flex gap-3">
                {priorityOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, priority: option.value as any })}
                    className={`flex-1 p-3 rounded-xl text-sm font-semibold transition-all ${
                      formData.priority === option.value
                        ? "bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-2 border-blue-400/60"
                        : "bg-white/5 border-2 border-white/10 hover:border-white/30 text-gray-300"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Visibility */}
            <div>
              <label className="block text-sm font-semibold text-white mb-3">Visibilità</label>
              <div className="grid gap-3 md:grid-cols-4">
                {visibilityOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, visibility: option.value as any })}
                    className={`p-3 rounded-xl text-sm font-semibold transition-all ${
                      formData.visibility === option.value
                        ? "bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-2 border-blue-400/60"
                        : "bg-white/5 border-2 border-white/10 hover:border-white/30 text-gray-300"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Expiry Date */}
            <div>
              <label className="block text-sm font-semibold text-white mb-3">Data di Scadenza (opzionale)</label>
              <input
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                className="w-full rounded-xl bg-white/5 border-2 border-white/10 px-4 py-3 text-white focus:border-cyan-400/60 focus:outline-none"
              />
            </div>

            {/* Image URL */}
            <div>
              <label className="block text-sm font-semibold text-white mb-3">URL Immagine (opzionale)</label>
              <input
                type="url"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                placeholder="https://esempio.com/immagine.jpg"
                className="w-full rounded-xl bg-white/5 border-2 border-white/10 px-4 py-3 text-white placeholder-gray-500 focus:border-cyan-400/60 focus:outline-none"
              />
            </div>

            {/* Link */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-white mb-3">URL Link (opzionale)</label>
                <input
                  type="url"
                  value={formData.link_url}
                  onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                  placeholder="https://esempio.com"
                  className="w-full rounded-xl bg-white/5 border-2 border-white/10 px-4 py-3 text-white placeholder-gray-500 focus:border-cyan-400/60 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-white mb-3">Testo Link</label>
                <input
                  type="text"
                  value={formData.link_text}
                  onChange={(e) => setFormData({ ...formData, link_text: e.target.value })}
                  placeholder="Scopri di più"
                  className="w-full rounded-xl bg-white/5 border-2 border-white/10 px-4 py-3 text-white placeholder-gray-500 focus:border-cyan-400/60 focus:outline-none"
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
                  className="w-5 h-5 rounded border-2 border-white/20 bg-white/5 checked:bg-cyan-500 checked:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                />
                <span className="text-sm font-semibold text-white">Pubblica subito</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_pinned}
                  onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
                  className="w-5 h-5 rounded border-2 border-white/20 bg-white/5 checked:bg-cyan-500 checked:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                />
                <span className="text-sm font-semibold text-white">Fissa in alto</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 justify-end">
            <Link
              href="/dashboard/admin/announcements"
              className="px-6 py-3 rounded-xl bg-white/5 border-2 border-white/10 text-white font-semibold hover:border-white/30 transition-all"
            >
              Annulla
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold hover:shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Creazione...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  Crea Annuncio
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
