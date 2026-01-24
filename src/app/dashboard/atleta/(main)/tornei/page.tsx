"use client";

import { useEffect, useState, Suspense } from "react";
import { supabase } from "@/lib/supabase/client";
import { createNotification } from "@/lib/notifications/createNotification";
import { useRouter } from "next/navigation";
import {
  Trophy,
  Users as UsersIcon,
  Loader2,
  Search,
  Archive,
  BarChart3,
  Target,
} from "lucide-react";
import Link from "next/link";

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

function AtletaTorneiPageInner() {
  const router = useRouter();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [myTournaments, setMyTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "available" | "my">("my");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTournaments();
  }, []);

  async function loadTournaments() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // Load all tournaments using API
      const res = await fetch('/api/tournaments');
      const json = await res.json();

      if (res.ok && json.tournaments) {
        const allTournaments = json.tournaments;

        // Load user's registered tournaments
        const { data: registrations } = await supabase
          .from("tournament_participants")
          .select("tournament_id")
          .eq("user_id", user.id);

        const registeredIds = new Set(registrations?.map(r => r.tournament_id) || []);

        // Process tournaments
        const processed = allTournaments.map((t: any) => ({
          ...t,
          participant_count: t.current_participants || 0,
          is_registered: registeredIds.has(t.id),
          starts_at: t.start_date || t.starts_at,
        }));

        // Separate active tournaments only
        const active = processed.filter((t: any) =>
          t.status !== 'Concluso' &&
          t.status !== 'Completato' &&
          t.status !== 'Chiuso'
        );

        setTournaments(active.filter((t: any) => !t.is_registered));
        setMyTournaments(active.filter((t: any) => t.is_registered));
      }
    } catch (err: any) {
      setError(err?.message || 'Errore caricamento tornei');
    } finally {
      setLoading(false);
    }
  }

  async function registerForTournament(tournamentId: string, e: React.MouseEvent) {
    e.stopPropagation();
    setRegistering(tournamentId);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const tournament = tournaments.find(t => t.id === tournamentId);

    const { error } = await supabase
      .from("tournament_participants")
      .insert({
        tournament_id: tournamentId,
        user_id: user.id,
      });

    if (!error) {
      // Send notification to user
      if (tournament) {
        await createNotification({
          userId: user.id,
          type: "tournament",
          title: "Iscrizione al torneo confermata",
          message: `Ti sei iscritto con successo al torneo: ${tournament.title}`,
          link: "/dashboard/atleta/tornei",
        });

        // Move tournament from available to my tournaments
        setTournaments(tournaments.filter(t => t.id !== tournamentId));
        setMyTournaments([...myTournaments, { ...tournament, is_registered: true }]);
      }
    }

    setRegistering(null);
  }

  // Get current list based on active tab
  const getCurrentTournaments = () => {
    switch (activeTab) {
      case "all":
        return [...myTournaments, ...tournaments];
      case "my":
        return myTournaments;
      case "available":
        return tournaments;
      default:
        return [];
    }
  };

  const filteredTournaments = getCurrentTournaments().filter((t) => {
    const matchesSearch =
      !search ||
      t.title?.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase()) ||
      t.category?.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  // Determine border color based on status - using CSS variables from design system
  const getBorderColor = (tournament: Tournament) => {
    if (tournament.status === "Aperto") {
      return "var(--primary)"; // #08b3f7 - frozen-500
    } else if (tournament.status === "In Corso" || tournament.status === "In corso") {
      return "var(--secondary)"; // #034863 - frozen-800
    } else if (tournament.status === "Completato" || tournament.status === "Concluso" || tournament.status === "Chiuso") {
      return "var(--foreground-muted)"; // #056c94 - frozen-700
    }
    return "var(--secondary)"; // default
  };

  // Get tournament icon based on type
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
          <h1 className="text-3xl font-bold text-secondary">Competizioni</h1>
          <p className="text-secondary/70 text-sm mt-1 max-w-2xl">
            Partecipa ai tornei e campionati della GST Tennis Academy
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link
            href="/dashboard/atleta/tornei/archivio"
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all bg-white text-secondary/70 border border-gray-200 hover:bg-secondary hover:text-white hover:border-secondary"
          >
            <Archive className="h-5 w-5" />
            <span>Archivio</span>
          </Link>
          <Link
            href="/dashboard/atleta/tornei/statistiche"
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all bg-white text-secondary/70 border border-gray-200 hover:bg-secondary hover:text-white hover:border-secondary"
          >
            <BarChart3 className="h-5 w-5" />
            <span>Statistiche</span>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        {/* Tab Toggle */}
        <div className="flex gap-1 bg-white border border-gray-200 rounded-md p-1 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab("all")}
            className={`flex-1 px-3 py-2.5 rounded text-xs font-semibold transition-all flex items-center justify-center ${
              activeTab === "all"
                ? "bg-secondary text-white"
                : "text-secondary/60 hover:text-secondary"
            }`}
          >
            Tutti
          </button>
          <button
            onClick={() => setActiveTab("my")}
            className={`flex-1 px-3 py-2.5 rounded text-xs font-semibold transition-all flex items-center justify-center ${
              activeTab === "my"
                ? "bg-secondary text-white"
                : "text-secondary/60 hover:text-secondary"
            }`}
          >
            I Miei Tornei
          </button>
          <button
            onClick={() => setActiveTab("available")}
            className={`flex-1 px-3 py-2.5 rounded text-xs font-semibold transition-all flex items-center justify-center ${
              activeTab === "available"
                ? "bg-secondary text-white"
                : "text-secondary/60 hover:text-secondary"
            }`}
          >
            Disponibili
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
          <input
            type="text"
            placeholder="Cerca per nome, descrizione o categoria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-md bg-white border border-gray-200 text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20"
          />
        </div>
      </div>

      {/* Tournaments List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-secondary" />
          <p className="mt-4 text-secondary/70">Caricamento tornei...</p>
        </div>
      ) : filteredTournaments.length === 0 ? (
        <div className="text-center py-20 rounded-xl bg-white">
          <Trophy className="w-16 h-16 mx-auto text-secondary/20 mb-4" />
          <h3 className="text-xl font-semibold text-secondary mb-2">
            {activeTab === "all"
              ? (myTournaments.length === 0 && tournaments.length === 0 ? "Nessun torneo attivo" : "Nessun torneo trovato")
              : activeTab === "my"
                ? (myTournaments.length === 0 ? "Non sei iscritto a nessun torneo" : "Nessun torneo trovato")
                : (tournaments.length === 0 ? "Nessun torneo disponibile" : "Nessun torneo trovato")
            }
          </h3>
          <p className="text-secondary/70 mb-6">
            {activeTab === "all"
              ? (myTournaments.length === 0 && tournaments.length === 0
                  ? "Nuovi tornei saranno annunciati presto"
                  : "Prova a modificare la ricerca")
              : activeTab === "my"
                ? (myTournaments.length === 0
                    ? "Iscriviti a un torneo dalla sezione \"Disponibili\""
                    : "Prova a modificare la ricerca")
                : (tournaments.length === 0
                    ? "Nuovi tornei saranno annunciati presto"
                    : "Prova a modificare la ricerca")
            }
          </p>
          {activeTab === "my" && myTournaments.length === 0 && (
            <button
              onClick={() => setActiveTab("available")}
              className="px-6 py-2.5 bg-secondary text-white rounded-lg font-semibold hover:opacity-90 transition-all"
            >
              Vedi Tornei Disponibili
            </button>
          )}
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
              </div>
            </div>

              {/* Data Rows */}
              {filteredTournaments.map((tournament) => {
                const borderColor = getBorderColor(tournament);
                const participantCount = tournament.current_participants || tournament.participant_count || 0;
                const maxParticipants = tournament.max_participants || 0;

                return (
                  <div
                    key={tournament.id}
                    onClick={() => router.push(`/dashboard/atleta/tornei/${tournament.id}`)}
                    className="bg-white border border-gray-200 hover:border-gray-300 rounded-lg px-5 py-4 transition-all cursor-pointer border-l-4"
                    style={{ borderLeftColor: borderColor }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 flex-shrink-0 flex items-center justify-center">
                        {getTournamentIcon(tournament)}
                      </div>

                      {/* Nome */}
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-secondary truncate">
                          {tournament.title}
                        </div>
                      </div>

                      {/* Data */}
                      <div className="w-32 flex-shrink-0 text-center">
                        {tournament.starts_at ? (
                          <div className="text-sm font-semibold text-secondary capitalize">
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

                      {/* Partecipanti */}
                      <div className="w-24 flex-shrink-0 text-center">
                        <div className="text-sm font-semibold text-secondary">
                          {participantCount}/{maxParticipants}
                        </div>
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

export default function AtletaTorneiPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-secondary" />
      </div>
    }>
      <AtletaTorneiPageInner />
    </Suspense>
  );
}
