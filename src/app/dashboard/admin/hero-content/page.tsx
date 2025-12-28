"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";

type HeroContent = {
  id: string;
  badge_text: string;
  title: string;
  title_highlight: string;
  subtitle: string;
  primary_button_text: string;
  primary_button_link: string;
  secondary_button_text: string;
  secondary_button_link: string;
  stat1_value: string;
  stat1_label: string;
  stat2_value: string;
  stat2_label: string;
  stat3_value: string;
  stat3_label: string;
};

export default function AdminHeroContentPage() {
  const [content, setContent] = useState<HeroContent | null>(null);
  const [formData, setFormData] = useState<Partial<HeroContent>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadContent();
  }, []);

  async function loadContent() {
    try {
      const response = await fetch("/api/hero-content");
      const data = await response.json();
      setContent(data);
      setFormData(data);
    } catch (error) {
      // Handle error silently
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!content) return;
    
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch("/api/hero-content", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ id: content.id, ...formData }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Errore nel salvataggio");
      }

      alert("Contenuti aggiornati con successo!");
      await loadContent();
    } catch (error: any) {
      alert(`Errore: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted">Caricamento...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/admin"
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" />
              Torna alla Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-white">Gestione Contenuti Hero</h1>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "Salvataggio..." : "Salva Modifiche"}
          </button>
        </div>

        <div className="space-y-6 rounded-2xl border border-white/10 bg-white/5 p-6">
          {/* Badge */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">Badge Testo</label>
            <input
              type="text"
              value={formData.badge_text || ""}
              onChange={(e) => setFormData({ ...formData, badge_text: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder:text-muted focus:border-accent focus:outline-none"
              placeholder="Cresci nel tuo tennis"
            />
          </div>

          {/* Titolo */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">Titolo Principale</label>
            <textarea
              value={formData.title || ""}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder:text-muted focus:border-accent focus:outline-none"
              placeholder="Allenamento di alto livello..."
            />
          </div>

          {/* Highlight */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">Parola Evidenziata (verrà colorata in azzurro)</label>
            <input
              type="text"
              value={formData.title_highlight || ""}
              onChange={(e) => setFormData({ ...formData, title_highlight: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder:text-muted focus:border-accent focus:outline-none"
              placeholder="metodo scientifico"
            />
          </div>

          {/* Sottotitolo */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">Sottotitolo</label>
            <textarea
              value={formData.subtitle || ""}
              onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder:text-muted focus:border-accent focus:outline-none"
              placeholder="Programmi personalizzati..."
            />
          </div>

          {/* Statistiche */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Statistiche</h3>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white">Stat 1 - Valore</label>
                <input
                  type="text"
                  value={formData.stat1_value || ""}
                  onChange={(e) => setFormData({ ...formData, stat1_value: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder:text-muted focus:border-accent focus:outline-none"
                />
                <label className="block text-sm font-medium text-white mt-2">Stat 1 - Etichetta</label>
                <input
                  type="text"
                  value={formData.stat1_label || ""}
                  onChange={(e) => setFormData({ ...formData, stat1_label: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder:text-muted focus:border-accent focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-white">Stat 2 - Valore</label>
                <input
                  type="text"
                  value={formData.stat2_value || ""}
                  onChange={(e) => setFormData({ ...formData, stat2_value: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder:text-muted focus:border-accent focus:outline-none"
                />
                <label className="block text-sm font-medium text-white mt-2">Stat 2 - Etichetta</label>
                <input
                  type="text"
                  value={formData.stat2_label || ""}
                  onChange={(e) => setFormData({ ...formData, stat2_label: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder:text-muted focus:border-accent focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-white">Stat 3 - Valore</label>
                <input
                  type="text"
                  value={formData.stat3_value || ""}
                  onChange={(e) => setFormData({ ...formData, stat3_value: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder:text-muted focus:border-accent focus:outline-none"
                />
                <label className="block text-sm font-medium text-white mt-2">Stat 3 - Etichetta</label>
                <input
                  type="text"
                  value={formData.stat3_label || ""}
                  onChange={(e) => setFormData({ ...formData, stat3_label: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder:text-muted focus:border-accent focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
