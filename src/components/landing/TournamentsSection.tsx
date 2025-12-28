"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

type Tournament = {
  id: string;
  title: string;
  starts_at?: string;
  max_participants?: number;
};

export default function TournamentsSection() {
  const [items, setItems] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch("/api/tournaments?upcoming=true");
        const json = await res.json();
        if (res.ok) {
          if (mounted) setItems(json.tournaments ?? []);
        }
      } catch (err) {
        // ignore
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  return (
    <section id="tornei" className="">
      <div className="container section">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-2">Tornei</p>
          <h2 className="text-2xl font-semibold text-white">Partecipa ai nostri tornei</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3 mt">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted">Nessun torneo imminente.</div>
        ) : (
          items.slice(0, 3).map(t => (
            <article key={t.id} className="rounded-2xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-5 space-y-3">
              <div>
                <h3 className="text-lg font-semibold text-white">{t.title}</h3>
                <span className="inline-block mt-2 rounded-full bg-accent-15 px-3 py-1 text-xs font-semibold text-accent">
                  {t.starts_at ? new Date(t.starts_at).toLocaleString() : 'Data da definire'}
                </span>
              </div>
              <div className="flex justify-end">
                <Link href={`/tornei/${t.id}`} className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-[#06101f] hover:bg-accent-light transition-colors">Apri</Link>
              </div>
            </article>
          ))
        )}
        </div>
      </div>
    </section>
  );
}
