"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import {
  FileText,
  Mail,
  ExternalLink,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Dumbbell,
  Search,
  Loader2,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Download,
  Plus,
  MoreVertical,
  Pencil,
} from "lucide-react";

interface JobApplication {
  id: string;
  full_name: string;
  email: string;
  role: "maestro" | "preparatore";
  message: string | null;
  cv_url: string | null;
  status: "pending" | "reviewed" | "accepted" | "rejected";
  created_at: string;
}

export default function JobApplicationsPage() {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "reviewed" | "accepted" | "rejected">("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "name" | "role" | "status" | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);

  async function loadApplications() {
    setLoading(true);
    const { data, error } = await supabase
      .from("recruitment_applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setApplications(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadApplications();
  }, []);

  const filteredApplications = applications.filter(app => {
    const matchesFilter = filter === "all" || app.status === filter;
    const matchesSearch = search === "" ||
      app.full_name.toLowerCase().includes(search.toLowerCase()) ||
      app.email.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Sorting logic
  const sortedApplications = [...filteredApplications].sort((a, b) => {
    if (!sortBy) return 0;

    let comparison = 0;
    switch (sortBy) {
      case "date":
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
      case "name":
        comparison = a.full_name.localeCompare(b.full_name);
        break;
      case "role":
        comparison = a.role.localeCompare(b.role);
        break;
      case "status":
        const statusOrder = { pending: 1, reviewed: 2, accepted: 3, rejected: 4 };
        comparison = statusOrder[a.status] - statusOrder[b.status];
        break;
    }

    return sortOrder === "asc" ? comparison : -comparison;
  });

  const handleSort = (column: "date" | "name" | "role" | "status") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  function exportToCSV() {
    const csv = [
      ["Data", "Nome", "Email", "Ruolo", "Stato"].join(","),
      ...sortedApplications.map((a) => [
        formatDate(a.created_at),
        `"${a.full_name.replace(/"/g, '""')}"`,
        a.email,
        a.role === "maestro" ? "Maestro" : "Preparatore",
        a.status === "pending" ? "In Attesa" : a.status === "reviewed" ? "Revisionata" : a.status === "accepted" ? "Accettata" : "Rifiutata",
      ].join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `candidature-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  }

  const stats = {
    total: applications.length,
    pending: applications.filter(a => a.status === "pending").length,
    reviewed: applications.filter(a => a.status === "reviewed").length,
    accepted: applications.filter(a => a.status === "accepted").length,
    rejected: applications.filter(a => a.status === "rejected").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-secondary">Candidature Lavoro</h1>
        </div>
      </div>

      {/* Search */}
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
        <input
          type="text"
          placeholder="Cerca per nome o email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-md bg-white border border-gray-200 text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20"
        />
      </div>

      {/* Applications List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-secondary" />
          <p className="mt-4 text-secondary/60">Caricamento candidature...</p>
        </div>
      ) : sortedApplications.length === 0 ? (
        <div className="text-center py-20 rounded-md bg-white">
          <FileText className="w-16 h-16 mx-auto text-secondary/20 mb-4" />
          <h3 className="text-xl font-semibold text-secondary mb-2">Nessuna candidatura trovata</h3>
          <p className="text-secondary/60">Prova a modificare i filtri di ricerca</p>
        </div>
      ) : (
        <div className="overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <style>{`
            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          <div className="space-y-3 min-w-[750px]">
            {/* Header Row */}
            <div className="bg-secondary rounded-lg px-5 py-3 mb-3 border border-secondary">
              <div className="grid grid-cols-[40px_100px_160px_1fr_100px_40px] items-center gap-4">
                <div className="flex items-center justify-center">
                  <button
                    onClick={() => handleSort("role")}
                    className="text-xs font-bold text-white/80 uppercase hover:text-white transition-colors flex items-center gap-1"
                  >
                    #
                    {sortBy === "role" && (
                      sortOrder === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    )}
                  </button>
                </div>
                <div>
                  <button
                    onClick={() => handleSort("date")}
                    className="text-xs font-bold text-white/80 uppercase hover:text-white transition-colors flex items-center gap-1"
                  >
                    Data
                    {sortBy === "date" && (
                      sortOrder === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    )}
                  </button>
                </div>
                <div>
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
                <div>
                  <div className="text-xs font-bold text-white/80 uppercase">Email</div>
                </div>
                <div className="text-center">
                  <div className="text-xs font-bold text-white/80 uppercase">Ruolo</div>
                </div>
                <div></div>
              </div>
            </div>

            {/* Data Rows */}
            {sortedApplications.map((app) => {
              // Colore bordo sinistro e icona basato sul ruolo
              const roleColor = app.role === "maestro" ? "var(--secondary)" : "#023047";
              const borderStyle = { borderLeftColor: roleColor };

              return (
                <div
                  key={app.id}
                  className="bg-white rounded-lg px-4 py-3 border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer border-l-4"
                  style={borderStyle}
                >
                  <Link
                    href={`/dashboard/admin/job-applications/${app.id}`}
                    className="grid grid-cols-[40px_100px_160px_1fr_100px_40px] items-center gap-4 no-underline"
                  >
                    {/* Icon Ruolo */}
                    <div className="flex items-center justify-center">
                      {app.role === "maestro" ? (
                        <Users className="h-5 w-5" style={{ color: roleColor }} strokeWidth={2} />
                      ) : (
                        <Dumbbell className="h-5 w-5" style={{ color: roleColor }} strokeWidth={2} />
                      )}
                    </div>

                    {/* Data */}
                    <div className="font-bold text-secondary text-sm">
                      {formatDate(app.created_at)}
                    </div>

                    {/* Nome */}
                    <div className="font-bold text-secondary text-sm truncate">
                      {app.full_name}
                    </div>

                    {/* Email */}
                    <div className="text-sm text-secondary/70 truncate">
                      {app.email}
                    </div>

                    {/* Ruolo */}
                    <div className="text-center">
                      <span className="text-sm font-bold text-secondary">
                        {app.role === "maestro" ? "Maestro" : "Preparatore"}
                      </span>
                    </div>

                    {/* Azioni - 3 puntini */}
                    <div className="flex items-center justify-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (openMenuId === app.id) {
                            setOpenMenuId(null);
                            setMenuPosition(null);
                          } else {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setMenuPosition({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                            setOpenMenuId(app.id);
                          }
                        }}
                        className="inline-flex items-center justify-center p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-secondary transition-all focus:outline-none w-8 h-8"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dropdown menu fisso - fuori dal container per evitare clipping */}
      {openMenuId && menuPosition && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => { setOpenMenuId(null); setMenuPosition(null); }}
          />
          <div
            className="fixed z-50 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1"
            style={{ top: menuPosition.top, right: menuPosition.right }}
          >
            <button
              type="button"
              onClick={() => {
                setOpenMenuId(null);
                setMenuPosition(null);
                window.location.href = `/dashboard/admin/job-applications/${openMenuId}`;
              }}
              className="flex items-center gap-2 px-3 py-2 text-sm text-secondary hover:bg-gray-50 transition-colors w-full"
            >
              <Pencil className="h-3.5 w-3.5" />
              Visualizza
            </button>
            {applications.find(a => a.id === openMenuId)?.cv_url && (
              <a
                href={applications.find(a => a.id === openMenuId)!.cv_url!}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => { setOpenMenuId(null); setMenuPosition(null); }}
                className="flex items-center gap-2 px-3 py-2 text-sm text-secondary hover:bg-gray-50 transition-colors w-full"
              >
                <FileText className="h-3.5 w-3.5" />
                Curriculum
              </a>
            )}
            <button
              type="button"
              onClick={() => { setOpenMenuId(null); setMenuPosition(null); }}
              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors w-full"
              style={{ color: "#022431" }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Elimina
            </button>
          </div>
        </>
      )}
    </div>
  );
}
