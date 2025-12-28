"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter, useParams } from "next/navigation";
import Bracket from "@/components/tournaments/Bracket";

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

  return (
    <main className="container section">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-[#9fb6a6]">Torneo</p>
        <h1 className="text-3xl font-semibold text-white">{tournament.title}</h1>
        <p className="text-sm text-[#c6d8c9]">{tournament.category} {tournament.level ? `· ${tournament.level}` : ''}</p>
      </div>

      <div className="card mt rounded-xl">
        <p className="text-sm text-muted">{tournament.description}</p>
        <div className="mt-sm flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-muted-2">Date: {tournament.starts_at ? new Date(tournament.starts_at).toLocaleString() : ''} {tournament.ends_at ? ` - ${new Date(tournament.ends_at).toLocaleString()}` : ''}</div>
          <div className="text-sm text-muted">Posti: {currentParticipants}/{tournament.max_participants}</div>
        </div>

        <div className="mt-6">
          {isManager ? (
            <div className="flex gap-3">
              <button onClick={() => router.push(profile?.role === 'admin' ? '/dashboard/admin/tornei' : '/dashboard/gestore/tornei')} className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-[#06101f]">Apri gestione torneo</button>
            </div>
          ) : (
            <div>
              <div>
                {joined ? (
                  <button className="rounded-full border border-[#7de3ff]/40 px-4 py-2 text-sm text-[#7de3ff]" disabled>Sei già iscritto</button>
                ) : spotsLeft <= 0 ? (
                  <button className="rounded-full border border-red-400 px-4 py-2 text-sm text-red-400" disabled>Sold Out</button>
                ) : (
                  <button onClick={handleJoin} disabled={actionLoading} className="rounded-full bg-[#7de3ff] px-4 py-2 text-sm font-semibold text-[#06101f]">{actionLoading ? 'Iscrivendo...' : 'Iscriviti'}</button>
                )}
                {profile?.role === 'maestro' && (
                  <div className="mt-3 text-sm text-muted">Gli atleti possono essere iscritti dai coach nella <button onClick={() => router.push('/dashboard/maestro')} className="underline text-accent">Dashboard Maestro</button>.</div>
                )}
                </div>
              </div>
          )}
        </div>

        {error && <div className="mt-4 text-sm text-red-400">{error}</div>}
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-white">Tabellone</h2>
          <div className="mt-3 overflow-auto">
            <div className="min-w-[320px] sm:min-w-[700px]">
              <Bracket participants={participantsList} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
