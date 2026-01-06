"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Trophy } from "lucide-react";
import TournamentManagerWrapper from "@/components/tournaments/TournamentManagerWrapper";

function GestoreTournamentDetailInner() {
  const params = useParams();
  const router = useRouter();
  const [meta, setMeta] = useState<{
    participantsCount: number;
    maxParticipants: number;
    currentPhase: string;
    status: string;
    tournamentType?: string;
  } | null>(null);
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

  if (!id || typeof id !== "string") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600">ID torneo non valido.</p>
        <Link
          href="/dashboard/gestore/tornei"
          className="inline-flex items-center text-xs font-semibold text-secondary/60 uppercase tracking-wider mb-1 hover:text-secondary/80 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Torna ai tornei
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Link
          href="/dashboard/gestore/tornei"
          className="inline-flex items-center text-xs font-semibold text-secondary/60 uppercase tracking-wider hover:text-secondary/80 transition-colors w-fit"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Torna ai tornei
        </Link>

        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-amber-500/10 p-3">
            <Trophy className="h-6 w-6 text-amber-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">
              Dettaglio Torneo
            </h1>
            <p className="text-sm text-[var(--foreground-muted)]">
              Visualizza dettagli e statistiche del torneo
            </p>
          </div>
        </div>
      </div>

      {/* Tournament Stats Summary */}
      {meta && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4">
            <p className="text-sm text-[var(--foreground-muted)] mb-1">
              Partecipanti
            </p>
            <p className="text-2xl font-bold text-[var(--foreground)]">
              {meta.participantsCount}
              {meta.maxParticipants ? ` / ${meta.maxParticipants}` : ""}
            </p>
          </div>
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4">
            <p className="text-sm text-[var(--foreground-muted)] mb-1">Fase</p>
            <p className="text-2xl font-bold text-[var(--foreground)]">
              {meta.currentPhase || "N/A"}
            </p>
          </div>
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4">
            <p className="text-sm text-[var(--foreground-muted)] mb-1">Stato</p>
            <p className="text-2xl font-bold text-[var(--foreground)]">
              {meta.status || "N/A"}
            </p>
          </div>
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4">
            <p className="text-sm text-[var(--foreground-muted)] mb-1">Tipo</p>
            <p className="text-sm font-medium text-[var(--foreground)]">
              {meta.tournamentType === "eliminazione_diretta"
                ? "Eliminazione Diretta"
                : meta.tournamentType === "girone_eliminazione"
                ? "Girone + Eliminazione"
                : meta.tournamentType === "campionato"
                ? "Campionato"
                : "N/A"}
            </p>
          </div>
        </div>
      )}

      {/* Tournament Manager */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)]">
        <TournamentManagerWrapper 
          tournamentId={id} 
          onMetaChange={setMeta}
          viewOnly={true}
        />
      </div>
    </div>
  );
}

export default function GestoreTournamentDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <GestoreTournamentDetailInner />
    </Suspense>
  );
}
