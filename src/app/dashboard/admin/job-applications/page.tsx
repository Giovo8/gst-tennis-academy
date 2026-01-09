"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
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

  async function updateStatus(id: string, status: JobApplication["status"]) {
    const { error } = await supabase
      .from("recruitment_applications")
      .update({ status })
      .eq("id", id);

    if (!error) {
      setApplications(prev =>
        prev.map(app => app.id === id ? { ...app, status } : app)
      );
    }
  }

  async function deleteApplication(id: string) {
    if (!confirm("Sei sicuro di voler eliminare questa candidatura?")) return;

    const { error } = await supabase
      .from("recruitment_applications")
      .delete()
      .eq("id", id);

    if (!error) {
      setApplications(prev => prev.filter(app => app.id !== id));
    }
  }

  const filteredApplications = applications.filter(app => {
    const matchesFilter = filter === "all" || app.status === filter;
    const matchesSearch = search === "" ||
      app.full_name.toLowerCase().includes(search.toLowerCase()) ||
      app.email.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const stats = {
    total: applications.length,
    pending: applications.filter(a => a.status === "pending").length,
    reviewed: applications.filter(a => a.status === "reviewed").length,
    accepted: applications.filter(a => a.status === "accepted").length,
    rejected: applications.filter(a => a.status === "rejected").length,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary">Candidature Lavoro</h1>
          <p className="text-secondary/60 text-sm mt-1">
            Gestisci le candidature ricevute dalla pagina "Lavora con noi"
          </p>
        </div>
      </div>

      {/* ...existing code... */}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
          <input
            type="text"
            placeholder="Cerca per nome o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20"
          />
        </div>

        {/* Filter buttons */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              filter === "all"
                ? "text-white bg-secondary"
                : "bg-white text-secondary/70 hover:bg-secondary/5"
            }`}
          >
            Tutte
          </button>
          <button
            onClick={() => setFilter("pending")}
            className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              filter === "pending"
                ? "text-white bg-secondary"
                : "bg-white text-secondary/70 hover:bg-secondary/5"
            }`}
          >
            In Attesa
          </button>
          <button
            onClick={() => setFilter("reviewed")}
            className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              filter === "reviewed"
                ? "text-white bg-secondary"
                : "bg-white text-secondary/70 hover:bg-secondary/5"
            }`}
          >
            Revisionate
          </button>
          <button
            onClick={() => setFilter("accepted")}
            className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              filter === "accepted"
                ? "text-white bg-secondary"
                : "bg-white text-secondary/70 hover:bg-secondary/5"
            }`}
          >
            Accettate
          </button>
          <button
            onClick={() => setFilter("rejected")}
            className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              filter === "rejected"
                ? "text-white bg-secondary"
                : "bg-white text-secondary/70 hover:bg-secondary/5"
            }`}
          >
            Rifiutate
          </button>
        </div>
      </div>

      {/* Applications List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-12 w-12 text-secondary/40 animate-spin" />
          <p className="mt-4 text-secondary/60">Caricamento candidature...</p>
        </div>
      ) : filteredApplications.length === 0 ? (
        <div className="bg-white rounded-lg p-12 text-center">
          <FileText className="h-12 w-12 text-secondary/40 mx-auto mb-4" />
          <p className="text-secondary/70">Nessuna candidatura trovata</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApplications.map((app) => (
            <div key={app.id} className="bg-white rounded-lg p-6 shadow-sm border border-secondary/10">
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Left: Application Info */}
                <div className="flex-1 space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-secondary">{app.full_name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Mail className="h-4 w-4 text-secondary/60" />
                        <a href={`mailto:${app.email}`} className="text-sm text-secondary/70 hover:text-secondary">
                          {app.email}
                        </a>
                      </div>
                    </div>

                    {/* Role Badge */}
                    <div className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                      app.role === "maestro"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-purple-100 text-purple-700"
                    }`}>
                      {app.role === "maestro" ? (
                        <>
                          <Users className="h-3.5 w-3.5" />
                          Maestro
                        </>
                      ) : (
                        <>
                          <Dumbbell className="h-3.5 w-3.5" />
                          Preparatore
                        </>
                      )}
                    </div>
                  </div>

                  {/* Message */}
                  {app.message && (
                    <div className="bg-secondary/5 rounded-lg p-4">
                      <p className="text-sm text-secondary/80 leading-relaxed">{app.message}</p>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center gap-4 text-xs text-secondary/60">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {new Date(app.created_at).toLocaleDateString("it-IT", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </div>
                    {app.cv_url && (
                      <a
                        href={app.cv_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-secondary hover:text-secondary/80 font-medium"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Visualizza CV
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="lg:w-48 flex flex-col gap-2">
                  {/* Status Badge */}
                  <div className={`px-3 py-2 rounded-lg text-xs font-semibold text-center ${
                    app.status === "pending"
                      ? "bg-amber-100 text-amber-700"
                      : app.status === "reviewed"
                      ? "bg-blue-100 text-blue-700"
                      : app.status === "accepted"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}>
                    {app.status === "pending" && "In Attesa"}
                    {app.status === "reviewed" && "Revisionata"}
                    {app.status === "accepted" && "Accettata"}
                    {app.status === "rejected" && "Rifiutata"}
                  </div>

                  {/* Action Buttons */}
                  <button
                    onClick={() => updateStatus(app.id, "reviewed")}
                    className={`w-full px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                      app.status === "reviewed"
                        ? "bg-blue-500 text-white"
                        : "bg-white text-blue-700 hover:bg-blue-50 border border-blue-200"
                    }`}
                  >
                    <Clock className="h-3 w-3" />
                    Revisiona
                  </button>
                  <button
                    onClick={() => updateStatus(app.id, "accepted")}
                    className={`w-full px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                      app.status === "accepted"
                        ? "bg-green-500 text-white"
                        : "bg-white text-green-700 hover:bg-green-50 border border-green-200"
                    }`}
                  >
                    <CheckCircle className="h-3 w-3" />
                    Accetta
                  </button>
                  <button
                    onClick={() => updateStatus(app.id, "rejected")}
                    className={`w-full px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                      app.status === "rejected"
                        ? "bg-red-500 text-white"
                        : "bg-white text-red-700 hover:bg-red-50 border border-red-200"
                    }`}
                  >
                    <XCircle className="h-3 w-3" />
                    Rifiuta
                  </button>
                  <button
                    onClick={() => deleteApplication(app.id)}
                    className="w-full px-3 py-2 rounded-lg text-xs font-medium bg-white text-red-700 hover:bg-red-50 border border-red-200 transition-all flex items-center justify-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    Elimina
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
