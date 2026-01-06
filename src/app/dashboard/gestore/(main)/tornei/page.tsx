"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy, Users, Calendar, ArrowRight, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { format } from "date-fns";
import { it } from "date-fns/locale";

type Tournament = {
  id: string;
  title: string;
  start_date: string | null;
  status: string;
  max_participants: number | null;
  participants_count: number;
};

export default function GestoreTorneiPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTournaments();
  }, []);

  async function loadTournaments() {
    setLoading(true);
    
    const { data, error } = await supabase
      .from("tournaments")
      .select(`
        id,
        title,
        start_date,
        status,
        max_participants
      `)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!error && data) {
      // Get participant counts
      const tournamentsWithCounts = await Promise.all(
        data.map(async (t) => {
          const { count } = await supabase
            .from("tournament_participants")
            .select("*", { count: "exact", head: true })
            .eq("tournament_id", t.id);
          return { ...t, participants_count: count || 0 };
        })
      );
      setTournaments(tournamentsWithCounts);
    }
    
    setLoading(false);
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
      upcoming: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
      completed: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
      cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    };
    return styles[status] || styles.upcoming;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 skeleton rounded-lg w-48" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 skeleton rounded-xl" />
          ))}
        </div>
        <div className="h-64 skeleton rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Gestione competizioni</h1>
          <p className="text-[var(--foreground-muted)]">Visualizza e gestisci i tornei dell&apos;academy</p>
        </div>
        <Link
          href="/dashboard/admin/tornei"
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--primary-dark)] transition-all"
        >
          <Plus className="h-4 w-4" />
          Gestione Avanzata
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4">
          <p className="text-sm text-[var(--foreground-muted)]">Tornei Attivi</p>
          <p className="text-2xl font-bold text-[var(--foreground)]">
            {tournaments.filter(t => t.status === "active").length}
          </p>
        </div>
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4">
          <p className="text-sm text-[var(--foreground-muted)]">In Arrivo</p>
          <p className="text-2xl font-bold text-[var(--foreground)]">
            {tournaments.filter(t => t.status === "upcoming").length}
          </p>
        </div>
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4">
          <p className="text-sm text-[var(--foreground-muted)]">Completati</p>
          <p className="text-2xl font-bold text-[var(--foreground)]">
            {tournaments.filter(t => t.status === "completed").length}
          </p>
        </div>
      </div>

      {/* Tournaments List */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
        {tournaments.length === 0 ? (
          <div className="text-center py-12 text-[var(--foreground-muted)]">
            <Trophy className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nessun torneo trovato</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {tournaments.map((tournament) => (
              <Link
                key={tournament.id}
                href={`/dashboard/gestore/tornei/${tournament.id}`}
                className="block p-4 hover:bg-[var(--surface-hover)] transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-4">
                    <div className="rounded-lg bg-amber-500/10 p-3">
                      <Trophy className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-[var(--foreground)]">{tournament.title}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(tournament.status)}`}>
                          {tournament.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-[var(--foreground-muted)]">
                        {tournament.start_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {format(new Date(tournament.start_date), "d MMM yyyy", { locale: it })}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {tournament.participants_count}
                          {tournament.max_participants && ` / ${tournament.max_participants}`}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-[var(--foreground-muted)] opacity-0 group-hover:opacity-100 transition" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
