"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { Trophy, Users, Save, TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle } from "lucide-react";

interface GroupStandings {
  participant_id: string;
  user_id: string;
  full_name: string;
  points: number;
  matches_played: number;
  matches_won: number;
  matches_lost: number;
  sets_won: number;
  sets_lost: number;
  set_diff: number;
  games_won: number;
  games_lost: number;
  game_diff: number;
  position: number;
}

interface Group {
  id: string;
  tournament_id: string;
  group_name: string;
  group_order: number;
  max_participants: number;
  advancement_count: number;
  standings?: GroupStandings[];
}

interface Match {
  id: string;
  player1_id: string;
  player2_id: string;
  player1_name: string;
  player2_name: string;
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
  match_status: string;
  scheduled_time?: string;
  court_number?: string;
}

interface GroupStageManagerProps {
  tournamentId: string;
  matchFormat: "best_of_1" | "best_of_3" | "best_of_5";
  isAdmin?: boolean;
}

export default function GroupStageManager({ tournamentId, matchFormat, isAdmin = false }: GroupStageManagerProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Score editor state
  const [editingMatch, setEditingMatch] = useState<string | null>(null);
  const [scoreInput, setScoreInput] = useState<{
    sets: Array<{ set: number; p1_games: number; p2_games: number; tiebreak?: { p1_points: number; p2_points: number } | null }>;
  }>({ sets: [] });

  useEffect(() => {
    loadGroups();
  }, [tournamentId]);

  useEffect(() => {
    if (selectedGroup) {
      loadGroupMatches(selectedGroup);
    }
  }, [selectedGroup]);

  async function loadGroups() {
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/groups`);
      const data = await response.json();

      if (data.success) {
        setGroups(data.groups || []);
        if (data.groups && data.groups.length > 0) {
          setSelectedGroup(data.groups[0].id);
        }
      }
    } catch (error) {
      console.error("Error loading groups:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadGroupMatches(groupId: string) {
    try {
      // Get all matches for this tournament in groups stage
      const response = await fetch(`/api/tournaments/${tournamentId}/matches?stage=groups`);
      const data = await response.json();

      if (data.success) {
        const group = groups.find(g => g.id === groupId);
        if (!group || !group.standings) return;

        // Filter matches that involve participants from this group
        const participantIds = group.standings.map(s => s.participant_id);
        const groupMatches = (data.matches || [])
          .filter((m: any) => 
            participantIds.includes(m.player1_id) && participantIds.includes(m.player2_id)
          )
          .map((m: any) => ({
            id: m.id,
            player1_id: m.player1_id,
            player2_id: m.player2_id,
            player1_name: m.player1?.profiles?.full_name || "Giocatore 1",
            player2_name: m.player2?.profiles?.full_name || "Giocatore 2",
            player1_sets: m.player1_sets || 0,
            player2_sets: m.player2_sets || 0,
            score_detail: m.score_detail || { sets: [] },
            match_status: m.match_status,
            scheduled_time: m.scheduled_time,
            court_number: m.court_number,
          }));

        setMatches(groupMatches);
      }
    } catch (error) {
      console.error("Error loading matches:", error);
    }
  }

  function initScoreEditor(match: Match) {
    const numSets = matchFormat === "best_of_5" ? 5 : matchFormat === "best_of_3" ? 3 : 1;
    const existingSets = match.score_detail?.sets || [];

    // Initialize with existing scores or empty sets
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

    // Auto-detect tiebreak scenario (6-6)
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
    setMessage(null);

    try {
      // Filter out sets that haven't been played (both players at 0)
      const playedSets = scoreInput.sets.filter(set => set.p1_games > 0 || set.p2_games > 0);

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(`/api/tournaments/${tournamentId}/matches/${matchId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          score_detail: { sets: playedSets },
          match_status: playedSets.length > 0 ? "completed" : "scheduled",
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: "success", text: "Punteggio salvato con successo!" });
        setEditingMatch(null);
        await loadGroupMatches(selectedGroup!);
        await loadGroups(); // Reload to update standings
      } else {
        setMessage({ type: "error", text: data.error || "Errore nel salvataggio" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Errore di rete" });
    } finally {
      setSaving(false);
    }
  }

  function formatScore(match: Match): string {
    if (!match.score_detail?.sets || match.score_detail.sets.length === 0) {
      return "Non giocata";
    }

    return match.score_detail.sets
      .map(set => {
        let score = `${set.p1_games}-${set.p2_games}`;
        if (set.tiebreak) {
          score += ` (${set.tiebreak.p1_points}-${set.tiebreak.p2_points})`;
        }
        return score;
      })
      .join(", ");
  }

  const currentGroup = groups.find(g => g.id === selectedGroup);

  if (loading) {
    return <div className="text-center py-12 text-muted">Caricamento gironi...</div>;
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
        <Trophy className="h-12 w-12 text-muted-2 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">Nessun girone creato</h3>
        <p className="text-sm text-muted">I gironi verranno creati dall'amministratore del torneo</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Group Tabs */}
      <div className="flex flex-wrap gap-2">
        {groups.map(group => (
          <button
            key={group.id}
            onClick={() => setSelectedGroup(group.id)}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              selectedGroup === group.id
                ? "bg-accent text-text-dark shadow-lg shadow-accent/30"
                : "bg-white/5 border border-white/10 text-muted hover:bg-white/10 hover:text-white"
            }`}
          >
            {group.group_name}
          </button>
        ))}
      </div>

      {/* Message */}
      {message && (
        <div
          className={`flex items-center gap-3 rounded-lg border p-4 ${
            message.type === "success"
              ? "border-blue-500/30 bg-blue-500/10 text-blue-300"
              : "border-primary/30 bg-primary/10 text-primary-light"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      {/* Standings Table */}
      {currentGroup && (
        <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
          <div className="bg-white/5 border-b border-white/10 p-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Trophy className="h-5 w-5 text-accent" />
              Classifica {currentGroup.group_name}
            </h3>
            <p className="text-xs text-muted-2 mt-1">
              I primi {currentGroup.advancement_count} avanzano alla fase a eliminazione diretta
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/10">
                <tr className="text-xs uppercase tracking-wider text-muted-2">
                  <th className="px-4 py-3 text-left">Pos</th>
                  <th className="px-4 py-3 text-left">Giocatore</th>
                  <th className="px-4 py-3 text-center">Punti</th>
                  <th className="px-4 py-3 text-center">V-S</th>
                  <th className="px-4 py-3 text-center">Set</th>
                  <th className="px-4 py-3 text-center">Diff Set</th>
                  <th className="px-4 py-3 text-center">Game</th>
                  <th className="px-4 py-3 text-center">Diff Game</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {(currentGroup.standings || []).map((standing, index) => {
                  const isQualified = index < currentGroup.advancement_count;
                  return (
                    <tr
                      key={standing.participant_id}
                      className={`${
                        isQualified ? "bg-blue-500/5" : ""
                      } hover:bg-white/5 transition`}
                    >
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                          isQualified ? "bg-blue-500/20 text-blue-300" : "bg-white/10 text-muted"
                        }`}>
                          {standing.position}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-2" />
                          <span className="font-medium text-white">{standing.full_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-lg font-bold text-accent">{standing.points}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-white">
                        {standing.matches_won}-{standing.matches_lost}
                      </td>
                      <td className="px-4 py-3 text-center text-white">
                        {standing.sets_won}-{standing.sets_lost}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`flex items-center justify-center gap-1 ${
                          standing.set_diff > 0 ? "text-blue-300" : standing.set_diff < 0 ? "text-cyan-300" : "text-muted"
                        }`}>
                          {standing.set_diff > 0 ? <TrendingUp className="h-4 w-4" /> : standing.set_diff < 0 ? <TrendingDown className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                          {standing.set_diff > 0 ? `+${standing.set_diff}` : standing.set_diff}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-white">
                        {standing.games_won}-{standing.games_lost}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`flex items-center justify-center gap-1 ${
                          standing.game_diff > 0 ? "text-blue-300" : standing.game_diff < 0 ? "text-cyan-300" : "text-muted"
                        }`}>
                          {standing.game_diff > 0 ? <TrendingUp className="h-4 w-4" /> : standing.game_diff < 0 ? <TrendingDown className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                          {standing.game_diff > 0 ? `+${standing.game_diff}` : standing.game_diff}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Matches */}
      {isAdmin && matches.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white">Partite {currentGroup?.group_name}</h3>
          {matches.map(match => (
            <div
              key={match.id}
              className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{match.player1_name}</span>
                    <span className="text-xl font-bold text-accent">{match.player1_sets}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{match.player2_name}</span>
                    <span className="text-xl font-bold text-accent">{match.player2_sets}</span>
                  </div>
                </div>

                <div className="ml-8 text-right">
                  {match.match_status === "completed" ? (
                    <div className="text-sm text-blue-300 font-medium">Completata</div>
                  ) : (
                    <div className="text-sm text-yellow-400 font-medium">Da giocare</div>
                  )}
                  {match.court_number && (
                    <div className="text-xs text-muted-2 mt-1">Campo {match.court_number}</div>
                  )}
                </div>
              </div>

              {editingMatch === match.id ? (
                <div className="space-y-4 border-t border-white/10 pt-4">
                  <div className="text-sm font-semibold text-muted-2">Inserisci punteggio set per set:</div>
                  {scoreInput.sets.map((set, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <span className="text-sm font-medium text-muted w-16">Set {set.set}:</span>
                      
                      {/* Player 1 games */}
                      <input
                        type="number"
                        min="0"
                        max="7"
                        value={set.p1_games}
                        onChange={(e) => updateSetScore(index, "p1", parseInt(e.target.value) || 0)}
                        className="w-20 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-center text-white focus:border-accent focus:outline-none"
                      />
                      
                      <span className="text-muted-2">-</span>
                      
                      {/* Player 2 games */}
                      <input
                        type="number"
                        min="0"
                        max="7"
                        value={set.p2_games}
                        onChange={(e) => updateSetScore(index, "p2", parseInt(e.target.value) || 0)}
                        className="w-20 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-center text-white focus:border-accent focus:outline-none"
                      />

                      {/* Tiebreak */}
                      {set.tiebreak && (
                        <>
                          <span className="text-xs text-muted-2">Tie-break:</span>
                          <input
                            type="number"
                            min="0"
                            value={set.tiebreak.p1_points}
                            onChange={(e) => updateTiebreakScore(index, "p1", parseInt(e.target.value) || 0)}
                            className="w-16 rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-center text-sm text-white focus:border-accent focus:outline-none"
                          />
                          <span className="text-muted-2 text-xs">-</span>
                          <input
                            type="number"
                            min="0"
                            value={set.tiebreak.p2_points}
                            onChange={(e) => updateTiebreakScore(index, "p2", parseInt(e.target.value) || 0)}
                            className="w-16 rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-center text-sm text-white focus:border-accent focus:outline-none"
                          />
                        </>
                      )}
                    </div>
                  ))}

                  <div className="flex gap-3">
                    <button
                      onClick={() => saveMatchScore(match.id)}
                      disabled={saving}
                      className="flex items-center gap-2 rounded-lg bg-accent px-6 py-2 font-semibold text-text-dark transition hover:bg-accent-mid disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      {saving ? "Salvataggio..." : "Salva Punteggio"}
                    </button>
                    <button
                      onClick={() => setEditingMatch(null)}
                      className="rounded-lg border border-white/15 px-6 py-2 font-semibold text-white transition hover:bg-white/5"
                    >
                      Annulla
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between border-t border-white/10 pt-4">
                  <div className="text-sm text-muted">
                    {formatScore(match)}
                  </div>
                  <button
                    onClick={() => initScoreEditor(match)}
                    className="rounded-lg bg-white/5 border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    {match.match_status === "completed" ? "Modifica" : "Inserisci Risultato"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isAdmin && matches.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
          <AlertCircle className="h-12 w-12 text-muted-2 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Nessuna partita programmata</h3>
          <p className="text-sm text-muted">Le partite del girone verranno generate automaticamente</p>
        </div>
      )}
    </div>
  );
}
