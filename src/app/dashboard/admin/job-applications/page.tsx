"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  FileText,
  Users,
  Dumbbell,
  Search,
  Loader2,
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

  const getStatusLabel = (status: JobApplication["status"]) => {
    switch (status) {
      case "pending":
        return "";
      case "reviewed":
        return "Revisionata";
      case "accepted":
        return "Accettata";
      case "rejected":
        return "Rifiutata";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-6 pt-3">
      {/* Search */}
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
        <input
          type="text"
          placeholder="Cerca per nome o email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white border border-black/10 text-secondary placeholder-secondary/40 focus:outline-none focus:ring-0 focus:border-black/10"
        />
      </div>

      {/* Applications List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-secondary" />
          <p className="mt-4 text-secondary/60">Caricamento candidature...</p>
        </div>
      ) : sortedApplications.length === 0 ? (
        <div className="text-center py-20 rounded-lg bg-white">
          <FileText className="w-16 h-16 mx-auto text-secondary/20 mb-4" />
          <h3 className="text-xl font-semibold text-secondary mb-2">Nessuna candidatura trovata</h3>
          <p className="text-secondary/60">Prova a modificare i filtri di ricerca</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedApplications.map((app) => {
            const roleColor = app.role === "maestro" ? "var(--secondary)" : "#023047";
            const RoleIcon = app.role === "maestro" ? Users : Dumbbell;

            return (
              <div
                key={app.id}
                className="rounded-lg overflow-visible cursor-pointer hover:opacity-95 transition-opacity"
                style={{ background: roleColor }}
              >
                <div
                  className="flex items-center gap-4 py-3 px-3"
                  onClick={() => {
                    window.location.href = `/dashboard/admin/job-applications/${app.id}`;
                  }}
                >
                  <div className="flex items-center justify-center bg-white/10 rounded-lg w-11 h-11 flex-shrink-0">
                    <RoleIcon className="h-5 w-5 text-white" strokeWidth={2} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm truncate">{app.full_name}</p>
                    <p className="text-xs text-white/70 mt-0.5 truncate">
                      {app.email} · {formatDate(app.created_at)}
                    </p>
                  </div>

                  {app.status !== "pending" && (
                    <span className="text-[10px] font-semibold text-white/70 flex-shrink-0 uppercase tracking-wide hidden md:block">
                      {getStatusLabel(app.status)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
