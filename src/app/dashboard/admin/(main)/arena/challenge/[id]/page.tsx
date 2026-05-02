"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import {
  Check,
  Edit,
  Target,
  Handshake,
} from "lucide-react";

interface Challenge {
  id: string;
  challenger_id: string;
  opponent_id: string;
  status: "pending" | "accepted" | "declined" | "completed" | "cancelled" | "counter_proposal" | "awaiting_score";
  scheduled_date?: string;
  court?: string;
  message?: string;
  booking_id?: string;
  match_format?: string;
  duration_minutes?: number;
  match_type?: string;
  challenge_type?: string;
  my_partner_id?: string;
  opponent_partner_id?: string;
  winner_id?: string;
  score?: string;
  created_at: string;
  challenger?: {
    id: string;
    full_name: string;
    avatar_url?: string;
    email?: string;
    phone?: string;
    arena_rank?: string;
    arena_points?: number;
  };
  opponent?: {
    id: string;
    full_name: string;
    avatar_url?: string;
    email?: string;
    phone?: string;
    arena_rank?: string;
    arena_points?: number;
  };
  my_partner?: {
    id: string;
    full_name: string;
    avatar_url?: string;
    email?: string;
    phone?: string;
    arena_rank?: string;
    arena_points?: number;
  };
  opponent_partner?: {
    id: string;
    full_name: string;
    avatar_url?: string;
    email?: string;
    phone?: string;
    arena_rank?: string;
    arena_points?: number;
  };
  booking?: {
    id: string;
    court: string;
    start_time: string;
    end_time: string;
    status: string;
  };
}

const SCORE_PATTERN = /^\d+-\d+(?:,\s*\d+-\d+)*$/;

function getPlayerInitial(name?: string) {
  return name?.trim().charAt(0).toUpperCase() || "U";
}

function getWinnerName(challenge: Challenge) {
  if (!challenge.winner_id) return null;

  if (challenge.winner_id === challenge.challenger_id) {
    return challenge.challenger?.full_name || "Sfidante";
  }

  if (challenge.winner_id === challenge.opponent_id) {
    return challenge.opponent?.full_name || "Sfidato";
  }

  return "Vincitore non riconosciuto";
}

function hasChallengeDatePassed(challenge: Challenge) {
  const challengeDateValue = challenge.booking?.start_time || challenge.scheduled_date;

  if (!challengeDateValue) {
    return true;
  }

  const today = new Date().toDateString();
  const challengeDay = new Date(challengeDateValue).toDateString();

  return challengeDay !== "Invalid Date" && new Date(challengeDay) <= new Date(today);
}

function getMatchFormatLabel(matchFormat?: string) {
  const formatMap: Record<string, string> = {
    best_of_3: "Meglio dei 5",
    best_of_2: "Meglio dei 3",
    single_set: "Set Singolo",
  };

  return formatMap[matchFormat || ""] || matchFormat || "-";
}

function capitalizeLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatBookingDate(dateValue: string) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
    .formatToParts(date)
    .map((part) => {
      if (part.type === "weekday" || part.type === "month") {
        return capitalizeLabel(part.value);
      }

      return part.value;
    })
    .join("");
}

function isDoublesMatch(matchType?: string) {
  const normalized = (matchType || "").toLowerCase();
  return normalized === "doubles" || normalized === "doppio";
}

function getMatchTypeLabel(matchType?: string) {
  return isDoublesMatch(matchType) ? "Doppio" : "Singolo";
}

function getWinnerIdFromScore(scoreValue: string, challengerId: string, opponentId: string) {
  const sets = scoreValue
    .split(",")
    .map((setScore) => setScore.trim())
    .filter(Boolean)
    .map((setScore) => {
      const match = setScore.match(/^(\d+)-(\d+)$/);
      if (!match) return null;
      return {
        challengerGames: Number(match[1]),
        opponentGames: Number(match[2]),
      };
    })
    .filter((setScore): setScore is { challengerGames: number; opponentGames: number } => setScore !== null);

  if (sets.length === 0) {
    return null;
  }

  const challengerSetsWon = sets.reduce(
    (sum, setScore) => sum + (setScore.challengerGames > setScore.opponentGames ? 1 : 0),
    0,
  );
  const opponentSetsWon = sets.reduce(
    (sum, setScore) => sum + (setScore.opponentGames > setScore.challengerGames ? 1 : 0),
    0,
  );

  if (challengerSetsWon === opponentSetsWon) {
    return null;
  }

  return challengerSetsWon > opponentSetsWon ? challengerId : opponentId;
}

function buildScoreGrid(score?: string) {
  if (!score) return null;

  const sets = score
    .split(",")
    .map((setScore) => setScore.trim())
    .filter(Boolean)
    .map((setScore) => {
      const match = setScore.match(/^(\d+)-(\d+)$/);
      if (!match) return null;
      return {
        winner: Number(match[1]),
        loser: Number(match[2]),
      };
    })
    .filter((setScore): setScore is { winner: number; loser: number } => setScore !== null);

  if (sets.length === 0) return null;

  const setsWonByWinner = sets.filter((setScore) => setScore.winner > setScore.loser).length;
  const setsWonByLoser = sets.filter((setScore) => setScore.loser > setScore.winner).length;

  return {
    sets,
    totalWinner: setsWonByWinner,
    totalLoser: setsWonByLoser,
  };
}

function getPointsFromScore(
  scoreValue: string,
  winnerId: string,
  challengerId: string,
): { winnerPts: number; loserPts: number } | null {
  const sets = scoreValue
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const match = s.match(/^(\d+)-(\d+)$/);
      if (!match) return null;
      return { left: Number(match[1]), right: Number(match[2]) };
    })
    .filter((s): s is { left: number; right: number } => s !== null);

  if (sets.length === 0) return null;

  const isWinnerChallenger = winnerId === challengerId;
  let winnerSets = 0;
  let loserSets = 0;
  for (const s of sets) {
    if (isWinnerChallenger) {
      if (s.left > s.right) winnerSets++; else loserSets++;
    } else {
      if (s.right > s.left) winnerSets++; else loserSets++;
    }
  }

  if (loserSets === 0) return { winnerPts: 30, loserPts: 0 };
  if (winnerSets === 3 && loserSets === 1) return { winnerPts: 25, loserPts: 5 };
  return { winnerPts: 20, loserPts: 10 };
}

export default function AdminChallengeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params?.id) ? params?.id[0] : params?.id;

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [showScoreForm, setShowScoreForm] = useState(false);
  const [score, setScore] = useState("");
  const [savingScore, setSavingScore] = useState(false);

  useEffect(() => {
    if (id) {
      loadChallengeDetails();
    }
  }, [id]);

  useEffect(() => {
    if (challenge) {
      setScore(challenge.score || "");
    }
  }, [challenge]);

  async function loadChallengeDetails() {
    try {
      const response = await fetch(`/api/arena/challenges?challenge_id=${id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.challenge) {
          setChallenge(data.challenge);
        }
      }
    } catch (error) {
      console.error("Error loading challenge:", error);
    } finally {
      setLoading(false);
    }
  }

  function getStatusLabel(status: string): string {
    const statusMap: Record<string, string> = {
      pending: "Da Confermare",
      accepted: "Confermata",
      declined: "Rifiutata",
      completed: "Completata",
      cancelled: "Annullata",
      counter_proposal: "Controproposta",
      awaiting_score: "Attesa Punteggio",
    };
    return statusMap[status] || status;
  }

  async function handleDelete() {
    if (!confirm("Sei sicuro di voler eliminare questa sfida?")) return;

    try {
      const response = await fetch("/api/arena/challenges", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challenge_id: id }),
      });

      if (response.ok) {
        router.push("/dashboard/admin/arena");
        return;
      }

      const errorData = await response.json().catch(() => null);
      alert(errorData?.error || "Impossibile eliminare la sfida");
    } catch (error) {
      console.error("Error deleting challenge:", error);
      alert("Errore durante l'eliminazione della sfida");
    }
  }

  async function handleCancel() {
    if (!confirm("Sei sicuro di voler annullare questa sfida?")) return;

    try {
      const response = await fetch("/api/arena/challenges", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenge_id: id,
          status: "cancelled",
        }),
      });

      if (response.ok) {
        await loadChallengeDetails();
        return;
      }

      const errorData = await response.json().catch(() => null);
      alert(errorData?.error || "Impossibile annullare la sfida");
    } catch (error) {
      console.error("Error cancelling challenge:", error);
      alert("Errore durante l'annullamento della sfida");
    }
  }

  async function handleConfirm() {
    if (!confirm("Confermare questa sfida?")) return;

    try {
      const response = await fetch("/api/arena/challenges", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenge_id: id,
          status: "accepted",
        }),
      });

      if (response.ok) {
        await loadChallengeDetails();
        return;
      }

      const errorData = await response.json().catch(() => null);
      alert(errorData?.error || "Impossibile confermare la sfida");
    } catch (error) {
      console.error("Error confirming challenge:", error);
      alert("Errore durante la conferma della sfida");
    }
  }

  async function handleSaveScore() {
    if (!score.trim()) {
      alert("Inserisci il punteggio");
      return;
    }

    if (!SCORE_PATTERN.test(score.trim())) {
      alert("Formato punteggio non valido. Usa ad esempio: 6-4, 6-3");
      return;
    }

    const normalizedScore = score.trim();
    const computedWinnerId = getWinnerIdFromScore(normalizedScore, challenge.challenger_id, challenge.opponent_id);

    if (!computedWinnerId) {
      alert("Impossibile determinare il vincitore dal punteggio inserito");
      return;
    }

    try {
      setSavingScore(true);

      const response = await fetch(`/api/arena/challenges?challenge_id=${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          winner_id: computedWinnerId,
          score: normalizedScore,
          status: "completed",
        }),
      });

      if (response.ok) {
        alert("✅ Punteggio salvato con successo!");
        setShowScoreForm(false);
        loadChallengeDetails();
      } else {
        const errorData = await response.json();
        alert(`❌ Errore: ${errorData.error || "Impossibile salvare il punteggio"}`);
      }
    } catch (error) {
      console.error("Error saving score:", error);
      alert("❌ Errore nel salvataggio del punteggio");
    } finally {
      setSavingScore(false);
    }
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      pending: { label: "Da Confermare", className: "bg-yellow-100 text-yellow-800" },
      accepted: { label: "Confermata", className: "bg-green-100 text-green-800" },
      declined: { label: "Rifiutata", className: "bg-red-100 text-red-800" },
      completed: { label: "Completata", className: "bg-blue-100 text-blue-800" },
      cancelled: { label: "Annullata", className: "bg-gray-100 text-gray-800" },
      counter_proposal: { label: "Controproposta", className: "bg-purple-100 text-purple-800" },
      awaiting_score: { label: "Attesa Punteggio", className: "bg-orange-100 text-orange-800" },
    };

    const badge = badges[status] || { label: status, className: "bg-gray-100 text-gray-800" };
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badge.className}`}>
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-600">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-secondary/60">Sfida non trovata</p>
        </div>
      </div>
    );
  }

  const canEnterScore =
    !challenge.winner_id &&
    !showScoreForm &&
    (
      challenge.status === "awaiting_score" ||
      ((challenge.status === "accepted" || challenge.status === "completed") && hasChallengeDatePassed(challenge))
    );

  const insertScoreButtonLabel = challenge.status === "awaiting_score" ? "Inserisci Punteggio" : "Inserisci Risultato";

  const canCancelChallenge =
    challenge.status !== "cancelled" &&
    challenge.status !== "declined" &&
    challenge.status !== "completed" &&
    challenge.status !== "awaiting_score";

  const canConfirmChallenge = challenge.status === "pending";
  const isDoubles = isDoublesMatch(challenge.match_type);
  const scoreGrid = buildScoreGrid(challenge.score);
  const winnerIsChallenger = challenge.winner_id === challenge.challenger_id;
  const winnerDisplayName = winnerIsChallenger
    ? `${challenge.challenger?.full_name || "Sfidante"}${isDoubles && challenge.my_partner ? ` / ${challenge.my_partner.full_name}` : ""}`
    : `${challenge.opponent?.full_name || "Sfidato"}${isDoubles && challenge.opponent_partner ? ` / ${challenge.opponent_partner.full_name}` : ""}`;
  const loserDisplayName = winnerIsChallenger
    ? `${challenge.opponent?.full_name || "Sfidato"}${isDoubles && challenge.opponent_partner ? ` / ${challenge.opponent_partner.full_name}` : ""}`
    : `${challenge.challenger?.full_name || "Sfidante"}${isDoubles && challenge.my_partner ? ` / ${challenge.my_partner.full_name}` : ""}`;

  const challengeTypeColor =
    challenge.challenge_type === "ranked"
      ? "var(--secondary)"
      : "#023047";
  const participantCards = [
    {
      key: challenge.challenger?.id || "challenger",
      participant: challenge.challenger,
      background: "var(--secondary)",
      isChallenger: true,
    },
    ...(isDoubles && challenge.my_partner
      ? [{
          key: challenge.my_partner.id,
          participant: challenge.my_partner,
          background: "var(--secondary)",
          isChallenger: true,
        }]
      : []),
    {
      key: challenge.opponent?.id || "opponent",
      participant: challenge.opponent,
      background: "#023047",
      isChallenger: false,
    },
    ...(isDoubles && challenge.opponent_partner
      ? [{
          key: challenge.opponent_partner.id,
          participant: challenge.opponent_partner,
          background: "#023047",
          isChallenger: false,
        }]
      : []),
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div>
        <p className="breadcrumb text-secondary/60">
          <Link href="/dashboard/admin/arena" className="hover:text-secondary/80 transition-colors">Gestione Arena</Link>
          {" › "}
          <span>Dettagli Sfida</span>
        </p>
        <h1 className="text-4xl font-bold text-secondary">Dettagli Sfida</h1>
      </div>

      {/* Challenge Type Header */}
      <div
        className="rounded-xl border-t border-r border-b p-6 border-l-4"
        style={{ borderLeftColor: (() => {
          return challengeTypeColor;
        })(),
        backgroundColor: challengeTypeColor,
        }}
      >
        <div className="flex items-start gap-6">
          {challenge.challenge_type === "ranked" ? (
            <Target className="h-8 w-8 text-white flex-shrink-0" strokeWidth={2.5} />
          ) : (
            <Handshake className="h-8 w-8 text-white flex-shrink-0" strokeWidth={2.5} />
          )}
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white">
              {challenge.challenge_type === "ranked" ? "Sfida Classificata" : "Sfida Amichevole"}
            </h2>
          </div>
        </div>
      </div>

      {/* Players Section */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
          <h2 className="text-base sm:text-lg font-semibold text-secondary">Partecipanti</h2>
        </div>
        <div className="px-6 py-4">
          <ul className="flex flex-col gap-3">
            {participantCards.map(({ key, participant, background, isChallenger }) => {
              if (!participant) {
                return null;
              }

              const setsWon = scoreGrid
                ? (isChallenger === winnerIsChallenger ? scoreGrid.totalWinner : scoreGrid.totalLoser)
                : null;

              return (
                <li key={key}>
                  <div className="flex items-center gap-4 py-3 px-3 rounded-lg" style={{ background }}>
                    <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden">
                      {participant.avatar_url ? (
                        <img src={participant.avatar_url} alt={participant.full_name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-bold text-white leading-none">
                          {getPlayerInitial(participant.full_name)}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm">{participant.full_name}</p>
                      {participant.email && (
                        <p className="text-xs text-white/60 truncate mt-0.5">{participant.email}</p>
                      )}
                    </div>
                    {setsWon !== null && (
                      <span className="text-white font-bold text-lg flex-shrink-0">{setsWon}</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Match Details */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
          <h2 className="text-base sm:text-lg font-semibold text-secondary">Dettagli Match</h2>
        </div>
        <div className="px-6 py-6">
          <div className="space-y-6">
          {challenge.match_type && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Tipo Match</label>
              <div className="flex-1">
                <p className="text-secondary font-semibold">
                  {getMatchTypeLabel(challenge.match_type)}
                </p>
              </div>
            </div>
          )}
          {challenge.match_format && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Formato</label>
              <div className="flex-1">
                <p className="text-secondary/70">{getMatchFormatLabel(challenge.match_format)}</p>
              </div>
            </div>
          )}
          {challenge.challenge_type && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Tipo Sfida</label>
              <div className="flex-1">
                <p className="text-secondary font-semibold">
                  {challenge.challenge_type === "ranked" ? "Classificata" : "Amichevole"}
                </p>
              </div>
            </div>
          )}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
            <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Data creazione</label>
            <div className="flex-1">
              <p className="text-secondary/70">
                {new Date(challenge.created_at).toLocaleDateString("it-IT", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}{" "}
                {new Date(challenge.created_at).toLocaleTimeString("it-IT", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8">
            <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Stato</label>
            <div className="flex-1">
              <p className="text-secondary font-semibold">
                {getStatusLabel(challenge.status)}
              </p>
            </div>
          </div>
          {challenge.winner_id && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pt-6 border-t border-gray-200">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Vincitore</label>
              <div className="flex-1">
                <p className="text-secondary font-semibold">{getWinnerName(challenge)}</p>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Risultato */}
      {(challenge.status === "completed" || !!challenge.winner_id || showScoreForm || canEnterScore || challenge.status === "awaiting_score") && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
            <h2 className="text-base sm:text-lg font-semibold text-secondary">Risultato</h2>
          </div>
          <div className="px-6 py-6">
            {!showScoreForm && challenge.winner_id && (
              <div className="space-y-3">
                {scoreGrid && (
                  <div className="mt-2 overflow-x-auto rounded-lg border border-gray-200">
                    <table className="min-w-full text-xs sm:text-sm">
                      <thead className="bg-gray-100 text-secondary">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold"></th>
                          <th className="px-3 py-2 text-center font-semibold">{winnerDisplayName}</th>
                          <th className="px-3 py-2 text-center font-semibold">{loserDisplayName}</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {scoreGrid.sets.map((setScore, index) => (
                          <tr key={`set-row-${index + 1}`} className="border-t border-gray-200">
                            <td className="px-3 py-2 font-semibold text-secondary">Set {index + 1}</td>
                            <td className="px-3 py-2 text-center font-semibold text-secondary">{setScore.winner}</td>
                            <td className="px-3 py-2 text-center font-semibold text-secondary/70">{setScore.loser}</td>
                          </tr>
                        ))}
                        <tr className="border-t border-gray-200 bg-gray-50">
                          <td className="px-3 py-2 font-semibold text-secondary">Totale</td>
                          <td className="px-3 py-2 text-center font-bold text-secondary">{scoreGrid.totalWinner}</td>
                          <td className="px-3 py-2 text-center font-bold text-secondary/70">{scoreGrid.totalLoser}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
                <button
                  onClick={() => setShowScoreForm(true)}
                  className="w-full mt-2 px-6 py-3 text-sm font-medium text-white bg-secondary rounded-lg hover:bg-secondary/90 transition-all flex items-center justify-center gap-2"
                >
                  Modifica Risultato
                </button>
              </div>
            )}

            {!showScoreForm && !challenge.winner_id && (
              <div className="flex flex-col items-stretch py-4 gap-3">
                {canEnterScore && (
                  <button
                    onClick={() => setShowScoreForm(true)}
                    className="w-full px-6 py-3 text-sm font-medium text-white bg-secondary rounded-lg hover:bg-secondary/90 transition-all flex items-center justify-center gap-2"
                  >
                    {insertScoreButtonLabel}
                  </button>
                )}
              </div>
            )}

            {showScoreForm && (
              <div className="space-y-6">
                {/* Campo Score */}
                <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                  <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
                    Punteggio *
                  </label>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={score}
                      onChange={(e) => setScore(e.target.value)}
                      placeholder="es: 6-4, 6-3"
                      inputMode="text"
                      pattern="\d+-\d+(,\s*\d+-\d+)*"
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary"
                    />
                    <p className="text-xs text-secondary/60 mt-2">
                      Formato: 6-4, 6-3 · Il vincitore e i punti vengono calcolati automaticamente dai set.
                    </p>
                    {(() => {
                      if (!score.trim() || !SCORE_PATTERN.test(score.trim())) return null;
                      const computedWinner = getWinnerIdFromScore(score.trim(), challenge.challenger_id, challenge.opponent_id);
                      if (!computedWinner) return null;
                      const pts = getPointsFromScore(score.trim(), computedWinner, challenge.challenger_id);
                      if (!pts) return null;
                      const winnerName = computedWinner === challenge.challenger_id ? challenge.challenger?.full_name : challenge.opponent?.full_name;
                      const loserName = computedWinner === challenge.challenger_id ? challenge.opponent?.full_name : challenge.challenger?.full_name;
                      return (
                        <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                          <p className="text-xs font-semibold text-green-700 mb-1">Anteprima risultato</p>
                          <p className="text-xs text-green-700">Vincitore: <strong>{winnerName}</strong> → <strong>+{pts.winnerPts} pt</strong></p>
                          <p className="text-xs text-green-600">{loserName} → +{pts.loserPts} pt</p>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Bottoni Azione */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSaveScore}
                    disabled={savingScore || !score.trim()}
                    className="px-4 py-2.5 text-sm font-medium text-white bg-secondary rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                  >
                    {savingScore ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Salvataggio...
                      </>
                    ) : (
                      <>
                        Salva Risultato
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowScoreForm(false);
                      setScore(challenge.score || "");
                    }}
                    disabled={savingScore}
                    className="px-4 py-2.5 text-sm font-medium text-secondary bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Annulla
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Booking Info */}
      {challenge.booking && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
            <h2 className="text-base sm:text-lg font-semibold text-secondary">Prenotazione Campo</h2>
          </div>
          <div className="px-6 py-6">
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Data</label>
              <div className="flex-1">
                <p className="text-secondary font-semibold">
                  {formatBookingDate(challenge.booking.start_time)}
                </p>
              </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Orario</label>
              <div className="flex-1">
                <p className="text-secondary/70">
                  {new Date(challenge.booking.start_time).toLocaleTimeString("it-IT", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  -{" "}
                  {new Date(challenge.booking.end_time).toLocaleTimeString("it-IT", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Campo</label>
              <div className="flex-1">
                <p className="text-secondary font-semibold">{challenge.booking.court}</p>
              </div>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* Message */}
      {challenge.message && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
            <h2 className="text-base sm:text-lg font-semibold text-secondary">Messaggio</h2>
          </div>
          <div className="px-6 py-6">
            <div className="p-4 bg-secondary/5 rounded-lg">
              <p className="text-secondary italic">&quot;{challenge.message}&quot;</p>
            </div>
          </div>
        </div>
      )}

      {/* Bottoni Azione - Alla fine */}
      <div className="flex flex-col sm:flex-row gap-3">
        {challenge.booking?.id && (
          <button
            onClick={() => router.push(`/dashboard/admin/bookings/${challenge.booking.id}`)}
            className="flex-1 min-w-[140px] flex items-center justify-center px-6 py-3 text-white bg-[#035f80] rounded-lg hover:bg-[#035f80]/90 transition-all font-medium"
          >
            Prenotazione Campo
          </button>
        )}
        {canConfirmChallenge && (
          <button
            onClick={handleConfirm}
            className="flex-1 min-w-[140px] flex items-center justify-center px-6 py-3 text-white bg-[#035f80] rounded-lg hover:bg-[#035f80]/90 transition-all font-medium"
          >
            Conferma
          </button>
        )}
        {challenge.status !== "cancelled" && challenge.status !== "completed" && challenge.status !== "awaiting_score" && (
          <button
            onClick={() => router.push(`/dashboard/admin/arena/challenge/${id}/edit`)}
            className="flex-1 min-w-[140px] flex items-center justify-center px-6 py-3 text-white bg-secondary rounded-lg hover:bg-secondary/90 transition-all font-medium"
          >
            Modifica
          </button>
        )}
        {canCancelChallenge && (
          <button
            onClick={handleCancel}
            className="flex-1 min-w-[140px] flex items-center justify-center px-6 py-3 text-white bg-[#023b52] rounded-lg hover:bg-[#023b52]/90 transition-all font-medium"
          >
            Annulla
          </button>
        )}
        <button
          onClick={handleDelete}
          className="flex-1 min-w-[140px] flex items-center justify-center px-6 py-3 text-white bg-[#022431] rounded-lg hover:bg-[#022431]/90 transition-all font-medium"
        >
          Elimina
        </button>
      </div>
    </div>
  );
}
