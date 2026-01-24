"use client";

import { useEffect, useState, Suspense } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Trophy,
  Calendar,
  Loader2,
  BarChart3,
  Award,
  Target,
} from "lucide-react";

interface Tournament {
  id: string;
  title: string;
  starts_at: string;
  status: string;
  is_registered?: boolean;
}

function StatistichePageInner() {
  const router = useRouter();
  const [myTournaments, setMyTournaments] = useState<Tournament[]>([]);
  const [archivedTournaments, setArchivedTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalParticipations: 0,
    activeTournaments: 0,
    completedTournaments: 0,
    winRate: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const res = await fetch('/api/tournaments');
      const json = await res.json();

      if (res.ok && json.tournaments) {
        const allTournaments = json.tournaments;

        const { data: registrations } = await supabase
          .from("tournament_participants")
          .select("tournament_id")
          .eq("user_id", user.id);

        const registeredIds = new Set(registrations?.map(r => r.tournament_id) || []);

        const processed = allTournaments.map((t: any) => ({
          ...t,
          is_registered: registeredIds.has(t.id),
          starts_at: t.start_date || t.starts_at,
        }));

        const active = processed.filter((t: any) =>
          t.status !== 'Concluso' &&
          t.status !== 'Completato' &&
          t.status !== 'Chiuso' &&
          t.is_registered
        );

        const archived = processed.filter((t: any) =>
          (t.status === 'Concluso' ||
          t.status === 'Completato' ||
          t.status === 'Chiuso') &&
          t.is_registered
        );

        setMyTournaments(active);
        setArchivedTournaments(archived);

        setStats({
          totalParticipations: registeredIds.size,
          activeTournaments: active.length,
          completedTournaments: archived.length,
          winRate: 0,
        });
      }
    } catch (err) {
      console.error('Errore caricamento statistiche:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-secondary" />
        <p className="mt-4 text-secondary/70">Caricamento statistiche...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <p className="breadcrumb text-secondary/60 mb-1">
            <Link
              href="/dashboard/atleta/tornei"
              className="hover:text-secondary/80 transition-colors"
            >
              Competizioni
            </Link>
            {" › "}
            <span>Statistiche</span>
          </p>
          <h1 className="text-3xl font-bold text-secondary">Statistiche Competizioni</h1>
          <p className="text-secondary/70 text-sm mt-1 max-w-2xl">
            Visualizza le tue statistiche e l'attività recente
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Trophy className="h-8 w-8 text-secondary/40" />
            <span className="text-3xl font-bold text-secondary">{stats.totalParticipations}</span>
          </div>
          <p className="text-sm font-semibold text-secondary/70">Tornei totali</p>
        </div>

        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Target className="h-8 w-8 text-emerald-500/60" />
            <span className="text-3xl font-bold text-secondary">{stats.activeTournaments}</span>
          </div>
          <p className="text-sm font-semibold text-secondary/70">In corso</p>
        </div>

        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Award className="h-8 w-8 text-amber-500/60" />
            <span className="text-3xl font-bold text-secondary">{stats.completedTournaments}</span>
          </div>
          <p className="text-sm font-semibold text-secondary/70">Completati</p>
        </div>

        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <BarChart3 className="h-8 w-8 text-secondary/40" />
            <span className="text-3xl font-bold text-secondary">{stats.winRate}%</span>
          </div>
          <p className="text-sm font-semibold text-secondary/70">Vittorie</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-secondary mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Attività recente
        </h3>
        <div className="space-y-3">
          {myTournaments.length === 0 && archivedTournaments.length === 0 ? (
            <p className="text-center py-8 text-secondary/60">Nessuna attività recente</p>
          ) : (
            [...myTournaments, ...archivedTournaments]
              .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime())
              .slice(0, 5)
              .map((tournament) => (
                <div
                  key={tournament.id}
                  onClick={() => router.push(`/dashboard/atleta/tornei/${tournament.id}`)}
                  className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Trophy className="h-5 w-5 text-secondary/40" />
                    <div>
                      <p className="font-semibold text-secondary">{tournament.title}</p>
                      <p className="text-xs text-secondary/60">
                        {new Date(tournament.starts_at).toLocaleDateString('it-IT', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 text-xs font-semibold rounded-md bg-secondary text-white">
                    {tournament.status}
                  </span>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function StatistichePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-secondary" />
      </div>
    }>
      <StatistichePageInner />
    </Suspense>
  );
}
