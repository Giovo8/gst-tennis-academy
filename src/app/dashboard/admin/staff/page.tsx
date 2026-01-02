"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { ArrowLeft, Plus, Edit2, Trash2, Save, X, User } from "lucide-react";
import Link from "next/link";

type StaffMember = {
  id: string;
  full_name: string;
  role: string;
  bio: string;
  image_url: string | null;
  order_index: number;
  active: boolean;
};

type FormData = {
  full_name: string;
  role: string;
  bio: string;
  image_url: string;
  order_index: number;
  active: boolean;
};

export default function AdminStaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    full_name: "",
    role: "",
    bio: "",
    image_url: "",
    order_index: 0,
    active: true,
  });

  useEffect(() => {
    loadStaff();
  }, []);

  async function loadStaff() {
    try {
      const { data, error } = await supabase
        .from("staff")
        .select("*")
        .order("order_index", { ascending: true });

      if (error) throw error;
      setStaff(data || []);
    } catch (error) {
      // Handle error silently
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(member: StaffMember) {
    setEditingId(member.id);
    setFormData({
      full_name: member.full_name,
      role: member.role,
      bio: member.bio,
      image_url: member.image_url || "",
      order_index: member.order_index,
      active: member.active,
    });
    setShowForm(true);
  }

  function handleNew() {
    setEditingId(null);
    setFormData({
      full_name: "",
      role: "",
      bio: "",
      image_url: "",
      order_index: staff.length,
      active: true,
    });
    setShowForm(true);
  }

  function handleCancel() {
    setEditingId(null);
    setShowForm(false);
    setFormData({
      full_name: "",
      role: "",
      bio: "",
      image_url: "",
      order_index: 0,
      active: true,
    });
  }

  async function handleSave() {
    try {
      if (editingId) {
        // Update existing
        const { error } = await supabase
          .from("staff")
          .update({
            full_name: formData.full_name,
            role: formData.role,
            bio: formData.bio,
            image_url: formData.image_url || null,
            order_index: formData.order_index,
            active: formData.active,
          })
          .eq("id", editingId);

        if (error) {
          console.error("Errore update:", error);
          throw error;
        }
      } else {
        // Create new
        const { error } = await supabase.from("staff").insert({
          full_name: formData.full_name,
          role: formData.role,
          bio: formData.bio,
          image_url: formData.image_url || null,
          order_index: formData.order_index,
          active: formData.active,
        });

        if (error) {
          console.error("Errore insert:", error);
          throw error;
        }
      }

      await loadStaff();
      handleCancel();
    } catch (error: any) {
      // Handle error with user feedback
      console.error("Errore completo:", error);
      alert(`Errore nel salvataggio dello staff member: ${error.message || error.toString()}`);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Sei sicuro di voler eliminare questo membro dello staff?")) {
      return;
    }

    try {
      const { error } = await supabase.from("staff").delete().eq("id", id);

      if (error) throw error;

      await loadStaff();
    } catch (error) {
      // Handle error with user feedback
      alert("Errore nell'eliminazione dello staff member");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <p className="text-gray-600">Caricamento...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-700 mb-2">Gestione Staff</h1>
          <p className="text-gray-600">Gestisci i membri dello staff visibili nella homepage</p>
        </div>
        <button
          onClick={handleNew}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 text-sm font-semibold text-white hover:from-cyan-600 hover:to-blue-700 transition-all shadow-sm"
        >
          <Plus className="h-5 w-5" />
          Nuovo Membro
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <h2 className="text-xl font-bold text-gray-700 mb-4">
            {editingId ? "Modifica Membro" : "Nuovo Membro"}
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Nome Completo</label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full rounded-lg bg-white border border-gray-300 px-4 py-2.5 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Mario Rossi"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Ruolo</label>
              <input
                type="text"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full rounded-lg bg-white border border-gray-300 px-4 py-2.5 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Maestro FIT"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Bio</label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows={4}
                className="w-full rounded-lg bg-white border border-gray-300 px-4 py-2.5 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Descrizione del membro dello staff..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">URL Immagine</label>
              <input
                type="url"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                className="w-full rounded-lg bg-white border border-gray-300 px-4 py-2.5 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://esempio.com/foto.jpg"
              />
              {formData.image_url && (
                <div className="mt-3">
                  <img
                    src={formData.image_url}
                    alt="Preview"
                    className="h-32 w-32 rounded-full object-cover border-2 border-gray-200"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Ordine</label>
                <input
                  type="number"
                  value={formData.order_index}
                  onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) })}
                  className="w-full rounded-lg bg-white border border-gray-300 px-4 py-2.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Stato</label>
                <label className="flex items-center gap-2 mt-2.5">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700 font-semibold">Attivo</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleSave}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 text-sm font-semibold text-white hover:from-cyan-600 hover:to-blue-700 transition-all shadow-sm"
              >
                <Save className="h-5 w-5" />
                Salva
              </button>
              <button
                onClick={handleCancel}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all"
              >
                <X className="h-5 w-5" />
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Staff List */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-700">Membri Staff ({staff.length})</h2>
        
        {staff.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
            <p className="text-gray-500">Nessun membro dello staff presente.</p>
          </div>
        ) : (
          staff.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-all"
            >
              {/* Image */}
              <div className="flex-shrink-0">
                {member.image_url ? (
                  <img
                    src={member.image_url}
                    alt={member.full_name}
                    className="h-16 w-16 rounded-full object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 border-2 border-gray-200">
                    <User className="h-8 w-8 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-700">{member.full_name}</h3>
                  {!member.active && (
                    <span className="rounded-full bg-gray-100 border border-gray-300 px-2 py-0.5 text-xs text-gray-600 font-bold">
                      Non attivo
                    </span>
                  )}
                </div>
                <p className="text-sm text-blue-600 font-semibold">{member.role}</p>
                <p className="mt-1 text-sm text-gray-600 line-clamp-2">{member.bio}</p>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(member)}
                  className="rounded-lg border border-blue-300 bg-blue-100 p-2 hover:bg-blue-200 transition-colors"
                >
                  <Edit2 className="h-4 w-4 text-blue-700" />
                </button>
                <button
                  onClick={() => handleDelete(member.id)}
                  className="rounded-lg border border-gray-300 bg-gray-100 p-2 hover:bg-gray-200 transition-colors"
                >
                  <Trash2 className="h-4 w-4 text-gray-700" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
