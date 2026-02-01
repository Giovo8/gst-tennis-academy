"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter, useParams } from "next/navigation";
import TournamentManagerWrapper from "@/components/tournaments/TournamentManagerWrapper";
import PublicNavbar from "@/components/layout/PublicNavbar";
import { Trophy, Award, Calendar, Users, Target, Zap, ArrowLeft, Loader2 } from "lucide-react";

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
  rounds_data?: any[];
  groups_data?: any[];
  standings?: any[];
};

export default function TournamentDetail() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params?.id[0] : params?.id;
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [currentParticipants, setCurrentParticipants] = useState<number>(0);
  const [participantsList, setParticipantsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
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

        // fetch participants list for bracket rendering
        try {
          const partRes = await fetch(`/api/tournament_participants?tournament_id=${id}`);
          let pJson: any = {};
          try { pJson = await partRes.json(); } catch (e) { pJson = {}; }
          if (partRes.ok) {
            if (mounted) setParticipantsList(pJson.participants ?? []);
          }
        } catch (e) {
          // ignore participants fetch errors on public page
        }

        // get user
        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user;
        if (user) {
          const { data: profiles } = await supabase.from('profiles').select('*').eq('id', user.id).single();
          if (mounted) setProfile(profiles);

          // check participation
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

        // nothing extra for coaches on the public detail page — management is in Dashboard
      } catch (err: any) {
        if (mounted) setError(err.message || 'Errore');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    // poll participants periodically to keep the bracket up-to-date
    const interval = setInterval(() => {
      if (id) {
        fetch(`/api/tournament_participants?tournament_id=${id}`)
          .then((r) => r.json())
          .then((j) => {
            if (j && j.participants) setParticipantsList(j.participants);
          })
          .catch(() => {});
      }
    }, 15000);

    return () => { mounted = false; clearInterval(interval); };
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
        body: JSON.stringify({ user_id: user.id, tournament_id: id, role: profile?.role ?? null }),
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
        // refresh participants and counts
        try {
          const pRes2 = await fetch(`/api/tournament_participants?tournament_id=${id}`);
          let pJson2: any = {};
          try { pJson2 = await pRes2.json(); } catch (e) { pJson2 = {}; }
          if (pRes2.ok) {
            setParticipantsList(pJson2.participants ?? []);
            setCurrentParticipants(pJson2.participants ? pJson2.participants.length : (c => c + 1));
          } else {
            setCurrentParticipants((c) => c + 1);
          }
        } catch (e) {
          setCurrentParticipants((c) => c + 1);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Errore rete');
    } finally {
      setActionLoading(false);
    }
  };

  // coach enrollments moved to Dashboard; public page remains read-only for coach actions

  if (loading) {
    return (
      <div className="min-h-screen bg-white">

        <PublicNavbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
              <Loader2 className="h-10 w-10 animate-spin text-secondary mx-auto" />
              <p className="mt-4 text-sm text-secondary/70">Caricamento torneo...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-white">
        <PublicNavbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center py-16">
            <Trophy className="h-16 w-16 text-secondary/40 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-secondary mb-2">Torneo non trovato</h2>
            <p className="text-sm text-secondary/70 mb-6">Il torneo che stai cercando non esiste o è stato rimosso.</p>
            <button
              onClick={() => router.push('/tornei')}
              className="inline-flex items-center gap-2 rounded-md bg-secondary px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Torna ai Tornei
            </button>
          </div>
        </main>
      </div>
    );
  }

  const spotsLeft = (tournament.max_participants ?? 0) - currentParticipants;
  const isManager = profile && ['gestore', 'admin'].includes(String(profile.role).toLowerCase());
  const isCampionato = tournament.tournament_type === 'campionato';
  
  const getTournamentTypeLabel = () => {
    switch (tournament.tournament_type) {
      case 'eliminazione_diretta':
        return 'Eliminazione Diretta';
      case 'girone_eliminazione':
        return 'Gironi + Eliminazione';
      case 'campionato':
        return 'Campionato';
      default:
        return 'Torneo';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Aperto':
        return 'bg-emerald-50 text-emerald-700';
      case 'In Corso':
      case 'In corso':
        return 'bg-amber-50 text-amber-700';
      case 'Completato':
      case 'Concluso':
        return 'bg-secondary/5 text-secondary/70';
      default:
        return 'bg-secondary/5 text-secondary/70';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNavbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 md:py-12">
        {/* Header con info torneo */}
        <div
          className="bg-secondary rounded-xl border-t border-r border-b border-secondary p-6 border-l-4 mb-6"
          style={{ borderLeftColor: (() => {
            if (tournament?.status === "Chiuso" || tournament?.status === "Completato" || tournament?.status === "Concluso") return "#6b7280";
            if (tournament?.status === "In Corso" || tournament?.status === "In corso") return "#0ea5e9";
            if (tournament?.status === "Aperto" && (tournament?.max_participants || 0) > 0 && currentParticipants >= (tournament?.max_participants || 0)) return "#ef4444";
            if (tournament?.status === "Aperto") return "#10b981";
            return "#0ea5e9";
          })() }}
        >
          <div className="flex items-start gap-6">
            <Trophy className="h-8 w-8 text-white flex-shrink-0" strokeWidth={2.5} />
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white">{tournament.title}</h1>
            </div>
          </div>
        </div>

        {/* Dettagli torneo */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-secondary mb-6">Dettagli competizione</h2>
          
          <div className="space-y-6">
            {/* Descrizione */}
            {tournament.description && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Descrizione</label>
                <div className="flex-1">
                  <p className="text-secondary/70">{tournament.description}</p>
                </div>
              </div>
            )}

            {/* Data Inizio */}
            {tournament.start_date && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Data inizio</label>
                <div className="flex-1">
                  <p className="text-secondary font-semibold">
                    {new Date(tournament.start_date).toLocaleDateString("it-IT", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            )}

            {/* Tipo */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Tipo competizione</label>
              <div className="flex-1">
                <p className="text-secondary font-semibold">
                  {getTournamentTypeLabel()}
                </p>
              </div>
            </div>

            {/* Stato */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Stato</label>
              <div className="flex-1">
                <p className="text-secondary font-semibold">{tournament.status || "In preparazione"}</p>
              </div>
            </div>

            {/* Partecipanti */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Partecipanti</label>
              <div className="flex-1">
                <p className="text-secondary font-semibold">
                  {currentParticipants} / {tournament.max_participants}
                </p>
                {spotsLeft > 0 && (
                  <p className="text-sm text-secondary/70 mt-1">
                    {spotsLeft} {spotsLeft === 1 ? 'posto disponibile' : 'posti disponibili'}
                  </p>
                )}
              </div>
            </div>

            {/* Categoria */}
            {tournament.category && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Categoria</label>
                <div className="flex-1">
                  <p className="text-secondary/70">{tournament.category}</p>
                </div>
              </div>
            )}

            {/* Formato Partita */}
            {tournament.best_of && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8">
                <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Formato partita</label>
                <div className="flex-1">
                  <p className="text-secondary/70">
                    {tournament.best_of === 3 ? 'Al meglio di 3 set' :
                     tournament.best_of === 5 ? 'Al meglio di 5 set' :
                     tournament.best_of === 1 ? '1 set unico' :
                     `Best of ${tournament.best_of}`}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Section */}
        {!isManager && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
            {joined ? (
              <div>
                <p className="text-lg font-bold text-secondary mb-2">✓ Sei iscritto a questo torneo</p>
                <p className="text-sm text-secondary/70">Controlla la dashboard per gli aggiornamenti e il tabellone</p>
              </div>
            ) : spotsLeft <= 0 ? (
              <div>
                <p className="text-lg font-bold text-secondary mb-2">Iscrizioni chiuse</p>
                <p className="text-sm text-secondary/70">Tutti i posti sono stati occupati</p>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-semibold text-secondary mb-4">Partecipa al torneo</h3>
                <button 
                  onClick={handleJoin} 
                  disabled={actionLoading} 
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-semibold bg-secondary text-white rounded-md hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Iscrizione in corso...
                    </>
                  ) : (
                    'Iscriviti Ora'
                  )}
                </button>
                
                {profile?.role === 'maestro' && (
                  <p className="mt-4 text-sm text-secondary/70">
                    <span className="font-semibold text-secondary">Nota per maestri:</span> Puoi iscrivere i tuoi atleti dalla{' '}
                    <button 
                      onClick={() => router.push('/dashboard/maestro')} 
                      className="underline hover:no-underline text-secondary font-semibold"
                    >
                      Dashboard
                    </button>
                  </p>
                )}
              </div>
            )}
        </div>
        )}

        {/* Competition View Section */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <TournamentManagerWrapper
            tournamentId={id}
            isAdmin={false}
          />
        </div>
      </main>
    </div>
  );
}
