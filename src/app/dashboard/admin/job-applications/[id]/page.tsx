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
      {/* Breadcrumb */}
      <div className="inline-flex items-center text-xs font-semibold text-secondary/60 uppercase tracking-wider mb-1">
        <Link
          href="/dashboard/admin/job-applications"
          className="hover:text-secondary/80 transition-colors"
        >
          Candidature Lavoro
        </Link>
        <span className="mx-2">›</span>
        <span>Dettaglio Candidatura</span>
      </div>

      {/* Header con titolo e descrizione */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-secondary mb-2">
            Dettaglio Candidatura
          </h1>
          <p className="text-secondary/70 font-medium">
            Visualizza e gestisci i dettagli della candidatura
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={deleteApplication}
            disabled={deleting}
            className="p-2.5 text-secondary/70 bg-white rounded-md hover:bg-red-600 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title="Elimina Candidatura"
          >
            {deleting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Trash2 className="h-5 w-5" />
            )}
          </button>

          <button
            onClick={() => updateStatus("reviewed")}
            disabled={updating || application.status === "reviewed"}
            className="p-2.5 text-secondary/70 bg-white rounded-md hover:bg-blue-600 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title="Segna come Revisionata"
          >
            <Clock className="h-5 w-5" />
          </button>

          <button
            onClick={() => updateStatus("accepted")}
            disabled={updating || application.status === "accepted"}
            className="p-2.5 text-secondary/70 bg-white rounded-md hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title="Accetta Candidatura"
          >
            <CheckCircle className="h-5 w-5" />
          </button>

          <button
            onClick={() => updateStatus("rejected")}
            disabled={updating || application.status === "rejected"}
            className="p-2.5 text-secondary/70 bg-white rounded-md hover:bg-red-600 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title="Rifiuta Candidatura"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Header con info candidatura */}
      <div className={`bg-white rounded-xl border-l-4 ${getStatusBorderColor()} p-6`}>
        <div className="flex items-start gap-6">
          <RoleIcon className="h-8 w-8 text-secondary flex-shrink-0" strokeWidth={2.5} />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-secondary mb-2">{application.full_name}</h1>
            <div className="flex items-center gap-3 flex-wrap">
              <div className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                application.role === "maestro"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-purple-100 text-purple-700"
              }`}>
                {application.role === "maestro" ? "Maestro" : "Preparatore Atletico"}
              </div>
              <div className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                application.status === "pending"
                  ? "bg-amber-100 text-amber-700"
                  : application.status === "reviewed"
                  ? "bg-blue-100 text-blue-700"
                  : application.status === "accepted"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-red-100 text-red-700"
              }`}>
                {application.status === "pending" && "In Attesa"}
                {application.status === "reviewed" && "Revisionata"}
                {application.status === "accepted" && "Accettata"}
                {application.status === "rejected" && "Rifiutata"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dettagli candidatura */}
      <div className="bg-white rounded-xl p-6">
        <h2 className="text-lg font-semibold text-secondary mb-6">Informazioni candidato</h2>

        <div className="space-y-6">
          {/* Nome Completo */}
          <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
            <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Nome completo</label>
            <div className="flex-1">
              <p className="text-secondary font-semibold">{application.full_name}</p>
            </div>
          </div>

          {/* Email */}
          <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
            <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Email</label>
            <div className="flex-1">
              <a
                href={`mailto:${application.email}`}
                className="text-secondary font-semibold hover:text-secondary/70 transition-colors inline-flex items-center gap-2"
              >
                <Mail className="h-4 w-4" />
                {application.email}
              </a>
            </div>
          </div>

          {/* Ruolo */}
          <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
            <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Ruolo richiesto</label>
            <div className="flex-1">
              <p className="text-secondary font-semibold">
                {application.role === "maestro" ? "Maestro di Tennis" : "Preparatore Atletico"}
              </p>
            </div>
          </div>

          {/* Data Candidatura */}
          <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
            <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Data candidatura</label>
            <div className="flex-1">
              <p className="text-secondary font-semibold inline-flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {new Date(application.created_at).toLocaleDateString("it-IT", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>

          {/* Stato */}
          <div className="flex items-start gap-8">
            <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Stato candidatura</label>
            <div className="flex-1">
              <p className="text-secondary font-semibold">
                {application.status === "pending" && "In Attesa di Revisione"}
                {application.status === "reviewed" && "Revisionata"}
                {application.status === "accepted" && "Accettata"}
                {application.status === "rejected" && "Rifiutata"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Messaggio di Presentazione */}
      <div className="bg-white rounded-xl p-6">
        <h2 className="text-lg font-semibold text-secondary mb-6">Messaggio di presentazione</h2>
        {application.message ? (
          <p className="text-secondary/80 leading-relaxed whitespace-pre-wrap">{application.message}</p>
        ) : (
          <p className="text-secondary/40 italic">Nessun messaggio fornito</p>
        )}
      </div>

      {/* Curriculum Vitae */}
      <div className="bg-white rounded-xl p-6">
        <h2 className="text-lg font-semibold text-secondary mb-6">Curriculum Vitae</h2>
        {application.cv_url ? (
          <a
            href={application.cv_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors font-medium"
          >
            <FileText className="h-5 w-5" />
            Visualizza Curriculum
            <ExternalLink className="h-4 w-4" />
          </a>
        ) : (
          <p className="text-secondary/40 italic">Nessun CV caricato</p>
        )}
      </div>
    </div>
  );
}
