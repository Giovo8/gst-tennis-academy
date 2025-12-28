"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

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
};

export default function TorneiPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch('/api/tournaments?upcoming=true');
        let json: any = {};
        try {
          json = await res.json();
        } catch (e) {
          json = {};
        }
        if (res.ok) {
          if (mounted) setTournaments(json.tournaments ?? []);
        } else {
          setError(json.error || 'Impossibile caricare i tornei');
        }
      } catch (err: any) {
        setError(err.message || 'Errore rete');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  return (
    <main className="mx-auto max-w-7xl px-6 py-16 min-h-screen">
      <div className="space-y-3 mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-[#9fb6a6]">Tornei</p>
        <h1 className="text-3xl font-semibold text-white">Tornei in arrivo</h1>
        <p className="text-sm text-[#c6d8c9]">Iscriviti ai tornei organizzati dall'Academy.</p>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="text-sm text-[#c6d8c9]">Caricamento...</div>
        ) : error ? (
          <div className="text-sm text-cyan-300">{error}</div>
        ) : tournaments.length === 0 ? (
          <div className="text-sm text-[#c6d8c9]">Nessun torneo programmato.</div>
        ) : (
          tournaments.map((t) => (
            <Link
              key={t.id}
              href={`/tornei/${t.id}`}
              aria-label={`Apri dettaglio torneo ${t.title}`}
              className="group block card rounded-xl hover:scale-[1.01] transition-transform p-4 min-h-[140px] flex flex-col justify-between"
            >
              <div>
                <h3 className="font-semibold text-white text-lg">{t.title}</h3>
                <p className="mt-2 text-sm text-muted overflow-hidden">{t.description}</p>
              </div>
              <div className="mt-2 text-sm flex items-center justify-between">
                <div className="text-sm text-muted-2">{t.start_date ? new Date(t.start_date).toLocaleDateString() : ''}</div>
                <div className="text-sm text-muted">{t.category ?? ''} {t.level ? `· ${t.level}` : ''}</div>
              </div>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
