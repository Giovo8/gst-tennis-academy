"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  Clock,
  FileText,
  ExternalLink,
  Users,
  Dumbbell,
  CheckCircle,
  XCircle,
  Trash2,
  Loader2,
  Calendar,
  User,
} from "lucide-react";
import Link from "next/link";

interface JobApplication {
  id: string;
  full_name: string;
  email: string;
  role: "maestro" | "preparatore";
  message: string;
  cv_url: string | null;
  status: "pending" | "reviewed" | "accepted" | "rejected";
  created_at: string;
}

export default function JobApplicationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [application, setApplication] = useState<JobApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadApplication();
  }, [id]);

  const loadApplication = async () => {
    try {
      const res = await fetch("/api/recruitment-applications");
      const data = await res.json();
      const app = data.applications?.find((a: JobApplication) => a.id === id);
      setApplication(app || null);
    } catch (error) {
      console.error("Error loading application:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: "pending" | "reviewed" | "accepted" | "rejected") => {
    try {
      setUpdating(true);
      const res = await fetch("/api/recruitment-applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });

      if (res.ok) {
        setApplication((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (error) {
      console.error("Error updating status:", error);
    } finally {
      setUpdating(false);
    }
  };

  const deleteApplication = async () => {
    if (!confirm("⚠️ ATTENZIONE: Sei sicuro di voler eliminare questa candidatura?\n\nQuesta azione è irreversibile.")) return;

    try {
      setDeleting(true);
      const res = await fetch("/api/recruitment-applications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        router.push("/dashboard/admin/job-applications");
      }
    } catch (error) {
      console.error("Error deleting application:", error);
    } finally {
      setDeleting(false);
    }
  };

  // Determina colore bordo in base allo stato
  function getStatusBorderColor() {
    if (application?.status === "rejected") {
      return "border-red-500";
    } else if (application?.status === "accepted") {
      return "border-emerald-500";
    } else if (application?.status === "reviewed") {
      return "border-blue-500";
    } else {
      return "border-amber-500";
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-secondary" />
        <p className="mt-4 text-secondary/60">Caricamento...</p>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="space-y-6">
        <div className="inline-flex items-center text-xs font-semibold text-secondary/60 uppercase tracking-wider mb-1">
          <Link
            href="/dashboard/admin/job-applications"
            className="hover:text-secondary/80 transition-colors"
          >
            Candidature Lavoro
          </Link>
          <span className="mx-2">›</span>
          <span>Dettaglio</span>
        </div>
        <div className="bg-white rounded-lg p-12 text-center">
          <p className="text-secondary/70">Candidatura non trovata</p>
        </div>
      </div>
    );
  }

  const RoleIcon = application.role === "maestro" ? Users : Dumbbell;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="breadcrumb text-secondary/60">
          <Link
            href="/dashboard/admin/job-applications"
            className="hover:text-secondary/80 transition-colors"
          >
            Candidature Lavoro
          </Link>
          {" › "}
          <span>Dettaglio Candidatura</span>
        </p>
        <h1 className="text-4xl font-bold text-secondary">Dettaglio Candidatura</h1>
      </div>

      {/* Header con info candidatura */}
      <div
        className="rounded-xl border-t border-r border-b p-6 border-l-4"
        style={{
          backgroundColor: application.role === "maestro" ? "var(--secondary)" : "#023047",
          borderColor: application.role === "maestro" ? "var(--secondary)" : "#023047",
          borderLeftColor: application.role === "maestro" ? "#023047" : "#011a24",
        }}
      >
        <div className="flex items-start gap-6">
          <RoleIcon className="h-8 w-8 text-white flex-shrink-0" strokeWidth={2.5} />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">{application.full_name}</h1>
          </div>
        </div>
      </div>

      {/* Dettagli candidatura */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
          <h2 className="text-base sm:text-lg font-semibold text-secondary">Informazioni candidato</h2>
        </div>
        <div className="p-6 space-y-6">
          {/* Nome Completo */}
          <div className="flex flex-col md:flex-row md:items-start gap-3 md:gap-8 pb-6 border-b border-gray-200">
            <label className="w-full md:w-48 md:pt-0.5 text-sm text-secondary font-medium flex-shrink-0">Nome completo</label>
            <div className="flex-1">
              <p className="text-secondary font-semibold">{application.full_name}</p>
            </div>
          </div>

          {/* Email */}
          <div className="flex flex-col md:flex-row md:items-start gap-3 md:gap-8 pb-6 border-b border-gray-200">
            <label className="w-full md:w-48 md:pt-0.5 text-sm text-secondary font-medium flex-shrink-0">Email</label>
            <div className="flex-1">
              <a
                href={`mailto:${application.email}`}
                className="text-secondary font-semibold hover:text-secondary/70 transition-colors"
              >
                {application.email}
              </a>
            </div>
          </div>

          {/* Ruolo */}
          <div className="flex flex-col md:flex-row md:items-start gap-3 md:gap-8 pb-6 border-b border-gray-200">
            <label className="w-full md:w-48 md:pt-0.5 text-sm text-secondary font-medium flex-shrink-0">Ruolo richiesto</label>
            <div className="flex-1">
              <p className="text-secondary font-semibold">
                {application.role === "maestro" ? "Maestro di Tennis" : "Preparatore Atletico"}
              </p>
            </div>
          </div>

          {/* Data Candidatura */}
          <div className="flex flex-col md:flex-row md:items-start gap-3 md:gap-8">
            <label className="w-full md:w-48 md:pt-0.5 text-sm text-secondary font-medium flex-shrink-0">Data candidatura</label>
            <div className="flex-1">
              <p className="text-secondary font-semibold">
                {(() => {
                  const s = new Date(application.created_at).toLocaleDateString("it-IT", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  return s.replace(/^(\w)/, (c) => c.toUpperCase()).replace(/ (\w{3,})( \d)/, (_, m, rest) => ` ${m.charAt(0).toUpperCase()}${m.slice(1)}${rest}`);
                })()}
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Messaggio di Presentazione */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
          <h2 className="text-base sm:text-lg font-semibold text-secondary">Messaggio di presentazione</h2>
        </div>
        <div className="p-6">
          {application.message ? (
            <p className="text-secondary/80 leading-relaxed whitespace-pre-wrap">{application.message}</p>
          ) : (
            <p className="text-secondary/40 italic">Nessun messaggio fornito</p>
          )}
        </div>
      </div>

      {/* Azioni */}
      <div className="flex flex-col sm:flex-row gap-3">
        {application.cv_url && (
          <a
            href={application.cv_url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center px-6 py-3 text-white bg-secondary rounded-lg hover:bg-secondary/90 transition-all font-medium"
          >
            Visualizza Curriculum
          </a>
        )}
        <button
          onClick={deleteApplication}
          disabled={deleting}
          className="w-full flex items-center justify-center px-6 py-3 text-white bg-[#022431] rounded-lg hover:bg-[#022431]/90 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {deleting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Elimina"}
        </button>
      </div>
    </div>
  );
}
