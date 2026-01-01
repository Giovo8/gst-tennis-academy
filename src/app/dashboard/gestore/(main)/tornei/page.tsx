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
      active: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      upcoming: "bg-blue-500/20 text-blue-300 border-blue-500/30",
      completed: "bg-gray-500/20 text-gray-300 border-gray-500/30",
      cancelled: "bg-red-500/20 text-red-300 border-red-500/30",
    };
    return styles[status] || styles.upcoming;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Gestione Tornei</h1>
          <p className="text-muted-2">Visualizza e gestisci i tornei dell&apos;academy</p>
        </div>
        <Link
          href="/dashboard/gestore/tornei"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 hover:shadow-xl transition-all"
        >
          <Plus className="h-4 w-4" />
          Gestione Avanzata
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <p className="text-sm text-emerald-300">Tornei Attivi</p>
          <p className="text-2xl font-bold text-white">
            {tournaments.filter(t => t.status === "active").length}
          </p>
        </div>
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
          <p className="text-sm text-blue-300">In Arrivo</p>
          <p className="text-2xl font-bold text-white">
            {tournaments.filter(t => t.status === "upcoming").length}
          </p>
        </div>
        <div className="rounded-xl border border-gray-500/30 bg-gray-500/10 p-4">
          <p className="text-sm text-gray-300">Completati</p>
          <p className="text-2xl font-bold text-white">
            {tournaments.filter(t => t.status === "completed").length}
          </p>
        </div>
      </div>

      {/* Tournaments List */}
      <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          </div>
        ) : tournaments.length === 0 ? (
          <div className="text-center py-12 text-muted-2">
            <Trophy className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nessun torneo trovato</p>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {tournaments.map((tournament) => (
              <Link
                key={tournament.id}
                href={`/dashboard/gestore/tornei?t=${tournament.id}`}
                className="block p-4 hover:bg-white/5 transition group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-4">
                    <div className="rounded-lg bg-amber-500/20 p-3">
                      <Trophy className="h-5 w-5 text-amber-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-white">{tournament.title}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs border ${getStatusBadge(tournament.status)}`}>
                          {tournament.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-2">
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
                  <ArrowRight className="h-5 w-5 text-muted-2 opacity-0 group-hover:opacity-100 transition" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
