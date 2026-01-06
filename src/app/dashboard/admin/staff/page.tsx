"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { Plus, Edit2, Trash2, User, Loader2 } from "lucide-react";
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

export default function AdminStaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

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
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-secondary" />
        <p className="mt-4 text-secondary/60">Caricamento staff...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-secondary mb-2">Gestione Staff</h1>
          <p className="text-secondary/70 font-medium">Gestisci i membri dello staff visibili nella homepage</p>
        </div>
        <Link
          href="/dashboard/admin/staff/new"
          className="px-4 py-2.5 text-sm font-medium text-white bg-secondary rounded-md hover:opacity-90 transition-all flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Nuovo Membro
        </Link>
      </div>

      {/* Staff List */}
      <div className="space-y-4">
        {staff.length === 0 ? (
          <div className="text-center py-20 rounded-md bg-white">
            <User className="w-16 h-16 mx-auto text-secondary/20 mb-4" />
            <h3 className="text-xl font-semibold text-secondary mb-2">Nessun membro dello staff</h3>
            <p className="text-secondary/60">Aggiungi il primo membro dello staff</p>
          </div>
        ) : (
          staff.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-4 bg-white rounded-md p-5 hover:bg-secondary/5 transition-all"
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
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10 border-2 border-gray-200">
                    <User className="h-8 w-8 text-secondary/40" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-secondary">{member.full_name}</h3>
                  {!member.active && (
                    <span className="rounded-md bg-secondary/10 px-2 py-0.5 text-xs text-secondary/70 font-bold">
                      Non attivo
                    </span>
                  )}
                </div>
                <p className="text-sm text-secondary font-semibold">{member.role}</p>
                <p className="mt-1 text-sm text-secondary/70 line-clamp-2">{member.bio}</p>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Link
                  href={`/dashboard/admin/staff/new?id=${member.id}`}
                  className="p-2 rounded-md bg-secondary/10 text-secondary hover:bg-secondary/20 transition-all"
                >
                  <Edit2 className="h-4 w-4" />
                </Link>
                <button
                  onClick={() => handleDelete(member.id)}
                  className="p-2 rounded-md bg-red-50 text-red-600 hover:bg-red-100 transition-all"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}