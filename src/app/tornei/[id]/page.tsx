"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter, useParams } from "next/navigation";
import CompetitionView from "@/components/tournaments/CompetitionView";
import PublicNavbar from "@/components/layout/PublicNavbar";
import { Trophy, Award, Calendar, Users, Target, Zap, ArrowLeft } from "lucide-react";

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
      <div className="min-h-screen bg-gradient-to-br from-[#0a1929] via-[#0d1f35] to-[#0a1929]">
        <PublicNavbar />
        <main className="container mx-auto px-4 py-12">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#7de3ff]/30 border-t-[#7de3ff]"></div>
              <p className="mt-4 text-gray-400">Caricamento torneo...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a1929] via-[#0d1f35] to-[#0a1929]">
        <PublicNavbar />
        <main className="container mx-auto px-4 py-12">
          <div className="text-center py-20">
            <Trophy className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Torneo non trovato</h2>
            <p className="text-gray-400 mb-6">Il torneo che stai cercando non esiste o è stato rimosso.</p>
            <button
              onClick={() => router.push('/tornei')}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#7de3ff] to-[#4fb3ff] px-6 py-3 text-sm font-bold text-[#0a1929] hover:shadow-lg hover:shadow-[#7de3ff]/40 transition-all"
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
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'In Corso':
      case 'In corso':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
      case 'Completato':
      case 'Concluso':
        return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
      default:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1929] via-[#0d1f35] to-[#0a1929]">
      <PublicNavbar />
      
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8 max-w-7xl">
        {/* Back Button */}
        <button
          onClick={() => router.push('/tornei')}
          className="mb-4 sm:mb-6 inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors group min-h-[44px]"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs sm:text-sm font-medium">Torna ai Tornei</span>
        </button>

        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-xl sm:rounded-2xl lg:rounded-3xl border border-[#7de3ff]/20 bg-gradient-to-br from-[#0d1f35] to-[#0a1929] p-4 sm:p-6 lg:p-8 mb-4 sm:mb-6 lg:mb-8">
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#7de3ff]/5 via-transparent to-[#4fb3ff]/5"></div>
          
          <div className="relative z-10">
            {/* Tournament Type Badge */}
            <div className="inline-flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[#7de3ff]/10 border border-[#7de3ff]/30">
              {isCampionato ? (
                <>
                  <Award className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#7de3ff]" />
                  <span className="text-xs sm:text-sm font-bold text-[#7de3ff] uppercase tracking-wider">Campionato</span>
                </>
              ) : (
                <>
                  <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#7de3ff]" />
                  <span className="text-xs sm:text-sm font-bold text-[#7de3ff] uppercase tracking-wider">Torneo</span>
                </>
              )}
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 sm:mb-4 bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent leading-tight">
              {tournament.title}
            </h1>

            {/* Tags */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-4 sm:mb-6">
              {tournament.status && (
                <span className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-bold border ${getStatusColor(tournament.status)}`}>
                  {tournament.status}
                </span>
              )}
              {tournament.category && (
                <span className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-white/5 text-gray-300 text-xs font-medium border border-white/10">
                  {tournament.category}
                </span>
              )}
              {tournament.level && (
                <span className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-white/5 text-gray-300 text-xs font-medium border border-white/10">
                  {tournament.level}
                </span>
              )}
              <span className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-white/5 text-gray-300 text-xs font-medium border border-white/10">
                {getTournamentTypeLabel()}
              </span>
            </div>

            {/* Description */}
            {tournament.description && (
              <p className="text-gray-300 text-sm sm:text-base lg:text-lg leading-relaxed max-w-3xl">
                {tournament.description}
              </p>
            )}
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6 lg:mb-8">
          {/* Date Card */}
          {tournament.start_date && (
            <div className="rounded-xl sm:rounded-2xl border border-[#7de3ff]/20 bg-gradient-to-br from-[#0d1f35]/80 to-[#0a1929]/80 backdrop-blur-sm p-4 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="rounded-lg sm:rounded-xl bg-gradient-to-br from-[#7de3ff]/20 to-[#4fb3ff]/20 p-2.5 sm:p-3 ring-1 ring-[#7de3ff]/30">
                  <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-[#7de3ff]" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Inizio</p>
                  <p className="text-white text-base sm:text-lg font-semibold leading-tight">
                    {new Date(tournament.start_date).toLocaleDateString('it-IT', { 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric'
                    })}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(tournament.start_date).toLocaleTimeString('it-IT', { 
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Participants Card */}
          <div className="rounded-xl sm:rounded-2xl border border-[#7de3ff]/20 bg-gradient-to-br from-[#0d1f35]/80 to-[#0a1929]/80 backdrop-blur-sm p-4 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="rounded-lg sm:rounded-xl bg-gradient-to-br from-[#7de3ff]/20 to-[#4fb3ff]/20 p-2.5 sm:p-3 ring-1 ring-[#7de3ff]/30">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-[#7de3ff]" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Partecipanti</p>
                <p className="text-lg sm:text-xl font-bold text-white leading-tight">
                  {currentParticipants}<span className="text-gray-400">/{tournament.max_participants}</span>
                </p>
                {spotsLeft > 0 ? (
                  <p className="text-xs text-emerald-400 mt-0.5">{spotsLeft} posti disponibili</p>
                ) : (
                  <p className="text-xs text-red-400 mt-0.5">Tutto esaurito</p>
                )}
              </div>
            </div>
          </div>

          {/* Format Card */}
          {tournament.best_of && (
            <div className="rounded-xl sm:rounded-2xl border border-[#7de3ff]/20 bg-gradient-to-br from-[#0d1f35]/80 to-[#0a1929]/80 backdrop-blur-sm p-4 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="rounded-lg sm:rounded-xl bg-gradient-to-br from-[#7de3ff]/20 to-[#4fb3ff]/20 p-2.5 sm:p-3 ring-1 ring-[#7de3ff]/30">
                  <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-[#7de3ff]" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Formato Match</p>
                  <p className="text-lg sm:text-xl font-bold text-white leading-tight">
                    Best of {tournament.best_of}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {tournament.best_of === 3 ? 'Al meglio di 3 set' : tournament.best_of === 5 ? 'Al meglio di 5 set' : 'Set personalizzati'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Section */}
        <div className="rounded-xl sm:rounded-2xl border border-[#7de3ff]/20 bg-gradient-to-br from-[#0d1f35]/80 to-[#0a1929]/80 backdrop-blur-sm p-4 sm:p-6 mb-4 sm:mb-6 lg:mb-8">
          {isManager ? (
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">Gestione Competizione</h3>
              <button 
                onClick={() => router.push(profile?.role === 'admin' ? '/dashboard/admin/tornei' : '/dashboard/gestore/tornei')} 
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-tournament-primary to-tournament-secondary px-5 sm:px-6 py-3 sm:py-3.5 text-xs sm:text-sm font-bold text-tournament-bg shadow-md hover:shadow-lg transition-all hover:scale-105 active:scale-95 min-h-[44px] w-full sm:w-auto"
              >
                <Target className="h-4 w-4" />
                Gestisci Competizione
              </button>
            </div>
          ) : (
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">Iscrizione</h3>
              {joined ? (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-emerald-400 font-bold">Sei già iscritto a questo torneo</p>
                    <p className="text-sm text-gray-400 mt-0.5">Controlla la dashboard per gli aggiornamenti</p>
                  </div>
                </div>
              ) : spotsLeft <= 0 ? (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-red-400 font-bold">Iscrizioni chiuse - Sold Out</p>
                    <p className="text-sm text-gray-400 mt-0.5">Tutti i posti sono stati occupati</p>
                  </div>
                </div>
              ) : (
                <div>
                  <button 
                    onClick={handleJoin} 
                    disabled={actionLoading} 
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-tournament-primary to-tournament-secondary px-6 sm:px-8 py-3 sm:py-3.5 text-xs sm:text-sm font-bold text-tournament-bg shadow-md hover:shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] w-full sm:w-auto"
                  >
                    {actionLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-tournament-bg/30 border-t-tournament-bg rounded-full animate-spin"></div>
                        Iscrivendo...
                      </>
                    ) : (
                      <>
                        <Trophy className="h-4 w-4" />
                        Iscriviti Ora
                      </>
                    )}
                  </button>
                  
                  {profile?.role === 'maestro' && (
                    <div className="mt-3 sm:mt-4 p-3 sm:p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
                      <p className="text-xs sm:text-sm text-gray-300">
                        <span className="font-semibold text-blue-400">Sei un maestro?</span> Puoi iscrivere i tuoi atleti dalla{' '}
                        <button 
                          onClick={() => router.push('/dashboard/maestro')} 
                          className="underline text-[#7de3ff] hover:text-[#4fb3ff] transition-colors font-semibold"
                        >
                          Dashboard Maestro
                        </button>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mt-3 sm:mt-4 flex items-start gap-2.5 sm:gap-3 p-3 sm:p-4 rounded-xl bg-red-500/10 border border-red-500/30">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-red-400 text-sm sm:text-base font-semibold">Errore</p>
                <p className="text-xs sm:text-sm text-gray-300 mt-0.5">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Competition View Section */}
        <div className="rounded-xl sm:rounded-2xl border border-[#7de3ff]/20 bg-gradient-to-br from-[#0d1f35]/60 to-[#0a1929]/60 backdrop-blur-sm p-4 sm:p-6">
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
