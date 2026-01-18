"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  Plus,
  Edit2,
  Trash2,
  User,
  Loader2,
  Search,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Download,
  CheckCircle2,
  XCircle,
} from "lucide-react";
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

  function exportToCSV() {
    const csv = [
      ["Nome", "Ruolo", "Ordine", "Stato", "Biografia"].join(","),
      ...sortedStaff.map((m) => [
        `"${m.full_name.replace(/"/g, '""')}"`,
        `"${m.role.replace(/"/g, '""')}"`,
        m.order_index,
        m.active ? "Attivo" : "Non attivo",
        `"${(m.bio || "").replace(/"/g, '""')}"`,
      ].join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `staff-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  }

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
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/admin/staff/new"
            className="px-4 py-2.5 text-sm font-medium text-white bg-secondary rounded-md hover:opacity-90 transition-all flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Nuovo Membro
          </Link>
          <button
            onClick={() => loadStaff()}
            className="p-2.5 text-secondary/70 bg-white border border-gray-200 rounded-md hover:bg-secondary hover:text-white transition-all"
            title="Ricarica"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          <button
            onClick={exportToCSV}
            className="p-2.5 text-secondary/70 bg-white border border-gray-200 rounded-md hover:bg-secondary hover:text-white transition-all"
            title="Esporta CSV"
          >
            <Download className="h-5 w-5" />
          </button>
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
        <div className="space-y-3">
          {/* Header Row */}
          <div className="bg-secondary rounded-lg px-5 py-3 mb-3 border border-secondary">
            <div className="flex items-center gap-4">
              <div className="w-16 flex-shrink-0 text-center">
                <div className="text-xs font-bold text-white/80 uppercase">Avatar</div>
              </div>
              <div className="w-20 flex-shrink-0 text-center">
                <button
                  onClick={() => handleSort("order")}
                  className="text-xs font-bold text-white/80 uppercase hover:text-white transition-colors flex items-center gap-1 mx-auto"
                >
                  Ordine
                  {sortBy === "order" && (
                    sortOrder === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                  )}
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <button
                  onClick={() => handleSort("name")}
                  className="text-xs font-bold text-white/80 uppercase hover:text-white transition-colors flex items-center gap-1"
                >
                  Nome
                  {sortBy === "name" && (
                    sortOrder === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                  )}
                </button>
              </div>
              <div className="w-48 flex-shrink-0">
                <button
                  onClick={() => handleSort("role")}
                  className="text-xs font-bold text-white/80 uppercase hover:text-white transition-colors flex items-center gap-1"
                >
                  Ruolo
                  {sortBy === "role" && (
                    sortOrder === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                  )}
                </button>
              </div>
              <div className="w-24 flex-shrink-0 text-center">
                <button
                  onClick={() => handleSort("status")}
                  className="text-xs font-bold text-white/80 uppercase hover:text-white transition-colors flex items-center gap-1 mx-auto"
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
            // Determina il colore del bordo in base allo stato
            const borderStyle = {
              borderLeftColor: member.active ? "#10b981" : "#ef4444", // verde attivo, rosso non attivo
            };

            return (
              <Link
                key={member.id}
                href={`/dashboard/admin/staff/new?id=${member.id}`}
                className="bg-white rounded-lg px-5 py-4 border border-gray-200 hover:border-gray-300 transition-all block cursor-pointer border-l-4"
                style={borderStyle}
              >
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="w-16 flex-shrink-0 flex items-center justify-center">
                    {member.image_url ? (
                      <img
                        src={member.image_url}
                        alt={member.full_name}
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary text-white">
                        <span className="font-bold text-lg">
                          {member.full_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Ordine */}
                  <div className="w-20 flex-shrink-0 text-center">
                    <div className="text-sm font-bold text-secondary">
                      #{member.order_index}
                    </div>
                  </div>

                  {/* Nome */}
                  <div className="flex-1 min-w-0">
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
                  <div className="w-48 flex-shrink-0">
                    <div className="font-semibold text-sm text-secondary truncate">
                      {member.role}
                    </div>
                  </div>

                  {/* Stato */}
                  <div className="w-24 flex-shrink-0 text-center">
                    <span className="text-sm font-bold text-secondary">
                      {member.active ? "Attivo" : "Inattivo"}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}