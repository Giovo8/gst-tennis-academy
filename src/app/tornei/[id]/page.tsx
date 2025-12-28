"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter, useParams } from "next/navigation";
import CompetitionView from "@/components/tournaments/CompetitionView";
import { Trophy, Award } from "lucide-react";

type CompetitionType = 'torneo' | 'campionato';
type CompetitionFormat = 'eliminazione_diretta' | 'round_robin' | 'girone_eliminazione';

type Tournament = {
  id: string;
  title: string;
  description?: string;
  starts_at?: string;
  ends_at?: string;
  category?: string;
  level?: string;
  max_participants?: number;
  status?: string;
  competition_type?: CompetitionType;
  format?: CompetitionFormat;
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

  if (loading) return <main className="container section">Caricamento...</main>;
  if (!tournament) return <main className="container section">Torneo non trovato.</main>;

  const spotsLeft = (tournament.max_participants ?? 0) - currentParticipants;
  const isManager = profile && ['gestore', 'admin'].includes(String(profile.role).toLowerCase());
  const isTorneo = tournament.competition_type === 'torneo' || !tournament.competition_type;

  return (
    <main className="container section">
      {/* Header Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 md:gap-3">
          {isTorneo ? (
            <Trophy className="w-6 h-6 md:w-8 md:h-8 text-[#7de3ff] flex-shrink-0" />
          ) : (
            <Award className="w-6 h-6 md:w-8 md:h-8 text-[#4fb3ff] flex-shrink-0" />
          )}
          <div>
            <p className="text-[10px] md:text-xs uppercase tracking-[0.15em] md:tracking-[0.2em] text-[#9fb6a6]">
              {isTorneo ? 'Torneo' : 'Campionato'}
            </p>
            <h1 className="text-xl md:text-3xl font-semibold text-white">{tournament.title}</h1>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {tournament.category && (
            <span className="px-3 py-1 rounded-full bg-[#1a3d5c]/60 border border-[#2f7de1]/30 text-sm text-muted-2">
              {tournament.category}
            </span>
          )}
          {tournament.level && (
            <span className="px-3 py-1 rounded-full bg-[#1a3d5c]/60 border border-[#2f7de1]/30 text-sm text-muted-2">
              {tournament.level}
            </span>
          )}
          {tournament.status && (
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
              tournament.status === 'Aperto' 
                ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                : tournament.status === 'In corso'
                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                : 'bg-gray-500/10 text-gray-400 border border-gray-500/30'
            }`}>
              {tournament.status}
            </span>
          )}
        </div>
      </div>

      {/* Info Card */}
      <div className="card-content rounded-xl md:rounded-2xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 mt-6">
        {tournament.description && (
          <p className="text-xs md:text-sm text-muted-2 mb-4">{tournament.description}</p>
        )}
        
        <div className="grid md:grid-cols-2 gap-3 md:gap-4 text-xs md:text-sm">
          {tournament.starts_at && (
            <div className="flex items-start gap-2 text-muted-2">
              <svg className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div>
                <div className="text-xs text-muted-2">Inizio</div>
                <div className="text-white">{new Date(tournament.starts_at).toLocaleDateString('it-IT', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</div>
              </div>
            </div>
          )}
          
          {tournament.ends_at && (
            <div className="flex items-start gap-2 text-muted-2">
              <svg className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div>
                <div className="text-xs text-muted-2">Fine</div>
                <div className="text-white">{new Date(tournament.ends_at).toLocaleDateString('it-IT', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric'
                })}</div>
              </div>
            </div>
          )}
          
          <div className="flex items-start gap-2 text-muted-2">
            <svg className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <div>
              <div className="text-[10px] md:text-xs text-muted-2">Partecipanti</div>
              <div className="text-sm md:text-base text-white font-semibold">
                {currentParticipants}/{tournament.max_participants}
                {spotsLeft > 0 && (
                  <span className="ml-2 text-xs text-green-400">({spotsLeft} posti disponibili)</span>
                )}
                {spotsLeft === 0 && (
                  <span className="ml-2 text-xs text-red-400">(Tutto esaurito)</span>
                )}
              </div>
            </div>
          </div>

          {tournament.format && (
            <div className="flex items-start gap-2 text-muted-2">
              <svg className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <div>
                <div className="text-xs text-muted-2">Formato</div>
                <div className="text-white capitalize">{tournament.format.replace('_', ' ')}</div>
              </div>
            </div>
          )}
        </div>

        {/* Actions Section */}
        <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t border-[#2f7de1]/20">
          {isManager ? (
            <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
              <button 
                onClick={() => router.push(profile?.role === 'admin' ? '/dashboard/admin/tornei' : '/dashboard/gestore/tornei')} 
                className="w-full sm:w-auto rounded-full bg-gradient-to-r from-[#7de3ff] to-[#4fb3ff] px-6 py-2.5 text-sm font-semibold text-[#06101f] hover:shadow-accent transition-all"
              >
                Gestisci Competizione
              </button>
            </div>
          ) : (
            <div>
              <div>
                {joined ? (
                  <button 
                    className="w-full sm:w-auto rounded-full border-2 border-[#7de3ff]/40 px-6 py-2.5 text-sm font-semibold text-[#7de3ff] cursor-not-allowed" 
                    disabled
                  >
                    ✓ Sei già iscritto
                  </button>
                ) : spotsLeft <= 0 ? (
                  <button 
                    className="w-full sm:w-auto rounded-full border-2 border-red-400/40 px-6 py-2.5 text-sm font-semibold text-red-400 cursor-not-allowed" 
                    disabled
                  >
                    Sold Out
                  </button>
                ) : (
                  <button 
                    onClick={handleJoin} 
                    disabled={actionLoading} 
                    className="w-full sm:w-auto rounded-full bg-gradient-to-r from-[#7de3ff] to-[#4fb3ff] px-6 py-2.5 text-sm font-semibold text-[#06101f] hover:shadow-accent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading ? 'Iscrivendo...' : 'Iscriviti Ora'}
                  </button>
                )}
                {profile?.role === 'maestro' && (
                  <p className="mt-3 text-sm text-muted-2">
                    Puoi iscrivere i tuoi atleti dalla{' '}
                    <button 
                      onClick={() => router.push('/dashboard/maestro')} 
                      className="underline text-[#7de3ff] hover:text-[#4fb3ff] transition-colors"
                    >
                      Dashboard Maestro
                    </button>
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">
            {error}
          </div>
        )}
      </div>

      {/* Competition View Section */}
      <div className="mt-8">
        <CompetitionView 
          tournament={tournament}
          participants={participantsList}
          isAdmin={isManager}
        />
      </div>
    </main>
  );
}
