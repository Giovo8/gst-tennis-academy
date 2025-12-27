"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { ArrowLeft, Plus, Edit2, Trash2, Save, X, Image as ImageIcon } from "lucide-react";
import Link from "next/link";

type HeroImage = {
  id: string;
  image_url: string;
  alt_text: string;
  order_index: number;
  active: boolean;
};

type FormData = {
  image_url: string;
  alt_text: string;
  order_index: number;
  active: boolean;
};

export default function AdminHeroImagesPage() {
  const [images, setImages] = useState<HeroImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    image_url: "",
    alt_text: "",
    order_index: 0,
    active: true,
  });

  useEffect(() => {
    loadImages();
  }, []);

  async function loadImages() {
    try {
      const response = await fetch("/api/hero-images?all=true");
      const data = await response.json();
      setImages(data || []);
    } catch (error) {
      console.error("Errore nel caricamento delle immagini:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(image: HeroImage) {
    setEditingId(image.id);
    setFormData({
      image_url: image.image_url,
      alt_text: image.alt_text,
      order_index: image.order_index,
      active: image.active,
    });
    setShowForm(true);
  }

  function handleNew() {
    setEditingId(null);
    setFormData({
      image_url: "",
      alt_text: "",
      order_index: images.length,
      active: true,
    });
    setShowForm(true);
  }

  function handleCancel() {
    setEditingId(null);
    setShowForm(false);
    setFormData({
      image_url: "",
      alt_text: "",
      order_index: 0,
      active: true,
    });
  }

  async function handleSave() {
    try {
      if (editingId) {
        // Update existing
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch("/api/hero-images", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ id: editingId, ...formData }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update");
        }
      } else {
        // Create new
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch("/api/hero-images", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create");
        }
      }

      await loadImages();
      handleCancel();
    } catch (error: any) {
      alert(`Errore nel salvataggio dell'immagine: ${error.message}`);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Sei sicuro di voler eliminare questa immagine?")) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/hero-images?id=${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${session?.access_token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to delete");

      await loadImages();
    } catch (error) {
      console.error("Errore nell'eliminazione:", error);
      alert("Errore nell'eliminazione dell'immagine");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#021627] text-white p-6">
        <div className="mx-auto max-w-5xl">
          <p>Caricamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#021627] text-white p-6">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/admin"
              className="rounded-lg border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-2 hover:bg-[#1a3d5c]/80 transition"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-3xl font-bold">Gestione Immagini Hero</h1>
          </div>
          <button
            onClick={handleNew}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-[#06101f] hover:bg-[#5fc7e0] transition"
          >
            <Plus className="h-4 w-4" />
            Nuova Immagine
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="mb-8 rounded-xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingId ? "Modifica Immagine" : "Nuova Immagine"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">URL Immagine</label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className="w-full rounded-lg border border-[#2f7de1]/30 bg-[#021627] px-4 py-2 text-white"
                  placeholder="https://esempio.com/immagine.jpg"
                />
                {formData.image_url && (
                  <div className="mt-2">
                    <img
                      src={formData.image_url}
                      alt="Preview"
                      className="h-48 w-auto rounded-lg object-cover"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Testo Alternativo</label>
                <input
                  type="text"
                  value={formData.alt_text}
                  onChange={(e) => setFormData({ ...formData, alt_text: e.target.value })}
                  className="w-full rounded-lg border border-[#2f7de1]/30 bg-[#021627] px-4 py-2 text-white"
                  placeholder="Campo da tennis professionale"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Ordine</label>
                  <input
                    type="number"
                    value={formData.order_index}
                    onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) })}
                    className="w-full rounded-lg border border-[#2f7de1]/30 bg-[#021627] px-4 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Stato</label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      className="h-4 w-4 rounded border-[#2f7de1]/30"
                    />
                    <span className="text-sm">Attiva</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSave}
                  className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-[#06101f] hover:bg-[#5fc7e0] transition"
                >
                  <Save className="h-4 w-4" />
                  Salva
                </button>
                <button
                  onClick={handleCancel}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#2f7de1]/30 px-4 py-2 text-sm font-semibold text-white hover:bg-[#1a3d5c]/60 transition"
                >
                  <X className="h-4 w-4" />
                  Annulla
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Images Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {images.length === 0 ? (
            <div className="col-span-full rounded-xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-8 text-center">
              <p className="text-muted">Nessuna immagine presente.</p>
            </div>
          ) : (
            images.map((image) => (
              <div
                key={image.id}
                className="group relative rounded-xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 overflow-hidden"
              >
                {/* Image */}
                <div className="aspect-video overflow-hidden">
                  {image.image_url ? (
                    <img
                      src={image.image_url}
                      alt={image.alt_text}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[#2f7de1]/30">
                      <ImageIcon className="h-12 w-12 text-muted" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <p className="text-sm text-white line-clamp-2">{image.alt_text}</p>
                    {!image.active && (
                      <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-400 flex-shrink-0">
                        Non attiva
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(image)}
                      className="flex-1 rounded-lg border border-[#2f7de1]/30 bg-[#021627] px-3 py-2 text-sm hover:bg-[#1a3d5c]/60 transition inline-flex items-center justify-center gap-2"
                    >
                      <Edit2 className="h-4 w-4 text-accent" />
                      Modifica
                    </button>
                    <button
                      onClick={() => handleDelete(image.id)}
                      className="flex-1 rounded-lg border border-red-500/30 bg-[#021627] px-3 py-2 text-sm hover:bg-red-500/20 transition inline-flex items-center justify-center gap-2"
                    >
                      <Trash2 className="h-4 w-4 text-red-400" />
                      Elimina
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
