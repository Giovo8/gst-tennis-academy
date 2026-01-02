"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter, useParams } from "next/navigation";
import CompetitionView from "@/components/tournaments/CompetitionView";
import { 
  Trophy, 
  Award, 
  Calendar, 
  Users, 
  Target, 
  Zap, 
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock
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
  best_of?: number;
  rounds_data?: any[];
  groups_data?: any[];
  standings?: any[];
};

export default function TournamentDetailDashboard() {
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
          // ignore participants fetch errors
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600"></div>
            <p className="mt-4 text-gray-600">Caricamento torneo...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20 bg-white rounded-xl border border-gray-200 shadow-sm">
            <Trophy className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Torneo non trovato</h2>
            <p className="text-gray-600 mb-6">Il torneo che stai cercando non esiste o è stato rimosso.</p>
            <button
              onClick={() => router.push('/dashboard/atleta/tornei')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-medium hover:from-cyan-600 hover:to-blue-700 transition-all shadow-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              Torna ai Tornei
            </button>
          </div>
        </div>
      </div>
    );
  }

  const spotsLeft = (tournament.max_participants ?? 0) - currentParticipants;
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
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'In Corso':
      case 'In corso':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'Completato':
      case 'Concluso':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Aperto':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'In Corso':
      case 'In corso':
        return <Clock className="h-4 w-4" />;
      case 'Completato':
      case 'Concluso':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Trophy className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.push('/dashboard/atleta/tornei')}
          className="mb-6 inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Torna ai Tornei</span>
        </button>

        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-8 mb-6 shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-blue-600/5"></div>
          
          <div className="relative z-10">
            {/* Tournament Type Badge */}
            <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500/10 to-blue-600/10 border border-cyan-200">
              {isCampionato ? (
                <>
                  <Award className="h-4 w-4 text-cyan-600" />
                  <span className="text-sm font-bold text-cyan-700 uppercase tracking-wider">Campionato</span>
                </>
              ) : (
                <>
                  <Trophy className="h-4 w-4 text-cyan-600" />
                  <span className="text-sm font-bold text-cyan-700 uppercase tracking-wider">Torneo</span>
                </>
              )}
            </div>

            {/* Title */}
            <h1 className="text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent leading-tight">
              {tournament.title}
            </h1>

            {/* Tags */}
            <div className="flex flex-wrap items-center gap-2 mb-6">
              {tournament.status && (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${getStatusColor(tournament.status)}`}>
                  {getStatusIcon(tournament.status)}
                  {tournament.status}
                </span>
              )}
              {tournament.category && (
                <span className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold border border-gray-200">
                  {tournament.category}
                </span>
              )}
              {tournament.level && (
                <span className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold border border-gray-200">
                  {tournament.level}
                </span>
              )}
              <span className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold border border-gray-200">
                {getTournamentTypeLabel()}
              </span>
            </div>

            {/* Description */}
            {tournament.description && (
              <p className="text-gray-700 text-lg leading-relaxed max-w-3xl">
                {tournament.description}
              </p>
            )}
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Date Card */}
          {tournament.start_date && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 p-3">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Inizio</p>
                  <p className="text-gray-900 text-lg font-semibold leading-tight">
                    {new Date(tournament.start_date).toLocaleDateString('it-IT', { 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric'
                    })}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
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
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 p-3">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Partecipanti</p>
                <p className="text-xl font-bold text-gray-900 leading-tight">
                  {currentParticipants}<span className="text-gray-400">/{tournament.max_participants}</span>
                </p>
                {spotsLeft > 0 ? (
                  <p className="text-xs text-emerald-600 mt-0.5">{spotsLeft} posti disponibili</p>
                ) : (
                  <p className="text-xs text-red-600 mt-0.5">Tutto esaurito</p>
                )}
              </div>
            </div>
          </div>

          {/* Format Card */}
          {tournament.best_of && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 p-3">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Formato Match</p>
                  <p className="text-xl font-bold text-gray-900 leading-tight">
                    Best of {tournament.best_of}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {tournament.best_of === 3 ? 'Al meglio di 3 set' : tournament.best_of === 5 ? 'Al meglio di 5 set' : 'Set personalizzati'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Section */}
        {!joined && tournament.status === 'Aperto' && spotsLeft > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 mb-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Iscrizione</h3>
            {error && (
              <div className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            <button
              onClick={handleJoin}
              disabled={actionLoading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-md hover:from-cyan-600 hover:to-blue-700 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {actionLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                  Iscrizione in corso...
                </>
              ) : (
                <>
                  <Trophy className="h-4 w-4" />
                  Iscriviti al Torneo
                </>
              )}
            </button>
          </div>
        )}

        {joined && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 mb-6 shadow-sm">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              <div>
                <h3 className="text-lg font-bold text-emerald-900">Sei iscritto a questo torneo</h3>
                <p className="text-sm text-emerald-700">Buona fortuna!</p>
              </div>
            </div>
          </div>
        )}

        {/* Competition View (Bracket/Groups/Standings) */}
        {tournament.status !== 'Aperto' && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <CompetitionView
              tournament={tournament}
              participants={participantsList}
            />
          </div>
        )}
      </div>
    </div>
  );
}
