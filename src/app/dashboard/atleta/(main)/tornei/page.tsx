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
  Search,
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
  const [searchQuery, setSearchQuery] = useState("");

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
      Aperto: "bg-emerald-50 text-emerald-700",
      "In Corso": "bg-frozen-50 text-frozen-700",
      Concluso: "bg-gray-100 text-gray-700",
      Annullato: "bg-red-50 text-red-700",
    };
    return (
      <span className={`px-3 py-1 text-xs font-medium rounded-md ${styles[status] || styles.Aperto}`}>
        {status}
      </span>
    );
  }

  function getLevelBadge(level: string) {
    const styles: Record<string, string> = {
      principiante: "bg-emerald-50 text-emerald-700",
      intermedio: "bg-amber-50 text-amber-700",
      avanzato: "bg-orange-50 text-orange-700",
      agonistico: "bg-red-50 text-red-700",
    };
    return (
      <span className={`px-3 py-1 text-xs font-medium rounded-md ${styles[level?.toLowerCase()] || "bg-gray-50 text-gray-700"}`}>
        {level || "Tutti i livelli"}
      </span>
    );
  }

  const TournamentCard = ({ tournament, showRegister = false }: { tournament: Tournament; showRegister?: boolean }) => (
    <div className="bg-white rounded-xl border border-gray-200 hover:border-frozen-300 transition-all overflow-hidden">
      {/* Header with Icon */}
      <div className="p-5 pb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 text-xl mb-2">{tournament.title}</h3>
            <div className="flex items-center gap-2 flex-wrap">
              {getStatusBadge(tournament.status)}
              {getLevelBadge(tournament.level)}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-frozen-50">
            <Trophy className="h-6 w-6 text-frozen-600" />
          </div>
        </div>

        {/* Description */}
        {tournament.description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
            {tournament.description}
          </p>
        )}

        {/* Info Grid */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-gray-700">
            <Calendar className="h-4 w-4 text-frozen-600" />
            <span className="text-sm font-medium">{formatDate(tournament.starts_at)}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <Users className="h-4 w-4 text-frozen-600" />
            <span className="text-sm font-medium">{tournament.participant_count || 0}/{tournament.max_participants} iscritti</span>
          </div>
          {tournament.entry_fee && (
            <div className="flex items-center gap-2 text-gray-700">
              <span className="text-sm font-bold text-emerald-600">€</span>
              <span className="text-sm font-medium">{tournament.entry_fee} quota iscrizione</span>
            </div>
          )}
          {tournament.prize_money && (
            <div className="flex items-center gap-2 text-gray-700">
              <Star className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium">€{tournament.prize_money} montepremi</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {tournament.format?.replace(/_/g, " ") || "eliminazione diretta"}
        </span>
        
        {showRegister ? (
          <button
            onClick={() => registerForTournament(tournament.id)}
            disabled={registering === tournament.id || (tournament.participant_count || 0) >= tournament.max_participants}
            className="text-sm text-frozen-500 font-semibold hover:text-frozen-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
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
                Dettagli
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </button>
        ) : (
          <Link
            href={`/dashboard/atleta/tornei/${tournament.id}`}
            className="text-sm text-frozen-500 font-semibold hover:text-frozen-600 transition-colors flex items-center gap-1"
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tornei</h1>
          <p className="text-sm text-gray-600">
            Partecipa ai tornei del circolo e metti alla prova le tue abilità
          </p>
        </div>
        <button
          onClick={loadTournaments}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all"
        >
          <RefreshCw className="h-4 w-4" />
          Aggiorna
        </button>
      </div>

      {/* Search & Tabs */}
      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Cerca per campo o maestro..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-frozen-500 focus:border-frozen-500 text-gray-900 placeholder:text-gray-500 transition-all"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setActiveTab("my")}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === "my"
                  ? "bg-frozen-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              I Miei Tornei
            </button>
            <button
              onClick={() => setActiveTab("available")}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === "available"
                  ? "bg-frozen-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Disponibili
            </button>
          </div>
        </div>
      </div>

      {/* Tournament Grid */}
      {activeTab === "my" && (
        myTournaments.filter(t => 
          !searchQuery || 
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.description?.toLowerCase().includes(searchQuery.toLowerCase())
        ).length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
            <div className="inline-flex p-4 bg-gray-50 rounded-full mb-4">
              <Trophy className="h-16 w-16 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {myTournaments.length === 0 ? "Non sei iscritto a nessun torneo" : "Nessun torneo trovato"}
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              {myTournaments.length === 0 
                ? "Iscriviti a un torneo dalla sezione \"Disponibili\""
                : "Prova a modificare la ricerca"
              }
            </p>
            {myTournaments.length === 0 && (
              <button
                onClick={() => setActiveTab("available")}
                className="px-6 py-2.5 bg-frozen-500 text-white rounded-xl font-semibold hover:bg-frozen-600 transition-all"
              >
                Vedi Tornei Disponibili
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {myTournaments
              .filter(t => 
                !searchQuery || 
                t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.description?.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((tournament) => (
                <TournamentCard key={tournament.id} tournament={tournament} />
              ))}
          </div>
        )
      )}

      {activeTab === "available" && (
        tournaments.filter(t => 
          !searchQuery || 
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.description?.toLowerCase().includes(searchQuery.toLowerCase())
        ).length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
            <div className="inline-flex p-4 bg-gray-50 rounded-full mb-4">
              <Trophy className="h-16 w-16 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {tournaments.length === 0 ? "Nessun torneo disponibile" : "Nessun torneo trovato"}
            </h3>
            <p className="text-sm text-gray-600">
              {tournaments.length === 0 
                ? "Nuovi tornei saranno annunciati presto"
                : "Prova a modificare la ricerca"
              }
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {tournaments
              .filter(t => 
                !searchQuery || 
                t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.description?.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((tournament) => (
                <TournamentCard key={tournament.id} tournament={tournament} showRegister />
              ))}
          </div>
        )
      )}
    </div>
  );
}
