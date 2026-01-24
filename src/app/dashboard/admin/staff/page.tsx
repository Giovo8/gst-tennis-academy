"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { Plus, User, Loader2, Search, ArrowUp, ArrowDown } from "lucide-react";
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
  const [sortBy, setSortBy] = useState<"name" | "role" | "order" | "status" | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

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

  // Sorting logic
  const sortedStaff = [...filteredStaff].sort((a, b) => {
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
        comparison = a.order_index - b.order_index;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-secondary mb-2">Gestione Staff</h1>
          <p className="text-secondary/70 font-medium">
            Visualizza, modifica e gestisci i membri dello staff della homepage
          </p>
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
              <div className="grid grid-cols-[80px_90px_1fr_170px_120px] items-center gap-4">
                <div className="text-xs font-bold text-white/80 uppercase text-center">Avatar</div>
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
              </div>
            </div>

            {/* Data Rows */}
            {sortedStaff.map((member) => {
              const statusColor = member.active ? "#08b3f7" : "#022431";
              const borderStyle = { borderLeftColor: statusColor };
              const badgeClasses = member.active
                ? "bg-[#08b3f7]/10 text-[#022431] border border-[#08b3f7]/60"
                : "bg-[#022431]/10 text-[#022431] border border-[#022431]/60";

              return (
                <Link
                  key={member.id}
                  href={`/dashboard/admin/staff/new?id=${member.id}`}
                  className="bg-white rounded-lg px-5 py-4 border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all block cursor-pointer border-l-4"
                  style={borderStyle}
                >
                  <div className="grid grid-cols-[80px_90px_1fr_170px_120px] items-center gap-4">
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
                      #{member.order_index}
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
                    <div className="flex items-center justify-center">
                      <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold ${badgeClasses}`}>
                        {member.active ? "Attivo" : "Inattivo"}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}