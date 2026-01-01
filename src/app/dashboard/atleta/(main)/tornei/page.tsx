"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  Trophy,
  Calendar,
  Users,
  MapPin,
  ChevronRight,
  Loader2,
  Check,
  Clock,
  Star,
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
  status: string;
  format: string;
  entry_fee: number | null;
  prize_money: number | null;
  participant_count?: number;
  is_registered?: boolean;
}

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [myTournaments, setMyTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"available" | "my">("available");

  useEffect(() => {
    loadTournaments();
  }, []);

  async function loadTournaments() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Load all open tournaments
    const { data: allTournaments } = await supabase
      .from("tournaments")
      .select(`
        *,
        tournament_participants(count)
      `)
      .in("status", ["Aperto", "In Corso"])
      .order("starts_at", { ascending: true });

    // Load user's registered tournaments
    const { data: registrations } = await supabase
      .from("tournament_participants")
      .select("tournament_id")
      .eq("user_id", user.id);

    const registeredIds = new Set(registrations?.map(r => r.tournament_id) || []);

    if (allTournaments) {
      const processed = allTournaments.map(t => ({
        ...t,
        participant_count: t.tournament_participants?.[0]?.count || 0,
        is_registered: registeredIds.has(t.id),
      }));

      setTournaments(processed.filter(t => !t.is_registered));
      setMyTournaments(processed.filter(t => t.is_registered));
    }

    setLoading(false);
  }

  async function registerForTournament(tournamentId: string) {
    setRegistering(tournamentId);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("tournament_participants")
      .insert({
        tournament_id: tournamentId,
        user_id: user.id,
      });

    if (!error) {
      // Move tournament from available to my tournaments
      const tournament = tournaments.find(t => t.id === tournamentId);
      if (tournament) {
        setTournaments(tournaments.filter(t => t.id !== tournamentId));
        setMyTournaments([...myTournaments, { ...tournament, is_registered: true }]);
      }
    }

    setRegistering(null);
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("it-IT", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function getStatusBadge(status: string) {
    const styles: Record<string, string> = {
      Aperto: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
      "In Corso": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
      Concluso: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
      Annullato: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    };
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${styles[status] || styles.Aperto}`}>
        {status}
      </span>
    );
  }

  function getLevelBadge(level: string) {
    const styles: Record<string, string> = {
      principiante: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
      intermedio: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
      avanzato: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
      agonistico: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    };
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${styles[level?.toLowerCase()] || "bg-gray-100 text-gray-700"}`}>
        {level || "Tutti i livelli"}
      </span>
    );
  }

  const TournamentCard = ({ tournament, showRegister = false }: { tournament: Tournament; showRegister?: boolean }) => (
    <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden hover:border-[var(--primary)]/30 transition-colors">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h3 className="font-semibold text-[var(--foreground)] text-lg">{tournament.title}</h3>
            <div className="flex items-center gap-2 mt-1">
              {getStatusBadge(tournament.status)}
              {getLevelBadge(tournament.level)}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0">
            <Trophy className="h-6 w-6 text-[var(--primary)]" />
          </div>
        </div>

        {tournament.description && (
          <p className="text-sm text-[var(--foreground-muted)] mb-4 line-clamp-2">
            {tournament.description}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-[var(--foreground-muted)]">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(tournament.starts_at)}</span>
          </div>
          <div className="flex items-center gap-2 text-[var(--foreground-muted)]">
            <Users className="h-4 w-4" />
            <span>{tournament.participant_count || 0}/{tournament.max_participants} iscritti</span>
          </div>
          {tournament.entry_fee && (
            <div className="flex items-center gap-2 text-[var(--foreground-muted)]">
              <span className="text-base">€</span>
              <span>{tournament.entry_fee} quota</span>
            </div>
          )}
          {tournament.prize_money && (
            <div className="flex items-center gap-2 text-[var(--foreground-muted)]">
              <Star className="h-4 w-4 text-yellow-500" />
              <span>€{tournament.prize_money} montepremi</span>
            </div>
          )}
        </div>
      </div>

      <div className="px-5 py-3 bg-[var(--surface-hover)] border-t border-[var(--border)] flex items-center justify-between">
        <span className="text-xs text-[var(--foreground-muted)]">
          Formato: {tournament.format?.replace(/_/g, " ") || "Eliminazione diretta"}
        </span>
        
        {showRegister ? (
          <button
            onClick={() => registerForTournament(tournament.id)}
            disabled={registering === tournament.id || (tournament.participant_count || 0) >= tournament.max_participants}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white text-sm font-medium rounded-lg hover:bg-[var(--primary-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {registering === tournament.id ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Iscrizione...
              </>
            ) : (tournament.participant_count || 0) >= tournament.max_participants ? (
              "Completo"
            ) : (
              <>
                <Check className="h-4 w-4" />
                Iscriviti
              </>
            )}
          </button>
        ) : (
          <Link
            href={`/tornei/${tournament.id}`}
            className="flex items-center gap-1 text-sm text-[var(--primary)] font-medium hover:underline"
          >
            Dettagli
            <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 skeleton rounded-lg w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-64 skeleton rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Tornei</h1>
        <p className="text-[var(--foreground-muted)] mt-1">
          Partecipa ai tornei del circolo
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-[var(--surface)] rounded-lg border border-[var(--border)] w-fit">
        <button
          onClick={() => setActiveTab("available")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "available"
              ? "bg-[var(--primary)] text-white"
              : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
          }`}
        >
          Disponibili ({tournaments.length})
        </button>
        <button
          onClick={() => setActiveTab("my")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "my"
              ? "bg-[var(--primary)] text-white"
              : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
          }`}
        >
          I Miei Tornei ({myTournaments.length})
        </button>
      </div>

      {/* Tournament Grid */}
      {activeTab === "available" && (
        tournaments.length === 0 ? (
          <div className="text-center py-16 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
            <Trophy className="h-16 w-16 text-[var(--foreground-subtle)] mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
              Nessun torneo disponibile
            </h3>
            <p className="text-[var(--foreground-muted)]">
              Nuovi tornei saranno annunciati presto
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {tournaments.map((tournament) => (
              <TournamentCard key={tournament.id} tournament={tournament} showRegister />
            ))}
          </div>
        )
      )}

      {activeTab === "my" && (
        myTournaments.length === 0 ? (
          <div className="text-center py-16 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
            <Trophy className="h-16 w-16 text-[var(--foreground-subtle)] mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
              Non sei iscritto a nessun torneo
            </h3>
            <p className="text-[var(--foreground-muted)] mb-4">
              Iscriviti a un torneo dalla sezione &quot;Disponibili&quot;
            </p>
            <button
              onClick={() => setActiveTab("available")}
              className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-dark)] transition-colors"
            >
              Vedi Tornei Disponibili
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {myTournaments.map((tournament) => (
              <TournamentCard key={tournament.id} tournament={tournament} />
            ))}
          </div>
        )
      )}
    </div>
  );
}
