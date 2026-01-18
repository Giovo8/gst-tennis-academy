"use client";

import { useEffect, useState, Suspense } from "react";
import { supabase } from "@/lib/supabase/client";
import { createNotification } from "@/lib/notifications/createNotification";
import { useRouter } from "next/navigation";
import {
  Trophy,
  Calendar,
  Users as UsersIcon,
  Loader2,
  Search,
  Archive,
  BarChart3,
  Award,
  Target,
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

function AtletaTorneiPageInner() {
  const router = useRouter();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [myTournaments, setMyTournaments] = useState<Tournament[]>([]);
  const [archivedTournaments, setArchivedTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"available" | "my" | "archive" | "stats">("my");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalParticipations: 0,
    activeTournaments: 0,
    completedTournaments: 0,
    winRate: 0,
  });

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

        // Separate active and archived
        const active = processed.filter((t: any) =>
          t.status !== 'Concluso' &&
          t.status !== 'Completato' &&
          t.status !== 'Chiuso'
        );
        const archived = processed.filter((t: any) =>
          t.status === 'Concluso' ||
          t.status === 'Completato' ||
          t.status === 'Chiuso'
        );

        setTournaments(active.filter((t: any) => !t.is_registered));
        setMyTournaments(active.filter((t: any) => t.is_registered));
        setArchivedTournaments(archived.filter((t: any) => t.is_registered));

        // Calculate stats
        const totalParticipations = registeredIds.size;
        const activeTournaments = active.filter((t: any) => t.is_registered).length;
        const completedTournaments = archived.filter((t: any) => t.is_registered).length;

        setStats({
          totalParticipations,
          activeTournaments,
          completedTournaments,
          winRate: 0, // TODO: calculate from match results
        });
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
      case "my":
        return myTournaments;
      case "available":
        return tournaments;
      case "archive":
        return archivedTournaments;
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

  // Determine border color based on status
  const getBorderColor = (tournament: Tournament) => {
    if (tournament.status === "Aperto") {
      // Rosso se posti esauriti, verde altrimenti
      if ((tournament.current_participants || tournament.participant_count || 0) >= (tournament.max_participants || 0)) {
        return "#ef4444"; // red - posti esauriti
      } else {
        return "#10b981"; // emerald - aperto/fase iscrizione
      }
    } else if (tournament.status === "In Corso" || tournament.status === "In corso") {
      return "#034863"; // secondary - in corso
    } else if (tournament.status === "Completato" || tournament.status === "Concluso" || tournament.status === "Chiuso") {
      return "#6b7280"; // gray - completato/concluso/chiuso
    }
    return "#034863"; // secondary - default
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
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab("archive")}
            className={`p-2.5 bg-white border border-gray-200 rounded-md transition-all ${
              activeTab === "archive"
                ? "bg-secondary text-white border-secondary"
                : "text-secondary/70 hover:bg-secondary hover:text-white"
            }`}
            title="Archivio"
          >
            <Archive className="h-5 w-5" />
          </button>
          <button
            onClick={() => setActiveTab("stats")}
            className={`p-2.5 bg-white border border-gray-200 rounded-md transition-all ${
              activeTab === "stats"
                ? "bg-secondary text-white border-secondary"
                : "text-secondary/70 hover:bg-secondary hover:text-white"
            }`}
            title="Statistiche"
          >
            <BarChart3 className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
          <input
            type="text"
            placeholder="Cerca per nome, descrizione o categoria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white border border-gray-200 text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20"
          />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("my")}
            className={`px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
              activeTab === "my"
                ? "text-white bg-secondary"
                : "bg-white text-secondary/70 border border-gray-200 hover:bg-secondary hover:text-white hover:border-secondary"
            }`}
          >
            I Miei Tornei
          </button>
          <button
            onClick={() => setActiveTab("available")}
            className={`px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
              activeTab === "available"
                ? "text-white bg-secondary"
                : "bg-white text-secondary/70 border border-gray-200 hover:bg-secondary hover:text-white hover:border-secondary"
            }`}
          >
            Disponibili
          </button>
        </div>
      </div>

      {/* Statistiche */}
      {activeTab === "stats" && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                    <div key={tournament.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
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
      )}

      {/* Tournaments List */}
      {activeTab !== "stats" && (
        <>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-secondary" />
              <p className="mt-4 text-secondary/70">Caricamento tornei...</p>
            </div>
          ) : filteredTournaments.length === 0 ? (
            <div className="text-center py-20 rounded-xl bg-white">
              {activeTab === "archive" ? (
                <>
                  <Archive className="w-16 h-16 mx-auto text-secondary/20 mb-4" />
                  <h3 className="text-xl font-semibold text-secondary mb-2">
                    {archivedTournaments.length === 0 ? "Nessun torneo completato" : "Nessun torneo trovato"}
                  </h3>
                  <p className="text-secondary/70">
                    {archivedTournaments.length === 0
                      ? "I tornei completati appariranno qui"
                      : "Prova a modificare la ricerca"
                    }
                  </p>
                </>
              ) : (
                <>
                  <Trophy className="w-16 h-16 mx-auto text-secondary/20 mb-4" />
                  <h3 className="text-xl font-semibold text-secondary mb-2">
                    {activeTab === "my"
                      ? (myTournaments.length === 0 ? "Non sei iscritto a nessun torneo" : "Nessun torneo trovato")
                      : (tournaments.length === 0 ? "Nessun torneo disponibile" : "Nessun torneo trovato")
                    }
                  </h3>
                  <p className="text-secondary/70 mb-6">
                    {activeTab === "my"
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
                </>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
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
                  {activeTab === "available" && (
                    <div className="w-28 flex-shrink-0 text-center">
                      <div className="text-xs font-bold text-white/80 uppercase">Azione</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Data Rows */}
              {filteredTournaments.map((tournament) => {
                const borderColor = getBorderColor(tournament);
                const participantCount = tournament.current_participants || tournament.participant_count || 0;
                const maxParticipants = tournament.max_participants || 0;
                const isFull = participantCount >= maxParticipants;

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

                      {/* Partecipanti */}
                      <div className="w-24 flex-shrink-0 text-center">
                        <div className="text-sm font-semibold text-secondary">
                          {participantCount}/{maxParticipants}
                        </div>
                      </div>

                      {/* Azione (solo per disponibili) */}
                      {activeTab === "available" && (
                        <div className="w-28 flex-shrink-0 text-center">
                          <button
                            onClick={(e) => registerForTournament(tournament.id, e)}
                            disabled={registering === tournament.id || isFull}
                            className="px-4 py-2 text-sm text-white bg-secondary rounded-md font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {registering === tournament.id ? (
                              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                            ) : isFull ? (
                              "Completo"
                            ) : (
                              "Iscriviti"
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            </div>
          )}
        </>
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
