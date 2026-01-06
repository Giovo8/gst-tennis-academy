"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Users, Search, Loader2, Swords, ArrowLeft, Trophy, Target } from "lucide-react";
import { useRouter } from "next/navigation";

interface Player {
  id: string;
  full_name: string;
  avatar_url?: string;
  email: string;
  arena_stats?: {
    ranking: number;
    points: number;
    wins: number;
    losses: number;
    level: string;
    total_matches: number;
    win_rate: number;
  };
}

export default function ChooseOpponentPage() {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string>("");

  useEffect(() => {
    loadPlayers();
  }, []);

  useEffect(() => {
    filterPlayers();
  }, [searchQuery, players]);

  async function loadPlayers() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setLoading(false);
        return;
      }

      setCurrentUserId(session.user.id);

      // Usa l'API per caricare i giocatori (bypassa RLS)
      const response = await fetch("/api/arena/players", {
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Errore nel caricamento dei giocatori");
      }

      const data = await response.json();
      setPlayers(data.players || []);
      setFilteredPlayers(data.players || []);
    } catch (error) {
      console.error("Error loading players:", error);
    } finally {
      setLoading(false);
    }
  }

  function filterPlayers() {
    if (!searchQuery.trim()) {
      setFilteredPlayers(players);
      return;
    }

    const filtered = players.filter((p) =>
      p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredPlayers(filtered);
  }

  function handleSelectOpponent(playerId: string) {
    router.push(`/dashboard/atleta/arena/configure-challenge/${playerId}`);
  }

  const getLevelColor = (level?: string) => {
    if (!level) return "text-gray-600 bg-gray-50 border-gray-200";
    switch (level.toLowerCase()) {
      case "oro":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "argento":
        return "text-gray-600 bg-gray-50 border-gray-200";
      case "bronzo":
        return "text-orange-600 bg-orange-50 border-orange-200";
      case "platino":
        return "text-purple-600 bg-purple-50 border-purple-200";
      case "diamante":
        return "text-blue-600 bg-blue-50 border-blue-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-600 hover:text-gray-900 mb-4 inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Torna all'Arena
        </button>
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <div className="p-2 bg-frozen-500 rounded-xl">
            <Users className="h-8 w-8 text-white" />
          </div>
          Scegli il tuo Avversario
        </h1>
        <p className="text-sm text-gray-600">
          Seleziona un atleta e lanciagli una sfida
        </p>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cerca per nome o email..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-frozen-500 focus:border-frozen-500"
          />
        </div>
        <div className="mt-3 text-sm text-gray-600">
          {filteredPlayers.length} {filteredPlayers.length === 1 ? "atleta trovato" : "atleti trovati"}
        </div>
      </div>

      {/* Players List */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-frozen-500 mx-auto mb-4" />
          <p className="text-gray-600">Caricamento atleti...</p>
        </div>
      ) : filteredPlayers.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 font-medium mb-1">Nessun atleta trovato</p>
          <p className="text-sm text-gray-500">Prova a modificare la ricerca</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPlayers.map((player) => (
            <button
              key={player.id}
              onClick={() => handleSelectOpponent(player.id)}
              className="bg-white rounded-xl border-2 p-4 text-left transition-all hover:shadow-lg border-gray-200 hover:border-frozen-500 hover:bg-frozen-50"
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-full bg-frozen-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {player.avatar_url ? (
                    <img
                      src={player.avatar_url}
                      alt={player.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xl font-bold text-frozen-700">
                      {player.full_name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 text-lg mb-1 truncate">
                    {player.full_name}
                  </h3>
                  
                  {player.arena_stats ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600">#{player.arena_stats.ranking}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium border ${getLevelColor(
                            player.arena_stats.level
                          )}`}
                        >
                          {player.arena_stats.level}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Trophy className="h-3.5 w-3.5 text-gray-400" />
                          <span className="text-gray-600">{player.arena_stats.points} pt</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Target className="h-3.5 w-3.5 text-gray-400" />
                          <span className="text-gray-600">
                            {player.arena_stats.wins}W - {player.arena_stats.losses}L
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Nuovo nell'Arena</p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
