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

  useEffect(() => {
    loadApplications();
  }, []);

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
          <h1 className="text-3xl font-bold text-secondary mb-2">Candidature Lavoro</h1>
          <p className="text-secondary/70 font-medium">
            Gestisci le candidature ricevute dalla pagina "Lavora con noi"
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadApplications()}
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
        <div className="space-y-3">
          {/* Header Row */}
          <div className="bg-secondary rounded-lg px-5 py-3 mb-3 border border-secondary">
            <div className="flex items-center gap-4">
              <div className="w-10 flex-shrink-0 flex items-center justify-center">
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
              <div className="w-28 flex-shrink-0">
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
              <div className="w-48 flex-shrink-0">
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
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-white/80 uppercase">Email</div>
              </div>
              <div className="w-32 flex-shrink-0 text-center">
                <div className="text-xs font-bold text-white/80 uppercase">Ruolo</div>
              </div>
              <div className="w-32 flex-shrink-0 text-center">
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
          {sortedApplications.map((app) => {
            // Colore bordo sinistro basato sullo status
            let borderStyle = {};
            if (app.status === "rejected") {
              borderStyle = { borderLeftColor: "#ef4444" }; // red
            } else if (app.status === "pending") {
              borderStyle = { borderLeftColor: "#f59e0b" }; // amber
            } else if (app.status === "reviewed") {
              borderStyle = { borderLeftColor: "#3b82f6" }; // blue
            } else if (app.status === "accepted") {
              borderStyle = { borderLeftColor: "#10b981" }; // green
            }

            return (
              <Link
                key={app.id}
                href={`/dashboard/admin/job-applications/${app.id}`}
                className="bg-white rounded-lg px-5 py-4 border border-gray-200 hover:border-gray-300 transition-all block cursor-pointer border-l-4"
                style={borderStyle}
              >
                <div className="flex items-center gap-4">
                  {/* Icon Ruolo */}
                  <div className="w-10 flex-shrink-0 flex items-center justify-center">
                    {app.role === "maestro" ? (
                      <Users className="h-5 w-5 text-secondary/60" strokeWidth={2} />
                    ) : (
                      <Dumbbell className="h-5 w-5 text-secondary/60" strokeWidth={2} />
                    )}
                  </div>

                  {/* Data */}
                  <div className="w-28 flex-shrink-0">
                    <div className="font-bold text-secondary text-sm">
                      {formatDate(app.created_at)}
                    </div>
                  </div>

                  {/* Nome */}
                  <div className="w-48 flex-shrink-0">
                    <div className="font-bold text-secondary text-sm truncate">
                      {app.full_name}
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-secondary/70 truncate flex items-center gap-2">
                      <Mail className="h-4 w-4 text-secondary/40 flex-shrink-0" />
                      {app.email}
                    </div>
                  </div>

                  {/* Ruolo */}
                  <div className="w-32 flex-shrink-0 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${
                      app.role === "maestro"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-purple-100 text-purple-700"
                    }`}>
                      {app.role === "maestro" ? "Maestro" : "Preparatore"}
                    </span>
                  </div>

                  {/* Stato */}
                  <div className="w-32 flex-shrink-0 text-center">
                    {app.status === "pending" && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-amber-100 text-amber-700">
                        <Clock className="h-3 w-3" />
                        In Attesa
                      </span>
                    )}
                    {app.status === "reviewed" && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-700">
                        <FileText className="h-3 w-3" />
                        Revision.
                      </span>
                    )}
                    {app.status === "accepted" && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-700">
                        <CheckCircle className="h-3 w-3" />
                        Accettata
                      </span>
                    )}
                    {app.status === "rejected" && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-700">
                        <XCircle className="h-3 w-3" />
                        Rifiutata
                      </span>
                    )}
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
