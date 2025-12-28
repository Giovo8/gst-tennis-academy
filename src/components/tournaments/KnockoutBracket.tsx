"use client";

import { useState, useEffect } from "react";
import { Trophy, Save, Calendar, MapPin, Clock, Loader2, Users, Edit2, X } from "lucide-react";

interface TennisMatch {
  id: string;
  round_name: string;
  round_order: number;
  player1_id: string;
  player2_id: string;
  player1_name: string;
  player2_name: string;
  player1_seeding?: number;
  player2_seeding?: number;
  player1_sets: number;
  player2_sets: number;
  score_detail: {
    sets: Array<{
      set: number;
      p1_games: number;
      p2_games: number;
      tiebreak: { p1_points: number; p2_points: number } | null;
    }>;
  };
  winner_id?: string;
  match_status: string;
  scheduled_time?: string;
  court_number?: string;
}

interface KnockoutBracketProps {
  tournamentId: string;
  matchFormat: "best_of_1" | "best_of_3" | "best_of_5";
  isAdmin?: boolean;
}

export default function KnockoutBracket({ tournamentId, matchFormat, isAdmin = false }: KnockoutBracketProps) {
  const [matches, setMatches] = useState<TennisMatch[]>([]);
  const [rounds, setRounds] = useState<{ [key: string]: TennisMatch[] }>({});
  const [loading, setLoading] = useState(true);
  const [editingMatch, setEditingMatch] = useState<string | null>(null);
  const [scoreInput, setScoreInput] = useState<{
    sets: Array<{ set: number; p1_games: number; p2_games: number; tiebreak?: { p1_points: number; p2_points: number } | null }>;
  }>({ sets: [] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadKnockoutBracket();
  }, [tournamentId]);

  async function loadKnockoutBracket() {
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/knockout`);
      const data = await response.json();

      if (data.success) {
        const matchesData = (data.matches || []).map((m: any) => ({
          id: m.id,
          round_name: m.round_name,
          round_order: m.round_order,
          player1_id: m.player1_id,
          player2_id: m.player2_id,
          player1_name: m.player1?.profiles?.full_name || "TBD",
          player2_name: m.player2?.profiles?.full_name || "TBD",
          player1_seeding: m.player1?.seeding,
          player2_seeding: m.player2?.seeding,
          player1_sets: m.player1_sets || 0,
          player2_sets: m.player2_sets || 0,
          score_detail: m.score_detail || { sets: [] },
          winner_id: m.winner_id,
          match_status: m.match_status,
          scheduled_time: m.scheduled_time,
          court_number: m.court_number,
        }));

        setMatches(matchesData);
        setRounds(data.rounds || {});
      }
    } catch (error) {
      console.error("Error loading knockout bracket:", error);
    } finally {
      setLoading(false);
    }
  }

  function initScoreEditor(match: TennisMatch) {
    const numSets = matchFormat === "best_of_5" ? 5 : matchFormat === "best_of_3" ? 3 : 1;
    const existingSets = match.score_detail?.sets || [];

    const sets = [];
    for (let i = 0; i < numSets; i++) {
      if (existingSets[i]) {
        sets.push({
          set: existingSets[i].set,
          p1_games: existingSets[i].p1_games,
          p2_games: existingSets[i].p2_games,
          tiebreak: existingSets[i].tiebreak || null,
        });
      } else {
        sets.push({
          set: i + 1,
          p1_games: 0,
          p2_games: 0,
          tiebreak: null,
        });
      }
    }

    setScoreInput({ sets });
    setEditingMatch(match.id);
  }

  function updateSetScore(setIndex: number, player: "p1" | "p2", value: number) {
    const newSets = [...scoreInput.sets];
    if (player === "p1") {
      newSets[setIndex].p1_games = Math.max(0, value);
    } else {
      newSets[setIndex].p2_games = Math.max(0, value);
    }

    if (newSets[setIndex].p1_games === 6 && newSets[setIndex].p2_games === 6) {
      if (!newSets[setIndex].tiebreak) {
        newSets[setIndex].tiebreak = { p1_points: 0, p2_points: 0 };
      }
    } else {
      newSets[setIndex].tiebreak = null;
    }

    setScoreInput({ sets: newSets });
  }

  function updateTiebreakScore(setIndex: number, player: "p1" | "p2", value: number) {
    const newSets = [...scoreInput.sets];
    if (!newSets[setIndex].tiebreak) {
      newSets[setIndex].tiebreak = { p1_points: 0, p2_points: 0 };
    }

    if (player === "p1") {
      newSets[setIndex].tiebreak!.p1_points = Math.max(0, value);
    } else {
      newSets[setIndex].tiebreak!.p2_points = Math.max(0, value);
    }

    setScoreInput({ sets: newSets });
  }

  async function saveMatchScore(matchId: string) {
    setSaving(true);

    try {
      const playedSets = scoreInput.sets.filter(set => set.p1_games > 0 || set.p2_games > 0);

      const response = await fetch(`/api/tournaments/${tournamentId}/matches/${matchId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score_detail: { sets: playedSets },
          match_status: playedSets.length > 0 ? "completed" : "scheduled",
        }),
      });

      const data = await response.json();

      if (data.success) {
        setEditingMatch(null);
        await loadKnockoutBracket();
      } else {
        alert(data.error || "Errore nel salvataggio");
      }
    } catch (error) {
      alert("Errore di rete");
    } finally {
      setSaving(false);
    }
  }

  function formatTennisScore(match: TennisMatch): string {
    if (!match.score_detail?.sets || match.score_detail.sets.length === 0) {
      return "";
    }

    return match.score_detail.sets
      .map(set => {
        let score = `${set.p1_games}-${set.p2_games}`;
        if (set.tiebreak) {
          score += `(${set.tiebreak.p1_points})`;
        }
        return score;
      })
      .join(" ");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 rounded-2xl border border-amber-400/20 bg-gradient-to-br from-blue-500/10 to-transparent backdrop-blur-xl">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-amber-400 mx-auto mb-4" />
          <p className="text-sm text-gray-400">Caricamento tabellone...</p>
        </div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-500/10 to-transparent backdrop-blur-xl p-12 text-center">
        <Trophy className="h-12 w-12 text-blue-400/50 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">Fase a eliminazione diretta non iniziata</h3>
        <p className="text-sm text-gray-400">Il tabellone verrà generato al termine della fase a gironi</p>
      </div>
    );
  }

  // Get unique round names sorted by order
  const roundNames = Object.keys(rounds).sort((a, b) => {
    const matchA = rounds[a][0];
    const matchB = rounds[b][0];
    return (matchA?.round_order || 0) - (matchB?.round_order || 0);
  });

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-500/10 to-transparent backdrop-blur-xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="rounded-xl bg-blue-500/20 p-2">
            <Trophy className="h-6 w-6 text-blue-300" />
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-200 to-cyan-300 bg-clip-text text-transparent">Tabellone Eliminazione Diretta</h2>
            <p className="text-sm text-gray-400">Formato: {matchFormat === 'best_of_5' ? 'Best of 5' : matchFormat === 'best_of_3' ? 'Best of 3' : 'Best of 1'} set</p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="flex gap-8 min-w-max pb-4">
          {roundNames.map((roundName, roundIndex) => {
            const roundMatches = rounds[roundName] || [];

            return (
              <div key={roundName} className="min-w-[320px]">
                <div className="mb-4 sticky top-0 backdrop-blur-xl py-3 z-10 border-b border-blue-400/20">
                  <div className="rounded-xl border border-blue-400/20 bg-gradient-to-br from-blue-500/10 to-transparent backdrop-blur-xl px-4 py-2">
                    <h3 className="text-lg font-bold text-white">{roundName}</h3>
                    <p className="text-xs text-blue-400">
                      {roundMatches.filter(m => m.match_status === "completed").length}/{roundMatches.length} completate
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {roundMatches.map((match) => {
                    const isCompleted = match.match_status === "completed";
                    const winner1 = match.winner_id === match.player1_id;
                    const winner2 = match.winner_id === match.player2_id;

                    return (
                      <div
                        key={match.id}
                        className={`rounded-xl border p-4 transition-all ${
                          isCompleted
                            ? "border-blue-500/30 bg-blue-500/5"
                            : "border-white/10 bg-white/5"
                        }`}
                      >
                        {/* Match Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2 text-xs text-muted-2">
                            {match.court_number && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                Campo {match.court_number}
                              </div>
                            )}
                            {match.scheduled_time && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(match.scheduled_time).toLocaleString("it-IT", {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            )}
                          </div>
                          {isCompleted && (
                            <div className="text-xs font-semibold text-blue-300">Completata</div>
                          )}
                        </div>

                        {/* Players */}
                        <div className="space-y-2">
                          <div
                            className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                              winner1
                                ? "bg-accent/15 border border-accent/30"
                                : "bg-white/5 border border-white/10"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {match.player1_seeding && (
                                <span className="text-xs font-bold text-muted-2 w-6">#{match.player1_seeding}</span>
                              )}
                              <span className={`font-semibold ${winner1 ? "text-accent" : "text-white"}`}>
                                {match.player1_name}
                              </span>
                            </div>
                            <span className={`text-xl font-bold ${winner1 ? "text-accent" : "text-muted"}`}>
                              {match.player1_sets}
                            </span>
                          </div>

                          <div
                            className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                              winner2
                                ? "bg-accent/15 border border-accent/30"
                                : "bg-white/5 border border-white/10"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {match.player2_seeding && (
                                <span className="text-xs font-bold text-muted-2 w-6">#{match.player2_seeding}</span>
                              )}
                              <span className={`font-semibold ${winner2 ? "text-accent" : "text-white"}`}>
                                {match.player2_name}
                              </span>
                            </div>
                            <span className={`text-xl font-bold ${winner2 ? "text-accent" : "text-muted"}`}>
                              {match.player2_sets}
                            </span>
                          </div>
                        </div>

                        {/* Score Detail */}
                        {formatTennisScore(match) && (
                          <div className="mt-3 pt-3 border-t border-white/10">
                            <div className="text-sm text-center text-muted-2">
                              Punteggio: <span className="text-white font-mono">{formatTennisScore(match)}</span>
                            </div>
                          </div>
                        )}

                        {/* Admin Edit Score */}
                        {isAdmin && (
                          <div className="mt-3 pt-3 border-t border-white/10">
                            {editingMatch === match.id ? (
                              <div className="space-y-3">
                                <div className="text-sm font-semibold text-muted-2">Punteggio set:</div>
                                {scoreInput.sets.map((set, index) => (
                                  <div key={index} className="flex items-center gap-2 text-sm">
                                    <span className="text-muted w-12">Set {set.set}:</span>
                                    <input
                                      type="number"
                                      min="0"
                                      max="7"
                                      value={set.p1_games}
                                      onChange={(e) => updateSetScore(index, "p1", parseInt(e.target.value) || 0)}
                                      className="w-16 rounded border border-white/15 bg-white/5 px-2 py-1 text-center text-white"
                                    />
                                    <span className="text-muted">-</span>
                                    <input
                                      type="number"
                                      min="0"
                                      max="7"
                                      value={set.p2_games}
                                      onChange={(e) => updateSetScore(index, "p2", parseInt(e.target.value) || 0)}
                                      className="w-16 rounded border border-white/15 bg-white/5 px-2 py-1 text-center text-white"
                                    />
                                    {set.tiebreak && (
                                      <>
                                        <span className="text-xs text-muted-2">TB:</span>
                                        <input
                                          type="number"
                                          min="0"
                                          value={set.tiebreak.p1_points}
                                          onChange={(e) => updateTiebreakScore(index, "p1", parseInt(e.target.value) || 0)}
                                          className="w-12 rounded border border-white/15 bg-white/5 px-1 py-1 text-center text-xs text-white"
                                        />
                                        <span className="text-muted text-xs">-</span>
                                        <input
                                          type="number"
                                          min="0"
                                          value={set.tiebreak.p2_points}
                                          onChange={(e) => updateTiebreakScore(index, "p2", parseInt(e.target.value) || 0)}
                                          className="w-12 rounded border border-white/15 bg-white/5 px-1 py-1 text-center text-xs text-white"
                                        />
                                      </>
                                    )}
                                  </div>
                                ))}
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => saveMatchScore(match.id)}
                                    disabled={saving}
                                    className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-[#06101f] hover:bg-accent-mid disabled:opacity-50"
                                  >
                                    <Save className="h-4 w-4" />
                                    {saving ? "Salvataggio..." : "Salva"}
                                  </button>
                                  <button
                                    onClick={() => setEditingMatch(null)}
                                    className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/5"
                                  >
                                    Annulla
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => initScoreEditor(match)}
                                className="w-full rounded-lg bg-white/5 border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
                              >
                                {isCompleted ? "Modifica Punteggio" : "Inserisci Risultato"}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Winner Display */}
      {roundNames.length > 0 && (
        (() => {
          const finalRound = rounds[roundNames[roundNames.length - 1]];
          const finalMatch = finalRound && finalRound[0];
          const champion = finalMatch?.winner_id
            ? finalMatch.winner_id === finalMatch.player1_id
              ? finalMatch.player1_name
              : finalMatch.player2_name
            : null;

          if (champion && champion !== "TBD") {
            return (
              <div className="mt-8 rounded-xl border border-accent/30 bg-accent/5 p-8 text-center">
                <Trophy className="h-16 w-16 text-accent mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-accent mb-2">Campione</h3>
                <p className="text-3xl font-bold text-white">{champion}</p>
              </div>
            );
          }
          return null;
        })()
      )}
    </div>
  );
}
