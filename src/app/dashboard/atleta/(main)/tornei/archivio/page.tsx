"use client";

import { useEffect, useState, Suspense } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Trophy,
  Loader2,
  Search,
  Target,
  Users as UsersIcon,
} from "lucide-react";

interface Tournament {
  id: string;
  title: string;
  description: string;
  starts_at: string;
  ends_at: string | null;
  category: string;
  level: string;
  max_participants: number;
  current_participants?: number;
  status: string;
  format: string;
  competition_type?: string;
  tournament_type?: string;
  entry_fee: number | null;
  prize_money: number | null;
  participant_count?: number;
  is_registered?: boolean;
}

function ArchivioPageInner() {
  const router = useRouter();
  const [archivedTournaments, setArchivedTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadArchivedTournaments();
  }, []);

  async function loadArchivedTournaments() {
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
          participant_count: t.current_participants || 0,
          is_registered: registeredIds.has(t.id),
          starts_at: t.start_date || t.starts_at,
        }));

        const archived = processed.filter((t: any) =>
          (t.status === 'Concluso' ||
          t.status === 'Completato' ||
          t.status === 'Chiuso') &&
          t.is_registered
        );

        setArchivedTournaments(archived);
      }
    } catch (err: any) {
      setError(err?.message || 'Errore caricamento archivio');
    } finally {
      setLoading(false);
    }
  }

  const filteredTournaments = archivedTournaments.filter((t) => {
    const matchesSearch =
      !search ||
      t.title?.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase()) ||
      t.category?.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const getTournamentIcon = (tournament: Tournament) => {
    const tournamentType = tournament.tournament_type || tournament.competition_type;
    if (tournamentType === 'eliminazione_diretta') {
      return <Trophy className="h-5 w-5 text-secondary/60" />;
    }
    if (tournamentType === 'girone_eliminazione') {
      return <Target className="h-5 w-5 text-secondary/60" />;
    }
    if (tournamentType === 'campionato') {
      return <UsersIcon className="h-5 w-5 text-secondary/60" />;
    }
    return <Trophy className="h-5 w-5 text-secondary/60" />;
  };

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
            <span>Archivio</span>
          </p>
          <h1 className="text-3xl font-bold text-secondary">Archivio Competizioni</h1>
          <p className="text-secondary/70 text-sm mt-1 max-w-2xl">
            Visualizza i tornei e campionati a cui hai partecipato
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative w-full sm:max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
        <input
          type="text"
          placeholder="Cerca nell'archivio..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white border border-gray-200 text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-secondary" />
          <p className="mt-4 text-secondary/70">Caricamento archivio...</p>
        </div>
      ) : filteredTournaments.length === 0 ? (
        <div className="text-center py-20 rounded-xl bg-white">
          <Trophy className="w-16 h-16 mx-auto text-secondary/20 mb-4" />
          <h3 className="text-xl font-semibold text-secondary mb-2">
            {archivedTournaments.length === 0 ? "Nessun torneo completato" : "Nessun torneo trovato"}
          </h3>
          <p className="text-secondary/70">
            {archivedTournaments.length === 0
              ? "I tornei completati appariranno qui"
              : "Prova a modificare la ricerca"
            }
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <style>{`
            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          <div className="space-y-3 min-w-[640px]">
            {/* Header Row */}
            <div className="bg-secondary border border-secondary rounded-lg px-5 py-3 mb-3">
              <div className="flex items-center gap-4">
                <div className="w-10 flex-shrink-0 flex items-center justify-center">
                  <div className="text-xs font-bold text-white/80 uppercase">#</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white/80 uppercase">Nome Torneo</div>
                </div>
                <div className="w-32 flex-shrink-0 text-center">
                  <div className="text-xs font-bold text-white/80 uppercase">Data</div>
                </div>
                <div className="w-24 flex-shrink-0 text-center">
                  <div className="text-xs font-bold text-white/80 uppercase">Partecipanti</div>
                </div>
                <div className="w-24 flex-shrink-0 text-center">
                  <div className="text-xs font-bold text-white/80 uppercase">Stato</div>
                </div>
              </div>
            </div>

            {/* Data Rows */}
            {filteredTournaments.map((tournament) => {
              const participantCount = tournament.current_participants || tournament.participant_count || 0;
              const maxParticipants = tournament.max_participants || 0;

              return (
                <div
                  key={tournament.id}
                  onClick={() => router.push(`/dashboard/atleta/tornei/${tournament.id}`)}
                  className="bg-white border border-gray-200 hover:border-gray-300 rounded-lg px-5 py-4 transition-all cursor-pointer border-l-4"
                  style={{ borderLeftColor: 'var(--foreground-muted)' }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 flex-shrink-0 flex items-center justify-center">
                      {getTournamentIcon(tournament)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-secondary truncate">
                        {tournament.title}
                      </div>
                    </div>

                    <div className="w-32 flex-shrink-0 text-center">
                      {tournament.starts_at ? (
                        <div className="text-sm font-semibold text-secondary">
                          {new Date(tournament.starts_at).toLocaleDateString('it-IT', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </div>
                      ) : (
                        <div className="text-sm text-secondary/40">-</div>
                      )}
                    </div>

                    <div className="w-24 flex-shrink-0 text-center">
                      <div className="text-sm font-semibold text-secondary">
                        {participantCount}/{maxParticipants}
                      </div>
                    </div>

                    <div className="w-24 flex-shrink-0 text-center">
                      <span className="px-3 py-1 text-xs font-semibold rounded-md bg-gray-100 text-gray-600">
                        {tournament.status}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Error notification */}
      {error && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md">
          <div className="bg-red-50 rounded-xl p-4 shadow-md">
            <div className="flex items-start gap-3">
              <div className="text-red-600">⚠️</div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-800 mb-1">Errore</p>
                <p className="text-xs text-red-700">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-600 hover:text-red-800"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ArchivioPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-secondary" />
      </div>
    }>
      <ArchivioPageInner />
    </Suspense>
  );
}
