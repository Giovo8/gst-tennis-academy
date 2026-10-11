"use client";

import { useEffect, useState, Suspense } from "react";
import { supabase } from "@/lib/supabase/client";
import { createNotification } from "@/lib/notifications/createNotification";
import { useRouter, usePathname } from "next/navigation";
import {
  Trophy,
  Target,
  Users as UsersIcon,
  Loader2,
  Search,
  SlidersHorizontal,
  X,
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
  const pathname = usePathname();
  const dashboardBase = pathname.split("/tornei")[0];
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [myTournaments, setMyTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "available" | "my">("all");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);

  useEffect(() => {
    loadTournaments();
  }, []);

  async function loadTournaments() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // Load all tournaments using API
      const res = await fetch('/api/tournaments?includeCounts=true');
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
          link: `${dashboardBase}/tornei`,
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
        // Solo tornei non iscritti, con iscrizioni aperte e posti liberi
        return tournaments.filter(
          (t) =>
            t.status === "Aperto" &&
            !(t.max_participants > 0 && (t.current_participants || 0) >= t.max_participants)
        );
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
    // Palette allineata a dashboard/admin/tornei
    if (tournament.status === "Aperto") {
      return (tournament.current_participants || 0) >= (tournament.max_participants || 0) &&
        (tournament.max_participants || 0) > 0
        ? "#023047"
        : "var(--secondary)";
    } else if (tournament.status === "In Corso" || tournament.status === "In corso") {
      return "#023b52";
    } else if (tournament.status === "Completato" || tournament.status === "Concluso" || tournament.status === "Chiuso") {
      return "#9ca3af";
    }
    return "var(--secondary)"; // default
  };

  return (
    <div className="space-y-6 pt-3">
      {/* Header */}
      <div>
        <p className="breadcrumb text-secondary/60">Competizioni</p>
        <h1 className="text-4xl font-bold text-secondary">Competizioni</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
            <input
              type="text"
              placeholder="Cerca per nome, descrizione o categoria..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 w-full pl-10 pr-4 rounded-lg bg-white border border-black/10 text-secondary placeholder-secondary/40 focus:outline-none focus:ring-0 focus:border-black/10"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsAdvancedFiltersOpen((prev) => !prev)}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-lg border transition-colors ${
              isAdvancedFiltersOpen || activeTab !== "all"
                ? "border-secondary bg-secondary text-white hover:opacity-90"
                : "border-black/10 bg-white text-secondary hover:bg-gray-50"
            }`}
            aria-label="Mostra o nascondi filtri"
            title="Filtri"
          >
            <SlidersHorizontal className="h-5 w-5" />
          </button>
        </div>

        {isAdvancedFiltersOpen && (
          <div className="w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex min-w-max items-center gap-2 sm:min-w-0 sm:w-full">
              <div className="flex items-center gap-2 sm:flex-1 sm:min-w-0">
                {[
                  { value: "all", label: "Tutti" },
                  { value: "my", label: "I Miei Tornei" },
                  { value: "available", label: "Disponibili" },
                ].map((option) => {
                  const isSelected = activeTab === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setActiveTab(option.value as "all" | "available" | "my")}
                      className={`h-11 shrink-0 rounded-lg border px-4 text-sm font-semibold transition-colors sm:flex-1 sm:min-w-0 ${
                        isSelected
                          ? "border-secondary bg-secondary text-white"
                          : "border-black/10 bg-white text-secondary hover:bg-gray-50"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setActiveTab("all");
                }}
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[#023047] bg-[#023047] text-white hover:opacity-90 transition-colors"
                aria-label="Reset filtri"
                title="Reset filtri"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
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
        <div className="space-y-2">
          {filteredTournaments.map((tournament) => {
            const bg = getBorderColor(tournament);
            const tType = tournament.tournament_type || tournament.competition_type;
            const TournamentIcon =
              tType === "girone_eliminazione" ? Target : tType === "campionato" ? UsersIcon : Trophy;
            const participantCount = tournament.current_participants || tournament.participant_count || 0;
            const maxParticipants = tournament.max_participants || 0;

            return (
              <div
                key={tournament.id}
                onClick={() => router.push(`${dashboardBase}/tornei/${tournament.id}`)}
                className="rounded-lg overflow-visible cursor-pointer hover:opacity-95 transition-opacity"
                style={{ background: bg }}
              >
                <div className="flex items-center gap-4 py-3 px-3">
                  <div className="flex items-center justify-center bg-white/10 rounded-lg w-11 h-11 flex-shrink-0">
                    <TournamentIcon className="h-5 w-5 text-white" strokeWidth={2} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm truncate">
                      {tournament.title}
                    </p>
                    <p className="text-xs text-white/70 mt-0.5 truncate">
                      {participantCount}/{maxParticipants} iscritti
                    </p>
                  </div>

                  <span className="text-[10px] font-semibold text-white/70 flex-shrink-0 uppercase tracking-wide hidden sm:block">
                    {tournament.is_registered
                      ? "Iscritto"
                      : !tournament.status || tournament.status === "Aperto"
                        ? "Iscrizioni aperte"
                        : tournament.status}
                  </span>
                </div>
              </div>
            );
          })}
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
