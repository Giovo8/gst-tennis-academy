"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { Plus, Edit2, Trash2, User, Loader2, Search } from "lucide-react";
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
  const [searchQuery, setSearchQuery] = useState("");

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

  // Filter staff based on search query
  const filteredStaff = staff.filter((member) => {
    const query = searchQuery.toLowerCase();
    return (
      member.full_name.toLowerCase().includes(query) ||
      member.role.toLowerCase().includes(query) ||
      (member.bio && member.bio.toLowerCase().includes(query))
    );
  });

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
      <div className="flex flex-col gap-2">
        <div>
          <div className="text-xs font-semibold text-secondary/60 uppercase tracking-wider mb-1">
            GESTIONE STAFF
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-secondary">Gestione Staff</h1>
              <p className="text-gray-600 font-medium mt-1">Gestisci i membri dello staff visibili nella homepage</p>
            </div>
            <Link
              href="/dashboard/admin/staff/new"
              className="px-4 py-2.5 text-sm font-medium text-white bg-secondary rounded-md hover:opacity-90 transition-all flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Nuovo Membro
            </Link>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Cerca per nome, ruolo o biografia..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white pl-12 pr-4 py-3 text-secondary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
        />
      </div>

      {/* Staff List */}
      <div className="space-y-4">
        {filteredStaff.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-secondary">
              {searchQuery ? "Nessun risultato trovato" : "Nessun membro dello staff"}
            </h3>
            <p className="text-gray-600 mt-1">
              {searchQuery 
                ? "Prova a modificare la ricerca"
                : "Inizia aggiungendo il primo membro dello staff"
              }
            </p>
          </div>
        ) : (
          filteredStaff.map((member) => (
            <Link
              key={member.id}
              href={`/dashboard/admin/staff/new?id=${member.id}`}
              className="flex items-start gap-4 bg-white rounded-xl border-l-4 border-secondary shadow-md p-6 hover:bg-gray-100 transition-all cursor-pointer"
            >
              {/* Image */}
              <div className="flex-shrink-0">
                {member.image_url ? (
                  <img
                    src={member.image_url}
                    alt={member.full_name}
                    className="h-16 w-16 rounded-lg object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-secondary/10 border-2 border-gray-200">
                    <User className="h-8 w-8 text-secondary/40" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-secondary">{member.full_name}</h3>
                  {!member.active && (
                    <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600 font-semibold">
                      Non attivo
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 font-medium">{member.role}</p>
                <p className="mt-1 text-sm text-gray-600 line-clamp-2">{member.bio}</p>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}