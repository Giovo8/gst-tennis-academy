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
  competition_type?: 'torneo' | 'campionato';
  format?: 'eliminazione_diretta' | 'round_robin' | 'girone_eliminazione';
  status?: string;
};


function GestoreTorneiPageInner() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ 
    title: '', 
    description: '', 
    starts_at: '', 
    max_participants: '16',
    competition_type: 'torneo' as 'torneo' | 'campionato',
    format: 'eliminazione_diretta' as 'eliminazione_diretta' | 'round_robin' | 'girone_eliminazione',
    status: 'Aperto'
  });
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [sessionInfo, setSessionInfo] = useState<{userId?: string, role?: string, token?: string}>({});
  const searchParams = useSearchParams();
  const selectedTournament = searchParams?.get("t");
  const [filterType, setFilterType] = useState<'all' | 'torneo' | 'campionato'>('all');

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
      const payload = { 
        ...form, 
        max_participants: Number(form.max_participants), 
        starts_at: form.starts_at,
        competition_type: form.competition_type,
        format: form.format,
        status: form.status
      };
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
        setForm({ 
          title: '', 
          description: '', 
          starts_at: '', 
          max_participants: '16',
          competition_type: 'torneo',
          format: 'eliminazione_diretta',
          status: 'Aperto'
        });
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
          <h2 className="text-lg font-semibold text-white mb-4">Crea Competizione</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-2 mb-2">Tipo Competizione</label>
              <select 
                value={form.competition_type} 
                onChange={(e) => setForm(f => ({ 
                  ...f, 
                  competition_type: e.target.value as 'torneo' | 'campionato',
                  // Auto-adjust format based on type
                  format: e.target.value === 'campionato' ? 'round_robin' : 'eliminazione_diretta'
                }))} 
                className="w-full rounded-md p-2 bg-[#081e2b] text-white border border-[#2f7de1]/30"
              >
                <option value="torneo">Torneo</option>
                <option value="campionato">Campionato</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-2 mb-2">Formato</label>
              <select 
                value={form.format} 
                onChange={(e) => setForm(f => ({ ...f, format: e.target.value as any }))} 
                className="w-full rounded-md p-2 bg-[#081e2b] text-white border border-[#2f7de1]/30"
              >
                <option value="eliminazione_diretta">Eliminazione Diretta</option>
                <option value="round_robin">Round-robin (Tutti contro tutti)</option>
                <option value="girone_eliminazione">Fase a Gironi + Eliminazione</option>
              </select>
              <p className="mt-1 text-xs text-muted-2">
                {form.format === 'eliminazione_diretta' && 'I partecipanti devono essere una potenza di 2 (2, 4, 8, 16, 32, ecc.)'}
                {form.format === 'round_robin' && 'Tutti i partecipanti giocano contro tutti. Ideale per campionati.'}
                {form.format === 'girone_eliminazione' && 'Prima fase a gironi, poi eliminazione diretta con i migliori.'}
              </p>
            </div>
            
            <input 
              value={form.title} 
              onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} 
              placeholder="Titolo (es: Torneo Primavera 2026)" 
              className="w-full rounded-md p-2 bg-[#081e2b] text-white border border-[#2f7de1]/30" 
              required
            />
            
            <textarea 
              value={form.description} 
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} 
              placeholder="Descrizione (opzionale)" 
              className="w-full rounded-md p-2 bg-[#081e2b] text-white border border-[#2f7de1]/30"
              rows={3}
            />
            
            <div>
              <label className="block text-sm font-medium text-muted-2 mb-2">Data e Ora Inizio</label>
              <input 
                value={form.starts_at} 
                onChange={(e) => setForm(f => ({ ...f, starts_at: e.target.value }))} 
                type="datetime-local" 
                className="w-full rounded-md p-2 bg-[#081e2b] text-white border border-[#2f7de1]/30"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-muted-2 mb-2">Numero Massimo Partecipanti</label>
              <input 
                value={form.max_participants} 
                onChange={(e) => setForm(f => ({ ...f, max_participants: e.target.value }))} 
                type="number" 
                min="2"
                className="w-full rounded-md p-2 bg-[#081e2b] text-white border border-[#2f7de1]/30"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-2 mb-2">Stato</label>
              <select 
                value={form.status} 
                onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))} 
                className="w-full rounded-md p-2 bg-[#081e2b] text-white border border-[#2f7de1]/30"
              >
                <option value="Aperto">Aperto (iscrizioni attive)</option>
                <option value="Chiuso">Chiuso (iscrizioni chiuse)</option>
                <option value="In corso">In corso</option>
                <option value="Completato">Completato</option>
              </select>
            </div>
            
            <div>
              <button type="submit" className="w-full rounded-full bg-gradient-to-r from-[#7de3ff] to-[#4fb3ff] px-6 py-3 text-sm font-semibold text-[#06101f] hover:shadow-accent transition-all">
                Crea Competizione
              </button>
            </div>
            {error && <div className="text-sm text-red-400 p-3 rounded-lg bg-red-500/10 border border-red-500/30">{error}</div>}
          </form>
        </div>

        <div className="rounded-xl border border-[#2f7de1]/30 p-4 md:p-6 bg-[#1a3d5c]/60">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="text-base md:text-lg font-semibold text-white">Competizioni</h2>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                  filterType === 'all'
                    ? 'bg-[#7de3ff]/20 text-[#7de3ff] border border-[#7de3ff]/50'
                    : 'bg-[#0c1424]/40 text-muted-2 border border-[#2f7de1]/20'
                }`}
              >
                Tutte
              </button>
              <button
                onClick={() => setFilterType('torneo')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                  filterType === 'torneo'
                    ? 'bg-[#7de3ff]/20 text-[#7de3ff] border border-[#7de3ff]/50'
                    : 'bg-[#0c1424]/40 text-muted-2 border border-[#2f7de1]/20'
                }`}
              >
                Tornei
              </button>
              <button
                onClick={() => setFilterType('campionato')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                  filterType === 'campionato'
                    ? 'bg-[#7de3ff]/20 text-[#7de3ff] border border-[#7de3ff]/50'
                    : 'bg-[#0c1424]/40 text-muted-2 border border-[#2f7de1]/20'
                }`}
              >
                Campionati
              </button>
            </div>
          </div>
          {loading ? <div className="text-sm text-[#c6d8c9]">Caricamento...</div> : (
            <ul className="space-y-3">
              {tournaments
                .filter(t => filterType === 'all' || t.competition_type === filterType || (!t.competition_type && filterType === 'torneo'))
                .map(t => (
                <li key={t.id} className="rounded-lg md:rounded-xl border border-[#2f7de1]/30 p-3 md:p-4 bg-[#0f2131]">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 text-xs font-semibold uppercase rounded-full ${
                          (t.competition_type === 'campionato')
                            ? 'bg-[#4fb3ff]/15 text-[#4fb3ff]'
                            : 'bg-[#7de3ff]/15 text-[#7de3ff]'
                        }`}>
                          {t.competition_type === 'campionato' ? 'Campionato' : 'Torneo'}
                        </span>
                        {t.status && (
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            t.status === 'Aperto' 
                              ? 'bg-green-500/10 text-green-400'
                              : t.status === 'In corso'
                              ? 'bg-blue-500/10 text-blue-400'
                              : 'bg-gray-500/10 text-gray-400'
                          }`}>
                            {t.status}
                          </span>
                        )}
                      </div>
                      <div className="font-medium text-white">{t.title}</div>
                      <div className="text-sm text-[#c6d8c9]">
                        {t.starts_at ? new Date(t.starts_at).toLocaleString('it-IT') : 'Data da definire'}
                      </div>
                      {t.format && (
                        <div className="text-xs text-muted-2 mt-1 capitalize">
                          {t.format.replace('_', ' ')}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <a href={`/tornei/${t.id}`} className="text-center rounded-full border border-accent px-3 py-1 text-sm text-accent hover:bg-accent/10 transition">Apri</a>
                    <a href={`/dashboard/gestore/tornei?t=${t.id}`} className="text-center rounded-full bg-accent px-3 py-1 text-sm font-semibold text-[#06101f] hover:shadow-accent transition">Iscritti</a>
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
