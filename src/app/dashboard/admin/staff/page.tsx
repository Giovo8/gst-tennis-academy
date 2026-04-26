"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { Plus, User, Loader2, Search, ArrowUp, ArrowDown, CheckCircle2, XCircle, MoreVertical, Eye, Pencil, Trash2 } from "lucide-react";
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
  const [sortBy, setSortBy] = useState<"name" | "role" | "order" | "status" | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
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

  const maxExplicitOrder = filteredStaff.reduce(
    (max, member) => (member.order_index > 0 ? Math.max(max, member.order_index) : max),
    0
  );

  const membersWithoutOrder = filteredStaff
    .filter((member) => !(member.order_index > 0))
    .sort((a, b) => a.full_name.localeCompare(b.full_name));

  const fallbackOrderMap = new Map<string, number>();
  membersWithoutOrder.forEach((member, index) => {
    fallbackOrderMap.set(member.id, maxExplicitOrder + index + 1);
  });

  const normalizedStaff = filteredStaff.map((member) => ({
    ...member,
    effectiveOrder:
      member.order_index > 0
        ? member.order_index
        : fallbackOrderMap.get(member.id) || maxExplicitOrder + 1,
  }));

  // Sorting logic
  const sortedStaff = [...normalizedStaff].sort((a, b) => {
    if (!sortBy) return 0;

    let comparison = 0;
    switch (sortBy) {
      case "name":
        comparison = a.full_name.localeCompare(b.full_name);
        break;
      case "role":
        comparison = a.role.localeCompare(b.role);
        break;
      case "order":
        comparison = a.effectiveOrder - b.effectiveOrder;
        break;
      case "status":
        comparison = (a.active ? 1 : 0) - (b.active ? 1 : 0);
        break;
    }

    return sortOrder === "asc" ? comparison : -comparison;
  });

  const handleSort = (column: "name" | "role" | "order" | "status") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

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
        <div
          className="overflow-x-auto scrollbar-hide"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <style>{`
            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }
          `}</style>

          <div className="space-y-3 min-w-[860px]">
            {/* Header Row */}
            <div className="bg-secondary rounded-lg px-5 py-3 mb-3 border border-secondary">
              <div className="grid grid-cols-[80px_90px_1fr_170px_120px_40px] items-center gap-4">
                <div className="text-xs font-bold text-white/80 uppercase text-center">#</div>
                <div className="text-xs font-bold text-white/80 uppercase text-center">
                  <button
                    onClick={() => handleSort("order")}
                    className="flex items-center justify-center gap-1 hover:text-white transition-colors mx-auto"
                  >
                    Ordine
                    {sortBy === "order" && (
                      sortOrder === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    )}
                  </button>
                </div>
                <div className="text-xs font-bold text-white/80 uppercase">
                  <button
                    onClick={() => handleSort("name")}
                    className="flex items-center gap-1 hover:text-white transition-colors"
                  >
                    Nome
                    {sortBy === "name" && (
                      sortOrder === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    )}
                  </button>
                </div>
                <div className="text-xs font-bold text-white/80 uppercase">
                  <button
                    onClick={() => handleSort("role")}
                    className="flex items-center gap-1 hover:text-white transition-colors"
                  >
                    Ruolo
                    {sortBy === "role" && (
                      sortOrder === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    )}
                  </button>
                </div>
                <div className="text-xs font-bold text-white/80 uppercase text-center">
                  <button
                    onClick={() => handleSort("status")}
                    className="flex items-center justify-center gap-1 hover:text-white transition-colors mx-auto"
                  >
                    Stato
                    {sortBy === "status" && (
                      sortOrder === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    )}
                  </button>
                </div>
                <div></div>
              </div>
            </div>

            {/* Data Rows */}
            {sortedStaff.map((member) => {
              const borderStyle = {
                borderLeftColor: member.active ? "var(--secondary)" : "#9ca3af",
              };
              const statusColor = member.active ? "var(--secondary)" : "#9ca3af";
              const displayOrder = member.effectiveOrder;

              return (
                <div
                  key={member.id}
                  onClick={() => router.push(`/dashboard/admin/staff/${member.id}`)}
                  className="bg-white rounded-lg px-5 py-4 border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all block cursor-pointer border-l-4"
                  style={borderStyle}
                >
                  <div className="grid grid-cols-[80px_90px_1fr_170px_120px_40px] items-center gap-4">
                    {/* Avatar */}
                    <div className="flex items-center justify-center">
                      <div className="h-12 w-12 rounded-lg overflow-hidden bg-secondary/10 flex items-center justify-center">
                        {member.image_url ? (
                          <img
                            src={member.image_url}
                            alt={member.full_name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="font-bold text-lg text-secondary">
                            {member.full_name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Ordine */}
                    <div className="text-sm font-bold text-secondary text-center">
                      {displayOrder}
                    </div>

                    {/* Nome e bio */}
                    <div className="min-w-0">
                      <div className="font-bold text-secondary text-sm truncate">
                        {member.full_name}
                      </div>
                      {member.bio && (
                        <div className="text-xs text-secondary/60 truncate mt-0.5">
                          {member.bio}
                        </div>
                      )}
                    </div>

                    {/* Ruolo */}
                    <div className="font-semibold text-sm text-secondary truncate">
                      {member.role}
                    </div>

                    {/* Stato */}
                    <div className="flex items-center justify-center gap-1">
                      {member.active ? (
                        <CheckCircle2 className="h-4 w-4" style={{ color: statusColor }} />
                      ) : (
                        <XCircle className="h-4 w-4" style={{ color: statusColor }} />
                      )}
                    </div>

                    {/* Azioni */}
                    <div className="flex items-center justify-center">
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
                        className="inline-flex items-center justify-center p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-secondary transition-all focus:outline-none w-8 h-8"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      {openMenuId === member.id && menuPosition && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); closeActionMenu(); }} />
                          <div
                            className="fixed z-50 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1"
                            style={{ top: menuPosition.top, left: menuPosition.left }}
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
        </div>
      )}
    </div>
  );
}