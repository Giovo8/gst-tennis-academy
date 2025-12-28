"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type Tournament = {
  id: string;
  title: string;
  description?: string;
  starts_at?: string;
  max_participants?: number;
};


function GestoreTorneiPageInner() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', description: '', starts_at: '', max_participants: '16' });
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [sessionInfo, setSessionInfo] = useState<{userId?: string, role?: string, token?: string}>({});
  const searchParams = useSearchParams();
  const selectedTournament = searchParams?.get("t");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/tournaments');
      let json: any = {};
      try { json = await res.json(); } catch (e) { json = {}; }
      if (res.ok) setTournaments(json.tournaments ?? []);
      else setError(json.error || 'Errore caricamento tornei');
    } catch (err: any) {
      setError(err?.message || 'Errore rete');
    } finally {
      setLoading(false);
    }
  }

  async function loadParticipants(tournamentId: string) {
    try {
      const res = await fetch(`/api/tournament_participants?tournament_id=${tournamentId}`);
      let json: any = {};
      try { json = await res.json(); } catch (e) { json = {}; }
      if (res.ok) setParticipants(json.participants ?? []);
      else setError(json.error || 'Errore caricamento partecipanti');
    } catch (err) {
      // ignore
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const payload = { ...form, max_participants: Number(form.max_participants), starts_at: form.starts_at };
      // Forza refresh sessione
      await supabase.auth.refreshSession();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token ?? null;
      let userRole = null;
      let userId = sessionData?.session?.user?.id;
      if (userId) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single();
        userRole = profile?.role;
      }
      setSessionInfo({ userId: userId ?? undefined, role: userRole ?? undefined, token: token ?? undefined });
      if (!token) {
        setError('Sessione non valida. Fai logout/login e riprova.');
        return;
      }
      const res = await fetch('/api/tournaments', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload)
      });
      let json: any = {};
      try { json = await res.json(); } catch (e) { json = {}; }
      if (!res.ok) {
        setError(json.error || 'Errore creazione');
      } else {
        setForm({ title: '', description: '', starts_at: '', max_participants: '16' });
        load();
      }
    } catch (err: any) {
      setError(err.message || 'Errore rete');
    }
  }

  async function handleEditTournament(tournamentId: string, updatedData: Partial<Tournament>) {
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token ?? null;
      const res = await fetch(`/api/tournaments?id=${tournamentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(updatedData),
      });
      let json: any = {};
      try { json = await res.json(); } catch (e) { json = {}; }
      if (!res.ok) {
        setError(json.error || 'Errore modifica');
      } else {
        load();
      }
    } catch (err: any) {
      setError(err.message || 'Errore rete');
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-12">
      <div style={{background: '#222', color: '#fff', padding: 8, borderRadius: 8, marginBottom: 16}}>
        <b>DEBUG SESSIONE</b><br/>
        User ID: {sessionInfo.userId || 'N/A'}<br/>
        Ruolo: {sessionInfo.role || 'N/A'}<br/>
        Token: {sessionInfo.token ? sessionInfo.token.slice(0, 16) + '...' : 'N/A'}
      </div>
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-2">Area Gestore</p>
        <h1 className="text-3xl font-semibold text-white">Gestione Tornei</h1>
        <p className="text-sm text-muted">Crea nuovi tornei e visualizza gli iscritti.</p>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-[#2f7de1]/30 p-6 bg-[#1a3d5c]/60">
          <h2 className="text-lg font-semibold text-white mb-4">Crea Torneo</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Titolo" className="w-full rounded-md p-2 bg-[#081e2b] text-white" />
            <textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descrizione" className="w-full rounded-md p-2 bg-[#081e2b] text-white" />
            <input value={form.starts_at} onChange={(e) => setForm(f => ({ ...f, starts_at: e.target.value }))} type="datetime-local" className="w-full rounded-md p-2 bg-[#081e2b] text-white" />
            <input value={form.max_participants} onChange={(e) => setForm(f => ({ ...f, max_participants: e.target.value }))} type="number" className="w-full rounded-md p-2 bg-[#081e2b] text-white" />
            <div>
              <button type="submit" className="rounded-full bg-accent px-4 py-2 text-sm font-semibold">Crea</button>
            </div>
            {error && <div className="text-sm text-red-400">{error}</div>}
          </form>
        </div>

        <div className="rounded-xl border border-[#2f7de1]/30 p-6 bg-[#1a3d5c]/60">
          <h2 className="text-lg font-semibold text-white mb-4">Tornei</h2>
          {loading ? <div className="text-sm text-[#c6d8c9]">Caricamento...</div> : (
            <ul className="space-y-3">
              {tournaments.map(t => (
                <li key={t.id} className="rounded-xl border border-[#2f7de1]/30 p-4 bg-[#0f2131]">
                  <div>
                    <div className="font-medium text-white">{t.title}</div>
                    <div className="text-sm text-[#c6d8c9]">{t.starts_at ? new Date(t.starts_at).toLocaleString() : ''}</div>
                  </div>
                  <div className="flex gap-2">
                    <a href={`/tornei/${t.id}`} className="rounded-full border border-accent px-3 py-1 text-sm text-accent">Apri</a>
                    <a href={`/dashboard/gestore/tornei?t=${t.id}`} className="rounded-full bg-accent px-3 py-1 text-sm font-semibold text-[#06101f]">Iscritti</a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Partecipanti panel */}
      <div className="rounded-xl border border-[#2f7de1]/30 p-6 bg-[#1a3d5c]/60 mt-6">
        <h2 className="text-lg font-semibold text-white mb-4">Statistiche Partecipanti</h2>
        {selectedTournament ? (
          <div>
            <div className="text-sm text-[#c6d8c9] mb-3">Torneo selezionato: {selectedTournament}</div>
            <button onClick={() => loadParticipants(selectedTournament)} className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent px-3 py-1 text-sm text-accent">Aggiorna statistiche</button>
            {participants.length === 0 ? (
              <div className="text-sm text-[#c6d8c9]">Nessun iscritto trovato.</div>
            ) : (
              <ul className="space-y-2">
                {participants.map(p => (
                  <li key={p.id} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-white">{p.profiles?.full_name ?? p.user_id}</div>
                      <div className="text-sm text-[#c6d8c9]">{p.profiles?.email ?? ''}</div>
                    </div>
                    <div>
                      <button onClick={async () => {
                        if (!p.user_id) {
                          alert('ID partecipante non valido.');
                          return;
                        }
                        if (!confirm('Rimuovere questo partecipante?')) return;
                        try {
                          const { data: sessionData } = await supabase.auth.getSession();
                          const token = sessionData?.session?.access_token ?? null;
                          const res = await fetch(`/api/tournament_participants?tournament_id=${selectedTournament}&user_id=${p.user_id}`, { method: 'DELETE', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
                          if (res.ok) {
                            setParticipants(prev => prev.filter(x => x.id !== p.id));
                          } else {
                            const j = await res.json();
                            alert(j.error || 'Errore');
                          }
                        } catch (err: any) { alert(err.message || 'Errore'); }
                      }} className="rounded-full border border-red-500 px-3 py-1 text-sm text-red-400">Rimuovi</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="text-sm text-[#c6d8c9]">Seleziona un torneo per vedere le statistiche.</div>
        )}
      </div>
    </main>
  );
}

export default function GestoreTorneiPage() {
  return (
    <Suspense>
      <GestoreTorneiPageInner />
    </Suspense>
  );
}
