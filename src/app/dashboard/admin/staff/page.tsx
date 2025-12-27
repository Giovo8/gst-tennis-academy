"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { ArrowLeft, Plus, Edit2, Trash2, Save, X, User } from "lucide-react";
import Link from "next/link";

type StaffMember = {
  id: number;
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
  const [editingId, setEditingId] = useState<number | null>(null);
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
      console.error("Errore nel caricamento dello staff:", error);
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

        if (error) throw error;
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

        if (error) throw error;
      }

      await loadStaff();
      handleCancel();
    } catch (error) {
      console.error("Errore nel salvataggio:", error);
      alert("Errore nel salvataggio dello staff member");
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Sei sicuro di voler eliminare questo membro dello staff?")) {
      return;
    }

    try {
      const { error } = await supabase.from("staff").delete().eq("id", id);

      if (error) throw error;

      await loadStaff();
    } catch (error) {
      console.error("Errore nell'eliminazione:", error);
      alert("Errore nell'eliminazione dello staff member");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#021627] text-white p-6">
        <div className="mx-auto max-w-4xl">
          <p>Caricamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#021627] text-white p-6">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/admin"
              className="rounded-lg border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-2 hover:bg-[#1a3d5c]/80 transition"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-3xl font-bold">Gestione Staff</h1>
          </div>
          <button
            onClick={handleNew}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-[#06101f] hover:bg-[#5fc7e0] transition"
          >
            <Plus className="h-4 w-4" />
            Nuovo Membro
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="mb-8 rounded-xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingId ? "Modifica Membro" : "Nuovo Membro"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nome Completo</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full rounded-lg border border-[#2f7de1]/30 bg-[#021627] px-4 py-2 text-white"
                  placeholder="Mario Rossi"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Ruolo</label>
                <input
                  type="text"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full rounded-lg border border-[#2f7de1]/30 bg-[#021627] px-4 py-2 text-white"
                  placeholder="Maestro FIT"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Bio</label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={4}
                  className="w-full rounded-lg border border-[#2f7de1]/30 bg-[#021627] px-4 py-2 text-white"
                  placeholder="Descrizione del membro dello staff..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">URL Immagine</label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className="w-full rounded-lg border border-[#2f7de1]/30 bg-[#021627] px-4 py-2 text-white"
                  placeholder="https://esempio.com/foto.jpg"
                />
                {formData.image_url && (
                  <div className="mt-2">
                    <img
                      src={formData.image_url}
                      alt="Preview"
                      className="h-32 w-32 rounded-full object-cover"
                    />
                  </div>
                )}
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

        {/* Staff List */}
        <div className="space-y-4">
          {staff.length === 0 ? (
            <div className="rounded-xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-8 text-center">
              <p className="text-muted">Nessun membro dello staff presente.</p>
            </div>
          ) : (
            staff.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-4 rounded-xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-4"
              >
                {/* Image */}
                <div className="flex-shrink-0">
                  {member.image_url ? (
                    <img
                      src={member.image_url}
                      alt={member.full_name}
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#2f7de1]/30">
                      <User className="h-8 w-8 text-muted" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white">{member.full_name}</h3>
                    {!member.active && (
                      <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-400">
                        Non attivo
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-accent">{member.role}</p>
                  <p className="mt-1 text-sm text-muted line-clamp-2">{member.bio}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(member)}
                    className="rounded-lg border border-[#2f7de1]/30 bg-[#021627] p-2 hover:bg-[#1a3d5c]/60 transition"
                  >
                    <Edit2 className="h-4 w-4 text-accent" />
                  </button>
                  <button
                    onClick={() => handleDelete(member.id)}
                    className="rounded-lg border border-red-500/30 bg-[#021627] p-2 hover:bg-red-500/20 transition"
                  >
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
