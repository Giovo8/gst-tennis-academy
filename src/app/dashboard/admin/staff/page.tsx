"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { Plus, User, Loader2, Search, MoreVertical, Eye, Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

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

  async function handleToggleActive(member: StaffMember) {
    const newActive = !member.active;
    try {
      const { error } = await supabase
        .from("staff")
        .update({ active: newActive })
        .eq("id", member.id);
      if (error) throw error;
      setStaff((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, active: newActive } : m))
      );
    } catch {
      alert("Errore durante l'aggiornamento dello stato");
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

  // Ordine identico alla home: order_index ascending
  const sortedStaff = filteredStaff.slice().sort((a, b) => a.order_index - b.order_index);

  const closeActionMenu = () => {
    setOpenMenuId(null);
    setMenuPosition(null);
  };

  const openActionMenu = (id: string, rect: DOMRect) => {
    const MENU_WIDTH = 176;
    const left = Math.max(8, Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8));
    setOpenMenuId(id);
    setMenuPosition({
      top: rect.bottom + 8,
      left,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-secondary">Gestione Staff</h1>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto">
          <Link
            href="/dashboard/admin/staff/new"
            className="flex-1 sm:flex-none px-4 py-2.5 text-sm font-medium text-white bg-secondary rounded-md hover:opacity-90 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Nuovo Membro
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
        <input
          type="text"
          placeholder="Cerca per nome, ruolo o biografia..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-md bg-white border border-gray-200 text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20"
        />
      </div>

      {/* Staff List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-secondary" />
          <p className="mt-4 text-secondary/60">Caricamento staff...</p>
        </div>
      ) : sortedStaff.length === 0 ? (
        <div className="text-center py-20 rounded-md bg-white">
          <User className="w-16 h-16 mx-auto text-secondary/20 mb-4" />
          <h3 className="text-xl font-semibold text-secondary mb-2">
            {searchQuery ? "Nessun risultato trovato" : "Nessun membro dello staff"}
          </h3>
          <p className="text-secondary/60">
            {searchQuery ? "Prova a modificare la ricerca" : "Inizia aggiungendo il primo membro dello staff"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedStaff.map((member) => {
            const cardBg = member.active ? "var(--secondary)" : "#9ca3af";

            return (
              <div
                key={member.id}
                className="rounded-lg overflow-visible cursor-pointer hover:opacity-95 transition-opacity"
                style={{ background: cardBg }}
              >
                <div
                  className="flex items-center gap-4 py-3 px-3"
                  onClick={() => router.push(`/dashboard/admin/staff/${member.id}`)}
                >
                  {/* Avatar */}
                  <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-white/10 overflow-hidden flex items-center justify-center">
                    {member.image_url ? (
                      <img
                        src={member.image_url}
                        alt={member.full_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-bold text-white leading-none">
                        {member.full_name.trim().split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Info principale */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm truncate">{member.full_name}</p>
                    <p className="text-xs text-white/70 mt-0.5 truncate">{member.role}</p>
                  </div>

                  {/* Azioni */}
                  <div className="relative flex items-center justify-center flex-shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (openMenuId === member.id) {
                          closeActionMenu();
                          return;
                        }
                        openActionMenu(member.id, e.currentTarget.getBoundingClientRect());
                      }}
                      className="inline-flex items-center justify-center p-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white transition-all focus:outline-none w-8 h-8"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {openMenuId === member.id && menuPosition && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); closeActionMenu(); }} />
                        <div
                          className="fixed z-50 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1"
                          style={{ top: menuPosition.top, left: menuPosition.left }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Link
                            href={`/dashboard/admin/staff/${member.id}`}
                            onClick={(e) => { e.stopPropagation(); closeActionMenu(); }}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-secondary hover:bg-gray-50 transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Dettagli
                          </Link>
                          <Link
                            href={`/dashboard/admin/staff/new?id=${member.id}`}
                            onClick={(e) => { e.stopPropagation(); closeActionMenu(); }}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-secondary hover:bg-gray-50 transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Modifica
                          </Link>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              closeActionMenu();
                              handleToggleActive(member);
                            }}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-secondary hover:bg-gray-50 transition-colors w-full"
                          >
                            {member.active ? (
                              <ToggleLeft className="h-3.5 w-3.5" />
                            ) : (
                              <ToggleRight className="h-3.5 w-3.5" />
                            )}
                            {member.active ? "Disattiva" : "Attiva"}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              closeActionMenu();
                              handleDelete(member.id);
                            }}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-[#022431] hover:bg-[#022431]/10 transition-colors w-full"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Elimina
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}