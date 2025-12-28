"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Save, ChevronUp, ChevronDown, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

type Section = {
  id: string;
  section_key: string;
  section_name: string;
  order_index: number;
  active: boolean;
};

export default function AdminHomepageOrderPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSections();
  }, []);

  async function loadSections() {
    try {
      const response = await fetch("/api/homepage-sections");
      const data = await response.json();
      setSections(data || []);
    } catch (error) {
      // Handle error silently
    } finally {
      setLoading(false);
    }
  }

  function moveUp(index: number) {
    if (index === 0) return;
    
    const newSections = [...sections];
    [newSections[index], newSections[index - 1]] = [newSections[index - 1], newSections[index]];
    
    // Update order_index
    newSections.forEach((section, idx) => {
      section.order_index = idx;
    });
    
    setSections(newSections);
  }

  function moveDown(index: number) {
    if (index === sections.length - 1) return;
    
    const newSections = [...sections];
    [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
    
    // Update order_index
    newSections.forEach((section, idx) => {
      section.order_index = idx;
    });
    
    setSections(newSections);
  }

  function toggleActive(index: number) {
    const newSections = [...sections];
    newSections[index].active = !newSections[index].active;
    setSections(newSections);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const response = await fetch("/api/homepage-sections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sections: sections.map(s => ({
            id: s.id,
            order_index: s.order_index,
            active: s.active
          }))
        }),
      });

      if (!response.ok) throw new Error("Failed to save");

      alert("Ordine salvato con successo!");
    } catch (error) {
      // Handle error with user feedback
      alert("Errore nel salvataggio dell'ordine");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#021627] text-white p-6">
        <div className="mx-auto max-w-3xl">
          <p>Caricamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#021627] text-white p-6">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/admin"
              className="rounded-lg border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-2 hover:bg-[#1a3d5c]/80 transition"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Ordine Sezioni Homepage</h1>
              <p className="text-sm text-muted mt-1">Riordina le sezioni trascinando o usando le frecce</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-[#06101f] hover:bg-[#5fc7e0] transition disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "Salvataggio..." : "Salva Ordine"}
          </button>
        </div>

        {/* Sections List */}
        <div className="rounded-xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-6">
          <div className="space-y-3">
            {sections.map((section, index) => (
              <div
                key={section.id}
                className={`flex items-center gap-4 rounded-lg border border-[#2f7de1]/30 bg-[#021627] p-4 transition ${
                  !section.active ? "opacity-50" : ""
                }`}
              >
                {/* Order number */}
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/20 text-accent font-semibold flex-shrink-0">
                  {index + 1}
                </div>

                {/* Section name */}
                <div className="flex-1">
                  <h3 className="font-semibold text-white">{section.section_name}</h3>
                  <p className="text-xs text-muted">{section.section_key}</p>
                </div>

                {/* Status badge */}
                <div className="flex-shrink-0">
                  {section.active ? (
                    <span className="rounded-full bg-green-500/20 px-3 py-1 text-xs text-green-400">
                      Visibile
                    </span>
                  ) : (
                    <span className="rounded-full bg-gray-500/20 px-3 py-1 text-xs text-gray-400">
                      Nascosta
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => toggleActive(index)}
                    className="rounded-lg border border-[#2f7de1]/30 bg-[#021627] p-2 hover:bg-[#1a3d5c]/60 transition"
                    title={section.active ? "Nascondi sezione" : "Mostra sezione"}
                  >
                    {section.active ? (
                      <Eye className="h-4 w-4 text-accent" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-muted" />
                    )}
                  </button>
                  <button
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    className="rounded-lg border border-[#2f7de1]/30 bg-[#021627] p-2 hover:bg-[#1a3d5c]/60 transition disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Sposta su"
                  >
                    <ChevronUp className="h-4 w-4 text-accent" />
                  </button>
                  <button
                    onClick={() => moveDown(index)}
                    disabled={index === sections.length - 1}
                    className="rounded-lg border border-[#2f7de1]/30 bg-[#021627] p-2 hover:bg-[#1a3d5c]/60 transition disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Sposta giù"
                  >
                    <ChevronDown className="h-4 w-4 text-accent" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Info */}
          <div className="mt-6 rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
            <p className="text-sm text-blue-300">
              💡 <strong>Nota:</strong> Le sezioni nascoste non verranno visualizzate nella homepage.
              Usa le frecce per cambiare l'ordine, poi clicca "Salva Ordine" per applicare le modifiche.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
