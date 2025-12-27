"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { ArrowLeft, Plus, Edit2, Trash2, Save, X } from "lucide-react";
import Link from "next/link";

type Course = {
  id: string;
  type: "iscrizione" | "base" | "avanzato" | "agonistico" | "extra" | "sconto";
  title: string;
  description?: string;
  frequency?: string; // mono/bi/tri
  price_monthly?: number;
  price_yearly?: number;
  details?: string[];
  order_index: number;
  active: boolean;
};

type FormData = {
  type: string;
  title: string;
  description: string;
  frequency: string;
  price_monthly: string;
  price_yearly: string;
  details: string[];
  order_index: number;
  active: boolean;
};

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [detailInput, setDetailInput] = useState("");
  const [formData, setFormData] = useState<FormData>({
    type: "base",
    title: "",
    description: "",
    frequency: "",
    price_monthly: "",
    price_yearly: "",
    details: [],
    order_index: 0,
    active: true,
  });

  useEffect(() => {
    loadCourses();
  }, []);

  async function loadCourses() {
    try {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("order_index", { ascending: true });

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error("Errore nel caricamento dei corsi:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(course: Course) {
    setEditingId(course.id);
    setFormData({
      type: course.type,
      title: course.title,
      description: course.description || "",
      frequency: course.frequency || "",
      price_monthly: course.price_monthly?.toString() || "",
      price_yearly: course.price_yearly?.toString() || "",
      details: course.details || [],
      order_index: course.order_index,
      active: course.active,
    });
    setShowForm(true);
  }

  function handleNew() {
    setEditingId(null);
    setFormData({
      type: "base",
      title: "",
      description: "",
      frequency: "",
      price_monthly: "",
      price_yearly: "",
      details: [],
      order_index: courses.length,
      active: true,
    });
    setShowForm(true);
  }

  function handleCancel() {
    setShowForm(false);
    setEditingId(null);
    setDetailInput("");
  }

  function addDetail() {
    if (detailInput.trim()) {
      setFormData({ ...formData, details: [...formData.details, detailInput.trim()] });
      setDetailInput("");
    }
  }

  function removeDetail(index: number) {
    setFormData({ ...formData, details: formData.details.filter((_, i) => i !== index) });
  }

  async function handleSave() {
    try {
      const courseData: any = {
        type: formData.type,
        title: formData.title,
        description: formData.description || null,
        frequency: formData.frequency || null,
        price_monthly: formData.price_monthly ? parseFloat(formData.price_monthly) : null,
        price_yearly: formData.price_yearly ? parseFloat(formData.price_yearly) : null,
        details: formData.details.length > 0 ? formData.details : null,
        order_index: formData.order_index,
        active: formData.active,
      };

      let result;
      if (editingId) {
        result = await supabase.from("courses").update(courseData).eq("id", editingId);
      } else {
        result = await supabase.from("courses").insert([courseData]);
      }

      if (result.error) throw result.error;

      await loadCourses();
      handleCancel();
    } catch (error) {
      console.error("Errore nel salvataggio:", error);
      alert("Errore nel salvataggio del corso");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Sei sicuro di voler eliminare questo corso?")) return;

    try {
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw error;
      await loadCourses();
    } catch (error) {
      console.error("Errore nell'eliminazione:", error);
      alert("Errore nell'eliminazione del corso");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#021627] text-white">
        <p>Caricamento...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#021627] p-6 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/admin"
              className="rounded-full border border-white/15 p-2 transition hover:bg-white/5"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold">Gestione Corsi e Abbonamenti</h1>
          </div>
          <button
            onClick={handleNew}
            className="flex items-center gap-2 rounded-full bg-accent px-4 py-2 font-semibold transition hover:bg-accent/80"
          >
            <Plus className="h-4 w-4" />
            Nuovo Corso
          </button>
        </div>

        {showForm && (
          <div className="mb-6 rounded-2xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-6">
            <h2 className="mb-4 text-xl font-semibold">
              {editingId ? "Modifica Corso" : "Nuovo Corso"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Tipo</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full rounded-lg border border-white/15 bg-[#0d1f35] px-4 py-2 text-white"
                >
                  <option value="iscrizione">Quota Iscrizione</option>
                  <option value="base">Corso Base</option>
                  <option value="avanzato">Corso Avanzato</option>
                  <option value="agonistico">Corso Agonistico</option>
                  <option value="extra">Extra</option>
                  <option value="sconto">Sconto</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Titolo</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded-lg border border-white/15 bg-[#0d1f35] px-4 py-2 text-white"
                  placeholder="Es: Corso Base"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Descrizione</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-lg border border-white/15 bg-[#0d1f35] px-4 py-2 text-white"
                  placeholder="Es: 1 ora di tennis - 30 min di prep. fisica"
                  rows={2}
                />
              </div>

              {(formData.type === "base" || formData.type === "avanzato") && (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Frequenza</label>
                    <select
                      value={formData.frequency}
                      onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                      className="w-full rounded-lg border border-white/15 bg-[#0d1f35] px-4 py-2 text-white"
                    >
                      <option value="">Seleziona</option>
                      <option value="mono">Monosettimanale</option>
                      <option value="bi">Bisettimanale</option>
                      <option value="tri">Trisettimanale</option>
                    </select>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium">Prezzo Mensile (€)</label>
                      <input
                        type="number"
                        value={formData.price_monthly}
                        onChange={(e) => setFormData({ ...formData, price_monthly: e.target.value })}
                        className="w-full rounded-lg border border-white/15 bg-[#0d1f35] px-4 py-2 text-white"
                        placeholder="100"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">Prezzo Annuale (€)</label>
                      <input
                        type="number"
                        value={formData.price_yearly}
                        onChange={(e) => setFormData({ ...formData, price_yearly: e.target.value })}
                        className="w-full rounded-lg border border-white/15 bg-[#0d1f35] px-4 py-2 text-white"
                        placeholder="650"
                      />
                    </div>
                  </div>
                </>
              )}

              {(formData.type === "iscrizione" || formData.type === "agonistico" || formData.type === "extra") && (
                <div>
                  <label className="mb-2 block text-sm font-medium">Prezzo (€)</label>
                  <input
                    type="number"
                    value={formData.price_yearly}
                    onChange={(e) => setFormData({ ...formData, price_yearly: e.target.value })}
                    className="w-full rounded-lg border border-white/15 bg-[#0d1f35] px-4 py-2 text-white"
                    placeholder="150"
                  />
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium">Dettagli/Punti Chiave</label>
                <div className="mb-2 flex gap-2">
                  <input
                    type="text"
                    value={detailInput}
                    onChange={(e) => setDetailInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addDetail())}
                    className="flex-1 rounded-lg border border-white/15 bg-[#0d1f35] px-4 py-2 text-white"
                    placeholder="Aggiungi dettaglio..."
                  />
                  <button
                    onClick={addDetail}
                    className="rounded-lg bg-accent px-4 py-2 font-semibold"
                  >
                    Aggiungi
                  </button>
                </div>
                <ul className="space-y-2">
                  {formData.details.map((detail, index) => (
                    <li
                      key={index}
                      className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                    >
                      <span className="text-sm">{detail}</span>
                      <button
                        onClick={() => removeDetail(index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="h-4 w-4"
                />
                <label className="text-sm">Attivo</label>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 font-semibold"
                >
                  <Save className="h-4 w-4" />
                  Salva
                </button>
                <button
                  onClick={handleCancel}
                  className="rounded-lg border border-white/15 px-4 py-2 font-semibold"
                >
                  Annulla
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {courses.map((course) => (
            <div
              key={course.id}
              className="rounded-2xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-3">
                    <span className="rounded-full bg-accent/20 px-3 py-1 text-xs font-semibold uppercase text-accent">
                      {course.type}
                    </span>
                    {!course.active && (
                      <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-400">
                        Disattivato
                      </span>
                    )}
                  </div>
                  <h3 className="mb-1 text-xl font-semibold">{course.title}</h3>
                  {course.description && (
                    <p className="mb-2 text-sm text-muted">{course.description}</p>
                  )}
                  {course.frequency && (
                    <p className="mb-2 text-sm text-accent">
                      {course.frequency === "mono" && "Monosettimanale"}
                      {course.frequency === "bi" && "Bisettimanale"}
                      {course.frequency === "tri" && "Trisettimanale"}
                    </p>
                  )}
                  {course.price_monthly && (
                    <p className="text-lg font-bold">
                      {course.price_monthly}€/mese
                      {course.price_yearly && ` - ${course.price_yearly}€/anno`}
                    </p>
                  )}
                  {!course.price_monthly && course.price_yearly && (
                    <p className="text-lg font-bold">{course.price_yearly}€</p>
                  )}
                  {course.details && course.details.length > 0 && (
                    <ul className="mt-3 space-y-1">
                      {course.details.map((detail, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-accent" />
                          {detail}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(course)}
                    className="rounded-full border border-white/15 p-2 transition hover:bg-white/5"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(course.id)}
                    className="rounded-full border border-red-500/30 p-2 text-red-400 transition hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {courses.length === 0 && (
          <div className="rounded-2xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-12 text-center">
            <p className="text-muted">Nessun corso trovato. Crea il primo!</p>
          </div>
        )}
      </div>
    </div>
  );
}
