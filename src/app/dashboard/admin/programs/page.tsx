"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { ArrowLeft, Plus, Edit2, Trash2, Save, X, Target } from "lucide-react";
import Link from "next/link";

type Program = {
  id: string;
  title: string;
  focus: string;
  points: string[];
  order_index: number;
  active: boolean;
};

type FormData = {
  title: string;
  focus: string;
  points: string[];
  order_index: number;
  active: boolean;
};

export default function AdminProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [pointInput, setPointInput] = useState("");
  const [formData, setFormData] = useState<FormData>({
    title: "",
    focus: "",
    points: [],
    order_index: 0,
    active: true,
  });

  useEffect(() => {
    loadPrograms();
  }, []);

  async function loadPrograms() {
    try {
      const response = await fetch("/api/programs?all=true");
      const data = await response.json();
      setPrograms(data || []);
    } catch (error) {
      // Handle error silently
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(program: Program) {
    setEditingId(program.id);
    setFormData({
      title: program.title,
      focus: program.focus,
      points: program.points,
      order_index: program.order_index,
      active: program.active,
    });
    setShowForm(true);
  }

  function handleNew() {
    setEditingId(null);
    setFormData({
      title: "",
      focus: "",
      points: [],
      order_index: programs.length,
      active: true,
    });
    setShowForm(true);
  }

  function handleCancel() {
    setEditingId(null);
    setShowForm(false);
    setPointInput("");
    setFormData({
      title: "",
      focus: "",
      points: [],
      order_index: 0,
      active: true,
    });
  }

  function addPoint() {
    if (pointInput.trim()) {
      setFormData({
        ...formData,
        points: [...formData.points, pointInput.trim()],
      });
      setPointInput("");
    }
  }

  function removePoint(index: number) {
    setFormData({
      ...formData,
      points: formData.points.filter((_, i) => i !== index),
    });
  }

  async function handleSave() {
    try {
      if (editingId) {
        // Update existing
        const response = await fetch("/api/programs", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingId, ...formData }),
        });

        if (!response.ok) throw new Error("Failed to update");
      } else {
        // Create new
        const response = await fetch("/api/programs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (!response.ok) throw new Error("Failed to create");
      }

      await loadPrograms();
      handleCancel();
    } catch (error) {
      // Handle error with user feedback
      alert("Errore nel salvataggio del programma");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Sei sicuro di voler eliminare questo programma?")) {
      return;
    }

    try {
      const response = await fetch(`/api/programs?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete");

      await loadPrograms();
    } catch (error) {
      // Handle error with user feedback
      alert("Errore nell'eliminazione del programma");
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
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/admin"
              className="rounded-lg border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-2 hover:bg-[#1a3d5c]/80 transition"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-3xl font-bold">Gestione Programmi</h1>
          </div>
          <button
            onClick={handleNew}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-[#06101f] hover:bg-[#5fc7e0] transition"
          >
            <Plus className="h-4 w-4" />
            Nuovo Programma
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="mb-5 rounded-xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingId ? "Modifica Programma" : "Nuovo Programma"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Titolo</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded-lg border border-[#2f7de1]/30 bg-[#021627] px-4 py-2 text-white"
                  placeholder="Junior Academy"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Focus</label>
                <input
                  type="text"
                  value={formData.focus}
                  onChange={(e) => setFormData({ ...formData, focus: e.target.value })}
                  className="w-full rounded-lg border border-[#2f7de1]/30 bg-[#021627] px-4 py-2 text-white"
                  placeholder="U10 - U16 | Tecnica & coordinazione"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Punti Chiave</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={pointInput}
                    onChange={(e) => setPointInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addPoint())}
                    className="flex-1 rounded-lg border border-[#2f7de1]/30 bg-[#021627] px-4 py-2 text-white"
                    placeholder="Aggiungi un punto chiave..."
                  />
                  <button
                    onClick={addPoint}
                    className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-[#06101f] hover:bg-[#5fc7e0] transition"
                  >
                    Aggiungi
                  </button>
                </div>
                <ul className="space-y-2">
                  {formData.points.map((point, index) => (
                    <li
                      key={index}
                      className="flex items-center justify-between rounded-lg border border-[#2f7de1]/30 bg-[#021627] px-4 py-2"
                    >
                      <span className="text-sm">{point}</span>
                      <button
                        onClick={() => removePoint(index)}
                        className="text-cyan-300 hover:text-red-300"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
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
                    <span className="text-sm">Attivo</span>
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

        {/* Programs Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {programs.length === 0 ? (
            <div className="col-span-full rounded-xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-6 text-center">
              <p className="text-muted">Nessun programma presente.</p>
            </div>
          ) : (
            programs.map((program) => (
              <div
                key={program.id}
                className="rounded-xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-5"
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-semibold text-white">{program.title}</h3>
                      {!program.active && (
                        <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-xs text-cyan-300">
                          Non attivo
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted">{program.focus}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(program)}
                      className="rounded-lg border border-[#2f7de1]/30 bg-[#021627] p-2 hover:bg-[#1a3d5c]/60 transition"
                    >
                      <Edit2 className="h-4 w-4 text-accent" />
                    </button>
                    <button
                      onClick={() => handleDelete(program.id)}
                      className="rounded-lg border border-cyan-500/30 bg-[#021627] p-2 hover:bg-cyan-500/20 transition"
                    >
                      <Trash2 className="h-4 w-4 text-cyan-300" />
                    </button>
                  </div>
                </div>

                <ul className="space-y-2">
                  {program.points.map((point, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-sm text-muted"
                    >
                      <span className="mt-0.5 inline-block h-2 w-2 rounded-full bg-accent flex-shrink-0" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
