"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter, useParams } from "next/navigation";
import CompetitionView from "@/components/tournaments/CompetitionView";
import { 
  Trophy, 
  ArrowLeft,
  CheckCircle2,
  X
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
        // refresh participants and counts
        try {
          const pRes2 = await fetch(`/api/tournament_participants?tournament_id=${id}`);
          let pJson2: any = {};
          try { pJson2 = await pRes2.json(); } catch (e) { pJson2 = {}; }
          if (pRes2.ok) {
            setParticipantsList(pJson2.participants ?? []);
            setCurrentParticipants(pJson2.participants ? pJson2.participants.length : 0);
          } else {
            setCurrentParticipants((c) => Math.max(0, c - 1));
          }
        } catch (e) {
          setCurrentParticipants((c) => Math.max(0, c - 1));
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
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-secondary/20 border-t-secondary"></div>
          <p className="mt-4 text-secondary/70">Caricamento torneo...</p>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="space-y-6">
        <div className="text-center py-20 bg-white rounded-md">
          <Trophy className="h-16 w-16 text-secondary/20 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-secondary mb-2">Torneo non trovato</h2>
          <p className="text-secondary/70 mb-6">Il torneo che stai cercando non esiste o è stato rimosso.</p>
          <button
            onClick={() => router.push('/dashboard/atleta/tornei')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-secondary text-white rounded-md font-medium hover:opacity-90 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            Torna ai Tornei
          </button>
        </div>
      </div>
    );
  }

  const spotsLeft = (tournament.max_participants ?? 0) - currentParticipants;
  const isCampionato = tournament.competition_type === 'campionato';

  return (
    <div className="space-y-6">
      {/* Header with Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-secondary/60 mb-2">
            <button
              onClick={() => router.push('/dashboard/atleta/tornei')}
              className="hover:text-secondary transition-colors"
            >
              Competizioni
            </button>
            <span>›</span>
            <span className="text-secondary">Dettaglio</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-secondary">Dettaglio Competizione</h1>
          <p className="text-sm text-secondary/70 mt-1">Visualizza informazioni e partecipa al torneo</p>
        </div>
        
        {/* Bottoni Azione */}
        {!joined && tournament.status === 'Aperto' && spotsLeft > 0 && (
          <button
            onClick={handleJoin}
            disabled={actionLoading}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-secondary px-6 py-3 text-sm font-medium text-white hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
        )}
        
        {joined && tournament.status === 'Aperto' && (
          <button
            onClick={handleLeave}
            disabled={actionLoading}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {actionLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-700/30 border-t-red-700"></div>
                <span>Cancellazione...</span>
              </>
            ) : (
              <>
                <X className="h-4 w-4" />
                <span>Cancella Iscrizione</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Messaggio errore globale */}
      {error && (
        <div className="p-4 rounded-md bg-red-50 border border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Tournament Info Header */}
      {tournament && (
        <div className="bg-white rounded-md p-6 hover:shadow-md transition-all">
          {/* Hero Header */}
          <div className="mb-8">
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

            {/* ID */}
            <p className="text-sm text-secondary/70 mb-4">
              {tournament.id}
            </p>

            {/* Description */}
            {tournament.description && (
              <p className="text-base sm:text-lg text-secondary/80 leading-relaxed max-w-3xl">
                {tournament.description}
              </p>
            )}
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
        </div>
      )}


      {joined && (
        <div className="bg-white rounded-md p-6 hover:shadow-md transition-all border-l-4 border-secondary">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-secondary" />
            <div>
              <h3 className="text-lg font-bold text-secondary">Sei iscritto a questo torneo</h3>
              <p className="text-sm text-secondary/70">Buona fortuna!</p>
            </div>
          </div>
        </div>
      )}

      {/* Competition View (Bracket/Groups/Standings) - Sempre visibile */}
      <div className="bg-white rounded-md p-6 hover:shadow-md transition-all">
        <CompetitionView
          tournament={tournament}
          participants={participantsList}
        />
      </div>
    </div>
  );
}
