"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { CheckCircle, AlertCircle, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";

type FormData = {
  full_name: string;
  role: string;
  bio: string;
  image_url: string;
  facebook_url: string;
  instagram_url: string;
  linkedin_url: string;
  twitter_url: string;
  order_index: number;
  active: boolean;
};

export default function NewStaffPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const isEditMode = !!editId;

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEditMode);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState<FormData>({
    full_name: "",
    role: "",
    bio: "",
    image_url: "",
    facebook_url: "",
    instagram_url: "",
    linkedin_url: "",
    twitter_url: "",
    order_index: 0,
    active: true,
  });

  useEffect(() => {
    if (isEditMode) {
      loadStaffMember();
    }
  }, [editId]);

  async function loadStaffMember() {
    try {
      const { data, error } = await supabase
        .from("staff")
        .select("*")
        .eq("id", editId)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          full_name: data.full_name || "",
          role: data.role || "",
          bio: data.bio || "",
          image_url: data.image_url || "",
          facebook_url: data.facebook_url || "",
          instagram_url: data.instagram_url || "",
          linkedin_url: data.linkedin_url || "",
          twitter_url: data.twitter_url || "",
          order_index: data.order_index || 0,
          active: data.active ?? true,
        });
      }
    } catch (err: any) {
      setError("Errore nel caricamento dei dati");
    } finally {
      setLoadingData(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const dataToSave = {
        full_name: formData.full_name,
        role: formData.role,
        bio: formData.bio || null,
        image_url: formData.image_url || null,
        facebook_url: formData.facebook_url || null,
        instagram_url: formData.instagram_url || null,
        linkedin_url: formData.linkedin_url || null,
        twitter_url: formData.twitter_url || null,
        order_index: formData.order_index,
        active: formData.active,
      };

      if (isEditMode) {
        const { error } = await supabase
          .from("staff")
          .update(dataToSave)
          .eq("id", editId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("staff")
          .insert(dataToSave);

        if (error) throw error;
      }

      setSuccess(isEditMode ? "Membro aggiornato con successo!" : "Membro creato con successo!");
      setTimeout(() => {
        router.push("/dashboard/admin/staff");
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Errore durante il salvataggio");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Sei sicuro di voler eliminare questo membro dello staff?")) {
      return;
    }

    try {
      const { error } = await supabase.from("staff").delete().eq("id", editId);

      if (error) throw error;

      router.push("/dashboard/admin/staff");
    } catch (err: any) {
      setError("Errore durante l'eliminazione");
    }
  }

  if (loadingData) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-secondary" />
        <p className="mt-4 text-secondary/60">Caricamento...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div>
          <div className="text-xs font-semibold text-secondary/60 uppercase tracking-wider mb-1">
            GESTIONE STAFF › {isEditMode ? "MODIFICA" : "NUOVO"} MEMBRO
          </div>
          <h1 className="text-3xl font-bold text-secondary">
            {isEditMode ? "Modifica membro" : "Crea membro"}
          </h1>
          <p className="text-gray-600 text-sm mt-1 max-w-2xl">
            {isEditMode ? "Modifica i dati del membro dello staff" : "Aggiungi un nuovo membro al team"}
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
            <h2 className="text-lg font-semibold text-secondary mb-6">Informazioni Membro</h2>
            
            <div className="space-y-6">
              {/* Nome Completo */}
              <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
                <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
                  Nome Completo <span className="text-red-600">*</span>
                </label>
                <div className="flex-1">
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="Mario Rossi"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                    required
                  />
                </div>
              </div>

              {/* Ruolo */}
              <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
                <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
                  Ruolo <span className="text-red-600">*</span>
                </label>
                <div className="flex-1">
                  <input
                    type="text"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    placeholder="Maestro FIT"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                    required
                  />
                </div>
              </div>

              {/* Bio */}
              <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
                <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
                  Biografia
                </label>
                <div className="flex-1">
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Descrizione del membro dello staff..."
                    rows={4}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50 resize-none"
                  />
                </div>
              </div>

              {/* URL Immagine */}
              <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
                <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
                  URL Immagine
                </label>
                <div className="flex-1">
                  <input
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder="https://esempio.com/foto.jpg"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                  />
                  {formData.image_url && (
                    <div className="mt-3">
                      <img
                        src={formData.image_url}
                        alt="Preview"
                        className="h-32 w-32 rounded-lg object-cover border-2 border-gray-200"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Social Links */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-secondary mb-6">Link Social</h2>
            
            <div className="space-y-6">
              {/* Facebook */}
              <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
                <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
                  Facebook
                </label>
                <div className="flex-1">
                  <input
                    type="url"
                    value={formData.facebook_url}
                    onChange={(e) => setFormData({ ...formData, facebook_url: e.target.value })}
                    placeholder="https://facebook.com/..."
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                  />
                </div>
              </div>

              {/* Instagram */}
              <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
                <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
                  Instagram
                </label>
                <div className="flex-1">
                  <input
                    type="url"
                    value={formData.instagram_url}
                    onChange={(e) => setFormData({ ...formData, instagram_url: e.target.value })}
                    placeholder="https://instagram.com/..."
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                  />
                </div>
              </div>

              {/* LinkedIn */}
              <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
                <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
                  LinkedIn
                </label>
                <div className="flex-1">
                  <input
                    type="url"
                    value={formData.linkedin_url}
                    onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                    placeholder="https://linkedin.com/in/..."
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                  />
                </div>
              </div>

              {/* Twitter */}
              <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
                <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
                  Twitter
                </label>
                <div className="flex-1">
                  <input
                    type="url"
                    value={formData.twitter_url}
                    onChange={(e) => setFormData({ ...formData, twitter_url: e.target.value })}
                    placeholder="https://twitter.com/..."
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Ordine e Stato */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-secondary mb-6">Impostazioni</h2>
            
            <div className="space-y-6">
              {/* Ordine */}
              <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
                <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
                  Ordine di visualizzazione
                </label>
                <div className="flex-1">
                  <input
                    type="number"
                    value={formData.order_index}
                    onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                  />
                </div>
              </div>

              {/* Stato */}
              <div className="flex items-start gap-8">
                <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
                  Stato
                </label>
                <div className="flex-1">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      className="w-5 h-5 rounded border-2 border-gray-300 bg-white checked:bg-secondary checked:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30"
                    />
                    <span className="text-sm font-medium text-secondary">Attivo</span>
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
                Elimina Membro
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
                  Salvataggio...
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5" />
                  {isEditMode ? "Aggiorna Membro" : "Crea Membro"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
