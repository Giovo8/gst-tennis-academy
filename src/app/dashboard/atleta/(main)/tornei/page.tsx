"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  Trophy,
  Calendar,
  Users,
  ChevronRight,
  Loader2,
  Check,
  Star,
  RefreshCw,
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
  const [activeTab, setActiveTab] = useState<"available" | "my">("my");

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
          participant_count: 0, // Will be calculated separately if needed
          is_registered: registeredIds.has(t.id),
          starts_at: t.start_date || t.starts_at, // Support both column names
        }));

        setTournaments(processed.filter((t: any) => !t.is_registered));
        setMyTournaments(processed.filter((t: any) => t.is_registered));
      }
    } catch (error) {
      console.error('Error loading tournaments:', error);
    } finally {
      setLoading(false);
    }
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
      Aperto: "bg-emerald-100 text-emerald-700 border-emerald-200",
      "In Corso": "bg-blue-100 text-blue-700 border-blue-200",
      Concluso: "bg-gray-100 text-gray-700 border-gray-200",
      Annullato: "bg-red-100 text-red-700 border-red-200",
    };
    return (
      <span className={`px-3 py-1 text-xs font-bold rounded-full border ${styles[status] || styles.Aperto}`}>
        {status}
      </span>
    );
  }

  function getLevelBadge(level: string) {
    const styles: Record<string, string> = {
      principiante: "bg-emerald-50 text-emerald-700 border-emerald-200",
      intermedio: "bg-amber-50 text-amber-700 border-amber-200",
      avanzato: "bg-orange-50 text-orange-700 border-orange-200",
      agonistico: "bg-red-50 text-red-700 border-red-200",
    };
    return (
      <span className={`px-3 py-1 text-xs font-bold rounded-full border ${styles[level?.toLowerCase()] || "bg-gray-50 text-gray-700 border-gray-200"}`}>
        {level || "Tutti i livelli"}
      </span>
    );
  }

  const TournamentCard = ({ tournament, showRegister = false }: { tournament: Tournament; showRegister?: boolean }) => (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-blue-300 hover:shadow-md transition-all">
      <div className="p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <h3 className="font-bold text-black text-lg mb-2">{tournament.title}</h3>
            <div className="flex items-center gap-2 flex-wrap">
              {getStatusBadge(tournament.status)}
              {getLevelBadge(tournament.level)}
            </div>
          </div>
          <div className="w-14 h-14 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
            <Trophy className="h-7 w-7 text-amber-600" />
          </div>
        </div>

        {tournament.description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
            {tournament.description}
          </p>
        )}

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-gray-700">
            <Calendar className="h-4 w-4 text-blue-600" />
            <span className="font-medium">{formatDate(tournament.starts_at)}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <Users className="h-4 w-4 text-blue-600" />
            <span className="font-medium">{tournament.participant_count || 0}/{tournament.max_participants} iscritti</span>
          </div>
          {tournament.entry_fee && (
            <div className="flex items-center gap-2 text-gray-700">
              <span className="text-base font-bold text-emerald-600">€</span>
              <span className="font-medium">{tournament.entry_fee} quota iscrizione</span>
            </div>
          )}
          {tournament.prize_money && (
            <div className="flex items-center gap-2 text-gray-700">
              <Star className="h-4 w-4 text-amber-500" />
              <span className="font-medium">€{tournament.prize_money} montepremi</span>
            </div>
          )}
        </div>
      </div>

      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-600">
          {tournament.format?.replace(/_/g, " ") || "Eliminazione diretta"}
        </span>
        
        {showRegister ? (
          <button
            onClick={() => registerForTournament(tournament.id)}
            disabled={registering === tournament.id || (tournament.participant_count || 0) >= tournament.max_participants}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-medium rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
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
            href={`/dashboard/atleta/tornei/${tournament.id}`}
            className="flex items-center gap-1 text-sm text-blue-600 font-semibold hover:text-blue-700 transition-colors"
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
      <div className="space-y-6 animate-pulse">
        <div className="h-24 bg-gray-200 rounded-xl" />
        <div className="h-12 bg-gray-200 rounded-lg w-80" />
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-80 bg-gray-200 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-black">Tornei</h1>
          <p className="text-gray-700 mt-1 font-medium">
            Partecipa ai tornei del circolo e metti alla prova le tue abilità
          </p>
        </div>
        <button
          onClick={loadTournaments}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
        >
          <RefreshCw className="h-4 w-4" />
          Aggiorna
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <Trophy className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{tournaments.length}</p>
          </div>
          <p className="text-sm font-semibold text-gray-700">Tornei Disponibili</p>
          <p className="text-xs text-gray-600 mt-1">Aperti alle iscrizioni</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Check className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{myTournaments.length}</p>
          </div>
          <p className="text-sm font-semibold text-gray-700">I Miei Tornei</p>
          <p className="text-xs text-gray-600 mt-1">Iscrizioni attive</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-50 rounded-lg">
              <Users className="h-5 w-5 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {tournaments.reduce((acc, t) => acc + (t.participant_count || 0), 0) + myTournaments.reduce((acc, t) => acc + (t.participant_count || 0), 0)}
            </p>
          </div>
          <p className="text-sm font-semibold text-gray-700">Partecipanti Totali</p>
          <p className="text-xs text-gray-600 mt-1">In tutti i tornei</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-white rounded-lg border border-gray-200 w-fit shadow-sm">
        <button
          onClick={() => setActiveTab("my")}
          className={`px-5 py-2.5 rounded-md text-sm font-bold transition-all ${
            activeTab === "my"
              ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          I Miei Tornei ({myTournaments.length})
        </button>
        <button
          onClick={() => setActiveTab("available")}
          className={`px-5 py-2.5 rounded-md text-sm font-bold transition-all ${
            activeTab === "available"
              ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          Disponibili ({tournaments.length})
        </button>
      </div>

      {/* Tournament Grid */}
      {activeTab === "my" && (
        myTournaments.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-gray-200 shadow-sm">
            <Trophy className="h-20 w-20 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Non sei iscritto a nessun torneo
            </h3>
            <p className="text-gray-600 mb-6">
              Iscriviti a un torneo dalla sezione &quot;Disponibili&quot;
            </p>
            <button
              onClick={() => setActiveTab("available")}
              className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-medium hover:from-cyan-600 hover:to-blue-700 transition-all shadow-sm"
            >
              Vedi Tornei Disponibili
            </button>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {myTournaments.map((tournament) => (
              <TournamentCard key={tournament.id} tournament={tournament} />
            ))}
          </div>
        )
      )}

      {activeTab === "available" && (
        tournaments.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-gray-200 shadow-sm">
            <Trophy className="h-20 w-20 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Nessun torneo disponibile
            </h3>
            <p className="text-gray-600">
              Nuovi tornei saranno annunciati presto
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {tournaments.map((tournament) => (
              <TournamentCard key={tournament.id} tournament={tournament} showRegister />
            ))}
          </div>
        )
      )}
    </div>
  );
}
