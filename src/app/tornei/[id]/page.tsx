"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter, useParams } from "next/navigation";
import CompetitionView from "@/components/tournaments/CompetitionView";
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
    <div className="min-h-screen bg-white">
      <PublicNavbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 md:py-12">
        {/* Hero Header */}
        <div className="mb-8 sm:mb-10 md:mb-12">
          {/* Tournament Type Badge */}
          <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-secondary/60 mb-3">
            {isCampionato ? 'Campionato' : 'Torneo'}
          </p>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-secondary mb-4 leading-tight">
            {tournament.title}
          </h1>

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-secondary/60 mb-6">
            {tournament.category && (
              <span>{tournament.category}</span>
            )}
            {tournament.status && (
              <>
                <span>•</span>
                <span>{tournament.status}</span>
              </>
            )}
            {tournament.level && (
              <>
                <span>•</span>
                <span>{tournament.level}</span>
              </>
            )}
          </div>

          {/* Description */}
          {tournament.description && (
            <p className="text-base sm:text-lg text-secondary/80 leading-relaxed max-w-3xl">
              {tournament.description}
            </p>
          )}
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 sm:mb-10 md:mb-12">
          {/* Date Card */}
          {tournament.start_date && (
            <div className="border-l-4 border-secondary pl-4">
              <p className="text-xs font-bold uppercase tracking-wider text-secondary/60 mb-2">Data Inizio</p>
              <p className="text-xl font-bold text-secondary">
                {new Date(tournament.start_date).toLocaleDateString('it-IT', { 
                  day: 'numeric', 
                  month: 'long'
                })}
              </p>
              <p className="text-sm text-secondary/70 mt-1">
                {new Date(tournament.start_date).toLocaleDateString('it-IT', { 
                  year: 'numeric'
                })} ore {new Date(tournament.start_date).toLocaleTimeString('it-IT', { 
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          )}

          {/* Participants Card */}
          <div className="border-l-4 border-secondary pl-4">
            <p className="text-xs font-bold uppercase tracking-wider text-secondary/60 mb-2">Partecipanti</p>
            <p className="text-xl font-bold text-secondary">
              {currentParticipants} / {tournament.max_participants}
            </p>
            <p className="text-sm text-secondary/70 mt-1">
              {spotsLeft > 0 ? `${spotsLeft} posti disponibili` : 'Tutto esaurito'}
            </p>
          </div>

          {/* Format Card */}
          {tournament.best_of && (
            <div className="border-l-4 border-secondary pl-4">
              <p className="text-xs font-bold uppercase tracking-wider text-secondary/60 mb-2">Formato</p>
              <p className="text-xl font-bold text-secondary">
                Best of {tournament.best_of}
              </p>
              <p className="text-sm text-secondary/70 mt-1">
                {tournament.best_of === 3 ? 'Al meglio di 3 set' : tournament.best_of === 5 ? 'Al meglio di 5 set' : 'Set personalizzati'}
              </p>
            </div>
          )}
        </div>

        {/* Action Section */}
        <div className="mb-8 sm:mb-10 md:mb-12">
          {!isManager && (
            <div>
              {joined ? (
                <div className="bg-secondary/5 p-6 rounded">
                  <p className="text-lg font-bold text-secondary mb-2">✓ Sei iscritto a questo torneo</p>
                  <p className="text-sm text-secondary/70">Controlla la dashboard per gli aggiornamenti e il tabellone</p>
                </div>
              ) : spotsLeft <= 0 ? (
                <div className="bg-secondary/5 p-6 rounded">
                  <p className="text-lg font-bold text-secondary mb-2">Iscrizioni chiuse</p>
                  <p className="text-sm text-secondary/70">Tutti i posti sono stati occupati</p>
                </div>
              ) : (
                <div>
                  <h3 className="text-xl font-bold text-secondary mb-4">Partecipa al torneo</h3>
                  <button 
                    onClick={handleJoin} 
                    disabled={actionLoading} 
                    className="inline-flex items-center justify-center gap-2 px-8 py-3 text-base font-semibold bg-secondary text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
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
        </div>

        {/* Competition View Section */}
        <div>
          <CompetitionView 
            tournament={tournament}
            participants={participantsList}
            isAdmin={isManager}
          />
        </div>
      </main>
    </div>
  );
}
