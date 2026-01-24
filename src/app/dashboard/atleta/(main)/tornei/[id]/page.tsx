"use client";

import React, { useEffect, useState, Suspense } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import TournamentManagerWrapper from "@/components/tournaments/TournamentManagerWrapper";
import {
  Trophy,
  Loader2,
  CheckCircle2,
  X,
  Target,
  Users as UsersIcon
} from "lucide-react";

type TournamentType = 'eliminazione_diretta' | 'girone_eliminazione' | 'campionato';

type Tournament = {
  id: string;
  title: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  category?: string;
  level?: string;
  max_participants?: number;
  status?: string;
  tournament_type?: TournamentType;
  competition_type?: TournamentType;
  best_of?: number;
  match_format?: string;
  rounds_data?: any[];
  groups_data?: any[];
  standings?: any[];
};

function AtletaTournamentDetailInner() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params?.id[0] : params?.id;
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [currentParticipants, setCurrentParticipants] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      if (!id) {
        if (mounted) {
          setError('ID torneo mancante');
          setLoading(false);
        }
        return;
      }
      try {
        const res = await fetch(`/api/tournaments?id=${id}`);
        let json: any = {};
        try {
          json = await res.json();
        } catch (e) {
          json = {};
        }
        if (!res.ok) throw new Error(json.error || 'Errore caricamento torneo');
        if (mounted) {
          setTournament(json.tournament ?? null);
          setCurrentParticipants(json.current_participants ?? 0);
        }

        // get user and check participation
        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user;
        if (user) {
          const pRes = await fetch(`/api/tournament_participants?user_id=${user.id}&tournament_id=${id}`);
          let pJson: any = {};
          try {
            pJson = await pRes.json();
          } catch (e) {
            pJson = {};
          }
          if (pRes.ok && pJson.participants && pJson.participants.length > 0) {
            if (mounted) setJoined(true);
          }
        }
      } catch (err: any) {
        if (mounted) setError(err.message || 'Errore');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();

    return () => { mounted = false; };
  }, [id]);

  const handleJoin = async () => {
    setError(null);
    setActionLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user ?? null;
      if (!user) {
        setError('Devi effettuare il login per iscriverti');
        setActionLoading(false);
        return;
      }

      const token = sessionData?.session?.access_token ?? null;
      const res = await fetch('/api/tournament_participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ user_id: user.id, tournament_id: id }),
      });
      let json: any = {};
      try {
        json = await res.json();
      } catch (e) {
        json = {};
      }
      if (!res.ok) {
        setError(json.error || 'Errore iscrizione');
      } else {
        setJoined(true);
        setCurrentParticipants((c) => c + 1);
        // Reload the page to refresh TournamentManagerWrapper
        window.location.reload();
      }
    } catch (err: any) {
      setError(err.message || 'Errore rete');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!confirm('Sei sicuro di voler cancellare la tua iscrizione?')) {
      return;
    }

    setError(null);
    setActionLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user ?? null;
      if (!user) {
        setError('Devi effettuare il login');
        setActionLoading(false);
        return;
      }

      const token = sessionData?.session?.access_token ?? null;
      const res = await fetch(`/api/tournament_participants?user_id=${user.id}&tournament_id=${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      let json: any = {};
      try {
        json = await res.json();
      } catch (e) {
        json = {};
      }
      if (!res.ok) {
        setError(json.error || 'Errore cancellazione iscrizione');
      } else {
        setJoined(false);
        setCurrentParticipants((c) => Math.max(0, c - 1));
        // Reload the page to refresh TournamentManagerWrapper
        window.location.reload();
      }
    } catch (err: any) {
      setError(err.message || 'Errore rete');
    } finally {
      setActionLoading(false);
    }
  };

  // Determina icona in base al tipo
  function getTournamentIcon() {
    const tournamentType = tournament?.tournament_type || tournament?.competition_type;
    if (tournamentType === 'eliminazione_diretta') {
      return Trophy;
    } else if (tournamentType === 'girone_eliminazione') {
      return Target;
    } else if (tournamentType === 'campionato') {
      return UsersIcon;
    }
    return Trophy;
  }

  const TournamentIcon = getTournamentIcon();

  // Determina colore bordo in base allo stato - using CSS variables from design system
  function getStatusBorderColor() {
    if (tournament?.status === "Chiuso" || tournament?.status === "Completato" || tournament?.status === "Concluso") {
      return "var(--foreground-muted)"; // #056c94 - frozen-700
    } else if (tournament?.status === "In Corso" || tournament?.status === "In corso") {
      return "var(--secondary)"; // #034863 - frozen-800
    } else if (tournament?.status === "Aperto") {
      return "var(--primary)"; // #08b3f7 - frozen-500
    }
    return "var(--secondary)"; // default
  }

  const spotsLeft = (tournament?.max_participants ?? 0) - currentParticipants;
  const isCampionato = tournament?.competition_type === 'campionato' || tournament?.tournament_type === 'campionato';
  const isFull = tournament?.status === 'Aperto' && spotsLeft <= 0;
  const getDisplayStatus = () => {
    if (isFull) {
      return "Registrazioni Chiuse - Posti Esauriti";
    }
    return tournament?.status || "In preparazione";
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-secondary" />
        <p className="mt-4 text-secondary/70">Caricamento torneo...</p>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="space-y-6">
        {/* Breadcrumb */}
        <p className="breadcrumb text-secondary/60">
          <Link
            href="/dashboard/atleta/tornei"
            className="hover:text-secondary/80 transition-colors"
          >
            Competizioni
          </Link>
          {" › "}
          <span>Dettaglio</span>
        </p>

        <div className="text-center py-20 bg-white rounded-xl">
          <Trophy className="h-16 w-16 text-secondary/20 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-secondary mb-2">Torneo non trovato</h2>
          <p className="text-secondary/70 mb-6">Il torneo che stai cercando non esiste o è stato rimosso.</p>
          <button
            onClick={() => router.push('/dashboard/atleta/tornei')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-secondary text-white rounded-md font-medium hover:opacity-90 transition-all"
          >
            Torna ai Tornei
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <p className="breadcrumb text-secondary/60">
        <Link
          href="/dashboard/atleta/tornei"
          className="hover:text-secondary/80 transition-colors"
        >
          Competizioni
        </Link>
        {" › "}
        <span>Dettaglio</span>
      </p>

      {/* Header con titolo e descrizione */}
      <div>
        <h1 className="text-3xl font-bold text-secondary mb-2">
          Dettaglio Competizione
        </h1>
        <p className="text-secondary/70 font-medium">
          Visualizza informazioni e partecipa al torneo
        </p>
      </div>

      {/* Messaggio errore globale */}
      {error && (
        <div className="p-4 rounded-md bg-red-50 border border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Header con info torneo */}
      <div
        className="bg-secondary rounded-xl border-t border-r border-b border-secondary p-6 border-l-4"
        style={{ borderLeftColor: getStatusBorderColor() }}
      >
        <div className="flex items-start gap-6">
          <TournamentIcon className="h-8 w-8 text-white flex-shrink-0" strokeWidth={2.5} />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">{tournament.title}</h1>
          </div>
        </div>
      </div>

      {/* Badge iscritto */}
      {joined && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 border-l-4" style={{ borderLeftColor: 'var(--primary)' }}>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6" style={{ color: 'var(--primary)' }} />
            <h3 className="text-lg font-bold text-secondary">Sei iscritto a questo torneo</h3>
          </div>
        </div>
      )}

      {/* Dettagli torneo */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-secondary mb-6">Dettagli competizione</h2>

        <div className="space-y-6">
          {/* Descrizione */}
          {tournament.description && (
            <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-8 pb-6 border-b border-gray-200">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Descrizione</label>
              <div className="flex-1">
                <p className="text-secondary/70">{tournament.description}</p>
              </div>
            </div>
          )}

          {/* Data Inizio */}
          {tournament.start_date && (
            <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-8 pb-6 border-b border-gray-200">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Data inizio</label>
              <div className="flex-1">
                <p className="text-secondary font-semibold">
                  {(() => {
                    const dateStr = new Date(tournament.start_date).toLocaleDateString("it-IT", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    });
                    // Capitalizza il primo carattere (giorno della settimana) e il mese
                    return dateStr.replace(/^(.)/, (match) => match.toUpperCase()).replace(/(\s)([a-z])/g, (match, space, char) => space + char.toUpperCase());
                  })()}
                </p>
              </div>
            </div>
          )}

          {/* Tipo */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-8 pb-6 border-b border-gray-200">
            <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Tipo competizione</label>
            <div className="flex-1">
              <p className="text-secondary font-semibold">
                {isCampionato ? 'Campionato' :
                 (tournament.tournament_type === 'girone_eliminazione' || tournament.competition_type === 'girone_eliminazione') ? 'Girone + Eliminazione' :
                 'Eliminazione Diretta'}
              </p>
            </div>
          </div>

          {/* Stato */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-8 pb-6 border-b border-gray-200">
            <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Stato</label>
            <div className="flex-1">
              <p className="text-secondary font-semibold">{getDisplayStatus()}</p>
            </div>
          </div>

          {/* Partecipanti */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-8 pb-6 border-b border-gray-200">
            <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Partecipanti</label>
            <div className="flex-1">
              <p className="text-secondary font-semibold">
                {currentParticipants} / {tournament.max_participants}
              </p>
            </div>
          </div>

          {/* Categoria */}
          {tournament.category && (
            <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-8 pb-6 border-b border-gray-200">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Categoria</label>
              <div className="flex-1">
                <p className="text-secondary/70">{tournament.category}</p>
              </div>
            </div>
          )}

          {/* Livello */}
          {tournament.level && (
            <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-8 pb-6 border-b border-gray-200">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Livello</label>
              <div className="flex-1">
                <p className="text-secondary/70">{tournament.level}</p>
              </div>
            </div>
          )}

          {/* Formato Partita */}
          {(tournament.match_format || tournament.best_of) && (
            <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-8">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Formato partita</label>
              <div className="flex-1">
                <p className="text-secondary/70">
                  {tournament.match_format === 'best_of_3' || tournament.best_of === 3 ? 'Al meglio di 3 set' :
                   tournament.match_format === 'best_of_5' || tournament.best_of === 5 ? 'Al meglio di 5 set' :
                   tournament.match_format === 'best_of_1' || tournament.best_of === 1 ? '1 set unico' :
                   tournament.match_format || `Best of ${tournament.best_of}`}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tournament Manager (Partecipanti/Tabellone/Gironi/Calendario/Classifica) */}
      {currentParticipants > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <TournamentManagerWrapper
            tournamentId={tournament.id}
            isAdmin={false}
          />
        </div>
      )}

      {/* Pulsanti azioni */}
      <div className="flex flex-wrap gap-3">
        {/* Bottone Iscriviti */}
        {!joined && tournament.status === 'Aperto' && (
          <button
            onClick={handleJoin}
            disabled={actionLoading || spotsLeft <= 0}
            title={spotsLeft <= 0 ? "Posti esauriti" : "Iscriviti al torneo"}
            className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-3 text-white rounded-lg font-medium transition-all"
            style={{
              backgroundColor: spotsLeft <= 0 ? '#9CA3AF' : '#08b3f7',
              opacity: spotsLeft <= 0 || actionLoading ? 0.6 : 1,
              cursor: spotsLeft <= 0 || actionLoading ? 'not-allowed' : 'pointer'
            }}
          >
            {actionLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Iscrizione in corso...
              </>
            ) : spotsLeft <= 0 ? (
              <>
                <X className="h-5 w-5" />
                Posti Esauriti
              </>
            ) : (
              <>
                <Trophy className="h-5 w-5" />
                Iscriviti al Torneo
              </>
            )}
          </button>
        )}

        {/* Bottone Cancella Iscrizione */}
        {joined && tournament.status === 'Aperto' && (
          <button
            onClick={handleLeave}
            disabled={actionLoading}
            className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-3 text-white bg-[#056c94] rounded-lg hover:bg-[#056c94]/90 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {actionLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Cancellazione in corso...
              </>
            ) : (
              <>
                <X className="h-5 w-5" />
                Cancella Iscrizione
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export default function AtletaTournamentDetailPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-secondary" />
        <p className="mt-4 text-secondary/70">Caricamento...</p>
      </div>
    }>
      <AtletaTournamentDetailInner />
    </Suspense>
  );
}
