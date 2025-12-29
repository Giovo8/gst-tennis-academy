"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { ArrowLeft, Plus, Edit2, Trash2, Save, X } from "lucide-react";
import Link from "next/link";

type CourseSection = {
  id: string;
  layout_type: "single_box" | "frequency_grid" | "list_with_price" | "list_no_price" | "info_card";
  section_title: string;
  section_description?: string;
  items: any[];
  order_index: number;
  active: boolean;
};

const LAYOUT_TYPES = [
  { value: "single_box", label: "Box Singolo con Prezzo", description: "Es: Quota Iscrizione, Corso Agonistico" },
  { value: "frequency_grid", label: "Griglia 3 Frequenze", description: "Es: Corso Base (Mono/Bi/Tri)" },
  { value: "list_with_price", label: "Lista con Prezzi", description: "Es: Extra, Tesseramenti" },
  { value: "list_no_price", label: "Lista senza Prezzi", description: "Es: Sconti, Benefit" },
  { value: "info_card", label: "Card Informativa", description: "Es: Note, Avvisi" },
];

export default function AdminCoursesPage() {
  const [sections, setSections] = useState<CourseSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<any>({
    layout_type: "single_box",
    section_title: "",
    section_description: "",
    items: [],
    order_index: 0,
    active: true,
  });

  useEffect(() => {
    loadSections();
  }, []);

  async function loadSections() {
    try {
      const { data, error } = await supabase
        .from("course_sections")
        .select("*")
        .order("order_index", { ascending: true });

      if (error) throw error;
      setSections(data || []);
    } catch (error) {
      // Handle error silently
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(section: CourseSection) {
    setEditingId(section.id);
    setFormData({
      layout_type: section.layout_type,
      section_title: section.section_title,
      section_description: section.section_description || "",
      items: section.items,
      order_index: section.order_index,
      active: section.active,
    });
    setShowForm(true);
  }

  function handleNew() {
    setEditingId(null);
    setFormData({
      layout_type: "single_box",
      section_title: "",
      section_description: "",
      items: [{}],
      order_index: sections.length,
      active: true,
    });
    setShowForm(true);
  }

  function handleCancel() {
    setShowForm(false);
    setEditingId(null);
  }

  function addItem() {
    const newItem: any = {};
    if (formData.layout_type === "frequency_grid") {
      newItem.frequency = "";
      newItem.price_monthly = "";
      newItem.price_yearly = "";
    } else if (formData.layout_type === "list_with_price") {
      newItem.label = "";
      newItem.price = "";
    } else if (formData.layout_type === "list_no_price") {
      newItem.label = "";
      newItem.description = "";
    } else if (formData.layout_type === "info_card") {
      newItem.text = "";
    } else if (formData.layout_type === "single_box") {
      newItem.price = "";
      newItem.details = [];
    }
    setFormData({ ...formData, items: [...formData.items, newItem] });
  }

  function removeItem(index: number) {
    setFormData({ ...formData, items: formData.items.filter((_: any, i: number) => i !== index) });
  }

  function updateItem(index: number, key: string, value: any) {
    const newItems = [...formData.items];
    newItems[index][key] = value;
    setFormData({ ...formData, items: newItems });
  }

  function addDetail(itemIndex: number, detail: string) {
    if (!detail.trim()) return;
    const newItems = [...formData.items];
    if (!newItems[itemIndex].details) newItems[itemIndex].details = [];
    newItems[itemIndex].details.push(detail.trim());
    setFormData({ ...formData, items: newItems });
  }

  function removeDetail(itemIndex: number, detailIndex: number) {
    const newItems = [...formData.items];
    newItems[itemIndex].details = newItems[itemIndex].details.filter((_: any, i: number) => i !== detailIndex);
    setFormData({ ...formData, items: newItems });
  }

  async function handleSave() {
    try {
      const sectionData: any = {
        layout_type: formData.layout_type,
        section_title: formData.section_title,
        section_description: formData.section_description || null,
        items: formData.items,
        order_index: formData.order_index,
        is_active: formData.active,
      };

      console.log('Saving section data:', sectionData);

      let result;
      if (editingId) {
        result = await supabase.from("course_sections").update(sectionData).eq("id", editingId);
      } else {
        result = await supabase.from("course_sections").insert([sectionData]);
      }

      console.log('Save result:', result);

      if (result.error) {
        console.error('Database error:', result.error);
        throw result.error;
      }

      await loadSections();
      handleCancel();
    } catch (error: any) {
      // Handle error with user feedback
      console.error('Save error:', error);
      alert("Errore nel salvataggio: " + (error?.message || error?.toString() || 'Errore sconosciuto'));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Sei sicuro di voler eliminare questa sezione?")) return;

    try {
      const { error } = await supabase.from("course_sections").delete().eq("id", id);
      if (error) throw error;
      await loadSections();
    } catch (error) {
      // Handle error with user feedback
      alert("Errore nell'eliminazione");
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
        <div className="mb-5 flex items-center justify-between">
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
            Nuova Sezione
          </button>
        </div>

        {showForm && (
          <div className="mb-5 rounded-2xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-6">
            <h2 className="mb-4 text-xl font-semibold">
              {editingId ? "Modifica Sezione" : "Nuova Sezione"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Tipo di Layout</label>
                <select
                  value={formData.layout_type}
                  onChange={(e) => setFormData({ ...formData, layout_type: e.target.value, items: [{}] })}
                  className="w-full rounded-lg border border-white/15 bg-[#0d1f35] px-4 py-2 text-white"
                >
                  {LAYOUT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label} - {type.description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Titolo Sezione</label>
                <input
                  type="text"
                  value={formData.section_title}
                  onChange={(e) => setFormData({ ...formData, section_title: e.target.value })}
                  className="w-full rounded-lg border border-white/15 bg-[#0d1f35] px-4 py-2 text-white"
                  placeholder="Es: Corso Base"
                />
              </div>

              {formData.layout_type !== "info_card" && (
                <div>
                  <label className="mb-2 block text-sm font-medium">Descrizione (opzionale)</label>
                  <input
                    type="text"
                    value={formData.section_description}
                    onChange={(e) => setFormData({ ...formData, section_description: e.target.value })}
                    className="w-full rounded-lg border border-white/15 bg-[#0d1f35] px-4 py-2 text-white"
                    placeholder="Es: 1 ora di tennis - 30 min di prep. fisica"
                  />
                </div>
              )}

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium">Elementi</label>
                  <button
                    onClick={addItem}
                    className="flex items-center gap-2 rounded-lg bg-accent/20 px-3 py-1 text-sm font-semibold text-accent"
                  >
                    <Plus className="h-4 w-4" />
                    Aggiungi
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.items.map((item: any, idx: number) => (
                    <div key={idx} className="rounded-lg border border-white/15 bg-[#0d1f35] p-4">
                      <div className="mb-2 flex justify-between">
                        <span className="text-sm font-medium">Elemento {idx + 1}</span>
                        <button
                          onClick={() => removeItem(idx)}
                          className="text-cyan-300 hover:text-red-300"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Single Box */}
                      {formData.layout_type === "single_box" && (
                        <>
                          <input
                            type="number"
                            value={item.price || ""}
                            onChange={(e) => updateItem(idx, "price", e.target.value)}
                            className="w-full rounded-lg border border-white/15 bg-[#06101f] px-3 py-2 text-white text-sm mb-2"
                            placeholder="Prezzo (€)"
                          />
                          <div className="space-y-2">
                            <label className="text-xs text-muted">Dettagli (opzionale)</label>
                            {item.details?.map((detail: string, dIdx: number) => (
                              <div key={dIdx} className="flex gap-2">
                                <input
                                  type="text"
                                  value={detail}
                                  readOnly
                                  className="flex-1 rounded-lg border border-white/15 bg-[#06101f] px-3 py-2 text-white text-sm"
                                />
                                <button
                                  onClick={() => removeDetail(idx, dIdx)}
                                  className="text-cyan-300"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                            <input
                              type="text"
                              placeholder="Nuovo dettaglio (Enter per aggiungere)"
                              onKeyPress={(e) => {
                                if (e.key === "Enter") {
                                  addDetail(idx, e.currentTarget.value);
                                  e.currentTarget.value = "";
                                }
                              }}
                              className="w-full rounded-lg border border-white/15 bg-[#06101f] px-3 py-2 text-white text-sm"
                            />
                          </div>
                        </>
                      )}

                      {/* Frequency Grid */}
                      {formData.layout_type === "frequency_grid" && (
                        <div className="grid gap-2 md:grid-cols-3">
                          <input
                            type="text"
                            value={item.frequency || ""}
                            onChange={(e) => updateItem(idx, "frequency", e.target.value)}
                            className="rounded-lg border border-white/15 bg-[#06101f] px-3 py-2 text-white text-sm"
                            placeholder="Frequenza"
                          />
                          <input
                            type="number"
                            value={item.price_monthly || ""}
                            onChange={(e) => updateItem(idx, "price_monthly", e.target.value)}
                            className="rounded-lg border border-white/15 bg-[#06101f] px-3 py-2 text-white text-sm"
                            placeholder="€/mese"
                          />
                          <input
                            type="number"
                            value={item.price_yearly || ""}
                            onChange={(e) => updateItem(idx, "price_yearly", e.target.value)}
                            className="rounded-lg border border-white/15 bg-[#06101f] px-3 py-2 text-white text-sm"
                            placeholder="€/anno"
                          />
                        </div>
                      )}

                      {/* List with Price */}
                      {formData.layout_type === "list_with_price" && (
                        <div className="grid gap-2 md:grid-cols-2">
                          <input
                            type="text"
                            value={item.label || ""}
                            onChange={(e) => updateItem(idx, "label", e.target.value)}
                            className="rounded-lg border border-white/15 bg-[#06101f] px-3 py-2 text-white text-sm"
                            placeholder="Etichetta"
                          />
                          <input
                            type="number"
                            value={item.price || ""}
                            onChange={(e) => updateItem(idx, "price", e.target.value)}
                            className="rounded-lg border border-white/15 bg-[#06101f] px-3 py-2 text-white text-sm"
                            placeholder="Prezzo (€)"
                          />
                        </div>
                      )}

                      {/* List without Price */}
                      {formData.layout_type === "list_no_price" && (
                        <>
                          <input
                            type="text"
                            value={item.label || ""}
                            onChange={(e) => updateItem(idx, "label", e.target.value)}
                            className="w-full rounded-lg border border-white/15 bg-[#06101f] px-3 py-2 text-white text-sm mb-2"
                            placeholder="Etichetta"
                          />
                          <input
                            type="text"
                            value={item.description || ""}
                            onChange={(e) => updateItem(idx, "description", e.target.value)}
                            className="w-full rounded-lg border border-white/15 bg-[#06101f] px-3 py-2 text-white text-sm"
                            placeholder="Descrizione (opzionale)"
                          />
                        </>
                      )}

                      {/* Info Card */}
                      {formData.layout_type === "info_card" && (
                        <textarea
                          value={item.text || ""}
                          onChange={(e) => updateItem(idx, "text", e.target.value)}
                          className="w-full rounded-lg border border-white/15 bg-[#06101f] px-3 py-2 text-white text-sm"
                          placeholder="Testo informativo"
                          rows={2}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="h-4 w-4"
                />
                <label className="text-sm">Attiva</label>
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
          {sections.map((section) => (
            <div
              key={section.id}
              className="rounded-2xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-3">
                    <span className="rounded-full bg-accent/20 px-3 py-1 text-xs font-semibold uppercase text-accent">
                      {LAYOUT_TYPES.find((t) => t.value === section.layout_type)?.label}
                    </span>
                    {!section.active && (
                      <span className="rounded-full bg-cyan-500/20 px-3 py-1 text-xs font-semibold text-cyan-300">
                        Disattivata
                      </span>
                    )}
                  </div>
                  <h3 className="mb-1 text-xl font-semibold">{section.section_title}</h3>
                  {section.section_description && (
                    <p className="mb-2 text-sm text-muted">{section.section_description}</p>
                  )}
                  <p className="text-sm text-muted">{section.items.length} elementi</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(section)}
                    className="rounded-full border border-white/15 p-2 transition hover:bg-white/5"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(section.id)}
                    className="rounded-full border border-cyan-500/30 p-2 text-cyan-300 transition hover:bg-cyan-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {sections.length === 0 && (
          <div className="rounded-2xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-12 text-center">
            <p className="text-muted">Nessuna sezione trovata. Crea la prima!</p>
          </div>
        )}
      </div>
    </div>
  );
}
