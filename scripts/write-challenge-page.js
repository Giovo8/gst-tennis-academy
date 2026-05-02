const fs = require('fs');
const path = 'c:/Users/giova/Desktop/gst-tennis-academy/src/app/dashboard/atleta/(main)/arena/challenge/[id]/page.tsx';

const content = `"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import {
  Check,
  X,
  MessageSquare,
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
  };
  opponent?: {
    id: string;
    full_name: string;
    avatar_url?: string;
    email?: string;
    phone?: string;
  };
  my_partner?: {
    id: string;
    full_name: string;
    avatar_url?: string;
    email?: string;
    phone?: string;
  };
  opponent_partner?: {
    id: string;
    full_name: string;
    avatar_url?: string;
    email?: string;
    phone?: string;
  };
  booking?: {
    id: string;
    court: string;
    start_time: string;
    end_time: string;
    status: string;
  };
}

const SCORE_PATTERN = /^\\d+-\\d+(?:,\\s*\\d+-\\d+)*$/;

function getPlayerInitial(name?: string) {
  return name?.trim().charAt(0).toUpperCase() || "U";
}

function getWinnerName(challenge: Challenge) {
  if (!challenge.winner_id) return null;
  if (challenge.winner_id === challenge.challenger_id) return challenge.challenger?.full_name || "Sfidante";
  if (challenge.winner_id === challenge.opponent_id) return challenge.opponent?.full_name || "Sfidato";
  return "Vincitore non riconosciuto";
}

function hasChallengeDatePassed(challenge: Challenge) {
  const challengeDateValue = challenge.booking?.start_time || challenge.scheduled_date;
  if (!challengeDateValue) return true;
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
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
    .formatToParts(date)
    .map((part) => {
      if (part.type === "weekday" || part.type === "month") return capitalizeLabel(part.value);
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
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const match = s.match(/^(\\d+)-(\\d+)$/);
      if (!match) return null;
      return { challengerGames: Number(match[1]), opponentGames: Number(match[2]) };
    })
    .filter((s): s is { challengerGames: number; opponentGames: number } => s !== null);

  if (sets.length === 0) return null;

  const challengerSetsWon = sets.reduce((sum, s) => sum + (s.challengerGames > s.opponentGames ? 1 : 0), 0);
  const opponentSetsWon = sets.reduce((sum, s) => sum + (s.opponentGames > s.challengerGames ? 1 : 0), 0);

  if (challengerSetsWon === opponentSetsWon) return null;
  return challengerSetsWon > opponentSetsWon ? challengerId : opponentId;
}

function buildScoreGrid(score?: string) {
  if (!score) return null;
  const sets = score
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const match = s.match(/^(\\d+)-(\\d+)$/);
      if (!match) return null;
      return { winner: Number(match[1]), loser: Number(match[2]) };
    })
    .filter((s): s is { winner: number; loser: number } => s !== null);

  if (sets.length === 0) return null;

  return {
    sets,
    totalWinner: sets.filter((s) => s.winner > s.loser).length,
    totalLoser: sets.filter((s) => s.loser > s.winner).length,
  };
}

export default function AtletaChallengePage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const dashboardBase = pathname.split("/arena")[0];
  const id = Array.isArray(params?.id) ? params?.id[0] : params?.id;

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [userId, setUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [showScoreForm, setShowScoreForm] = useState(false);
  const [score, setScore] = useState("");
  const [savingScore, setSavingScore] = useState(false);

  useEffect(() => {
    if (id) void loadChallengeDetails();
  }, [id]);

  useEffect(() => {
    if (challenge) setScore(challenge.score || "");
  }, [challenge]);

  async function loadChallengeDetails() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    setUserId(user.id);

    try {
      const response = await fetch(\`/api/arena/challenges?challenge_id=\${id}\`);
      if (response.ok) {
        const data = await response.json();
        if (data.challenge) setChallenge(data.challenge);
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

  async function handleChallengeAction(action: "accept" | "decline") {
    if (!challenge) return;
    try {
      const status = action === "accept" ? "accepted" : "declined";
      const response = await fetch("/api/arena/challenges", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challenge_id: challenge.id, status }),
      });
      if (response.ok) loadChallengeDetails();
    } catch (error) {
      console.error("Error updating challenge:", error);
    }
  }

  async function handleCancelChallenge() {
    if (!confirm("Sei sicuro di voler cancellare questa sfida?")) return;
    try {
      const response = await fetch(\`/api/arena/challenges?challenge_id=\${challenge?.id}\`, {
        method: "DELETE",
      });
      if (response.ok) router.push(\`\${dashboardBase}/arena\`);
    } catch (error) {
      console.error("Error cancelling challenge:", error);
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
    const computedWinnerId = getWinnerIdFromScore(normalizedScore, challenge!.challenger_id, challenge!.opponent_id);

    if (!computedWinnerId) {
      alert("Impossibile determinare il vincitore dal punteggio inserito");
      return;
    }

    try {
      setSavingScore(true);
      const response = await fetch(\`/api/arena/challenges?challenge_id=\${id}\`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          winner_id: computedWinnerId,
          score: normalizedScore,
          status: "completed",
        }),
      });

      if (response.ok) {
        alert("Punteggio salvato con successo!");
        setShowScoreForm(false);
        loadChallengeDetails();
      } else {
        const errorData = await response.json();
        alert(\`Errore: \${errorData.error || "Impossibile salvare il punteggio"}\`);
      }
    } catch (error) {
      console.error("Error saving score:", error);
      alert("Errore nel salvataggio del punteggio");
    } finally {
      setSavingScore(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-secondary border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-secondary/60">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-secondary/60">Sfida non trovata</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2.5 text-sm font-medium text-white bg-secondary rounded-md hover:opacity-90 transition-all"
          >
            Torna indietro
          </button>
        </div>
      </div>
    );
  }

  const isChallenger = challenge.challenger_id === userId;
  const opponent = isChallenger ? challenge.opponent : challenge.challenger;
  const isPending = challenge.status === "pending";
  const isCounterProposal = challenge.status === "counter_proposal";
  const canRespond = !isChallenger && isPending;
  const canConfirmCounterProposal = isChallenger && isCounterProposal;
  const isDoubles = isDoublesMatch(challenge.match_type);
  const scoreGrid = buildScoreGrid(challenge.score);
  const winnerIsChallenger = challenge.winner_id === challenge.challenger_id;
  const winnerDisplayName = winnerIsChallenger
    ? \`\${challenge.challenger?.full_name || "Sfidante"}\${isDoubles && challenge.my_partner ? \` / \${challenge.my_partner.full_name}\` : ""}\`
    : \`\${challenge.opponent?.full_name || "Sfidato"}\${isDoubles && challenge.opponent_partner ? \` / \${challenge.opponent_partner.full_name}\` : ""}\`;
  const loserDisplayName = winnerIsChallenger
    ? \`\${challenge.opponent?.full_name || "Sfidato"}\${isDoubles && challenge.opponent_partner ? \` / \${challenge.opponent_partner.full_name}\` : ""}\`
    : \`\${challenge.challenger?.full_name || "Sfidante"}\${isDoubles && challenge.my_partner ? \` / \${challenge.my_partner.full_name}\` : ""}\`;

  const canEnterScore =
    !challenge.winner_id &&
    !showScoreForm &&
    (
      challenge.status === "awaiting_score" ||
      ((challenge.status === "accepted" || challenge.status === "completed") && hasChallengeDatePassed(challenge))
    );

  const challengeTypeColor = challenge.challenge_type === "ranked" ? "var(--secondary)" : "#023047";

  const participantCards = [
    {
      key: challenge.challenger?.id || "challenger",
      participant: challenge.challenger,
      background: "var(--secondary)",
      isChallenger: true,
    },
    ...(isDoubles && challenge.my_partner
      ? [{ key: challenge.my_partner.id, participant: challenge.my_partner, background: "var(--secondary)", isChallenger: true }]
      : []),
    {
      key: challenge.opponent?.id || "opponent",
      participant: challenge.opponent,
      background: "#023047",
      isChallenger: false,
    },
    ...(isDoubles && challenge.opponent_partner
      ? [{ key: challenge.opponent_partner.id, participant: challenge.opponent_partner, background: "#023047", isChallenger: false }]
      : []),
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div>
        <p className="breadcrumb text-secondary/60">
          <Link href={\`\${dashboardBase}/arena\`} className="hover:text-secondary/80 transition-colors">Arena</Link>
          {" › "}
          <span>Dettagli Sfida</span>
        </p>
        <h1 className="text-4xl font-bold text-secondary">Dettagli Sfida</h1>
      </div>

      {/* Challenge Type Header */}
      <div
        className="rounded-xl border-t border-r border-b p-6 border-l-4"
        style={{
          borderLeftColor: challengeTypeColor,
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

      {/* Partecipanti */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
          <h2 className="text-base sm:text-lg font-semibold text-secondary">Partecipanti</h2>
        </div>
        <div className="px-6 py-4">
          <ul className="flex flex-col gap-3">
            {participantCards.map(({ key, participant, background, isChallenger: isParticipantChallenger }) => {
              if (!participant) return null;

              const isAwaitingAcceptance = challenge.status === "pending" && !isParticipantChallenger;
              const bg = isAwaitingAcceptance ? "#9ca3af" : background;
              const setsWon = scoreGrid
                ? (isParticipantChallenger === winnerIsChallenger ? scoreGrid.totalWinner : scoreGrid.totalLoser)
                : null;

              return (
                <li key={key}>
                  <div className="flex items-center gap-4 py-3 px-3 rounded-lg" style={{ background: bg }}>
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
                      <p className="font-semibold text-white text-sm">
                        {participant.full_name}
                        {participant.id === userId && <span className="ml-1 text-white/60 font-normal text-xs">(Tu)</span>}
                      </p>
                      {isAwaitingAcceptance ? (
                        <p className="text-xs text-white/70 mt-0.5">In attesa di accettazione</p>
                      ) : participant.email ? (
                        <p className="text-xs text-white/60 truncate mt-0.5">{participant.email}</p>
                      ) : null}
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
                  <p className="text-secondary font-semibold">{getMatchTypeLabel(challenge.match_type)}</p>
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
                <p className="text-secondary font-semibold">{getStatusLabel(challenge.status)}</p>
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
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
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
                          <tr key={\`set-row-\${index + 1}\`} className="border-t border-gray-200">
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

            {!showScoreForm && !challenge.winner_id && canEnterScore && (
              <button
                onClick={() => setShowScoreForm(true)}
                className="w-full px-6 py-3 text-sm font-medium text-white bg-secondary rounded-lg hover:bg-secondary/90 transition-all flex items-center justify-center gap-2"
              >
                {challenge.status === "awaiting_score" ? "Inserisci Punteggio" : "Inserisci Risultato"}
              </button>
            )}

            {showScoreForm && (
              <div className="space-y-6">
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
                      pattern="\\d+-\\d+(,\\s*\\d+-\\d+)*"
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary"
                    />
                    <p className="text-xs text-secondary/60 mt-2">
                      Inserisci il punteggio nel formato: 6-4, 6-3 oppure 6-4, 3-6, 6-2. Il vincitore viene calcolato automaticamente dai set.
                    </p>
                  </div>
                </div>
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
                      "Salva Risultato"
                    )}
                  </button>
                  <button
                    onClick={() => { setShowScoreForm(false); setScore(challenge.score || ""); }}
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

      {/* Prenotazione Campo */}
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
                  <p className="text-secondary font-semibold">{formatBookingDate(challenge.booking.start_time)}</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Orario</label>
                <div className="flex-1">
                  <p className="text-secondary/70">
                    {new Date(challenge.booking.start_time).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                    {" – "}
                    {new Date(challenge.booking.end_time).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
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

      {/* Messaggio */}
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

      {/* Controproposta ricevuta */}
      {canConfirmCounterProposal && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
            <h2 className="text-base sm:text-lg font-semibold text-secondary">Controproposta Ricevuta</h2>
          </div>
          <div className="px-6 py-6">
            <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <p className="text-sm text-purple-800">
                <strong>{opponent?.full_name}</strong> ha proposto delle modifiche alla tua sfida.
                Rivedi i dettagli e conferma o rifiuta le modifiche.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => handleChallengeAction("accept")}
                className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-3 text-white bg-secondary rounded-lg hover:bg-secondary/90 transition-all font-medium"
              >
                <Check className="h-5 w-5" />
                Conferma Modifiche
              </button>
              <button
                onClick={() => handleChallengeAction("decline")}
                className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-3 text-white bg-[#022431] rounded-lg hover:bg-[#022431]/90 transition-all font-medium"
              >
                <X className="h-5 w-5" />
                Rifiuta Modifiche
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottoni Azione */}
      <div className="flex flex-col sm:flex-row gap-3">
        {challenge.booking?.id && (
          <Link
            href={\`\${dashboardBase}/bookings/\${challenge.booking.id}\`}
            className="flex-1 min-w-[140px] flex items-center justify-center px-6 py-3 text-white bg-[#035f80] rounded-lg hover:bg-[#035f80]/90 transition-all font-medium"
          >
            Prenotazione Campo
          </Link>
        )}
        {canRespond && (
          <>
            <button
              onClick={() => handleChallengeAction("accept")}
              className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-3 text-white bg-secondary rounded-lg hover:bg-secondary/90 transition-all font-medium"
            >
              <Check className="h-5 w-5" />
              Accetta Sfida
            </button>
            <button
              onClick={() => router.push(\`\${dashboardBase}/arena/configure-challenge/\${challenge.challenger_id}?edit=\${challenge.id}&counter=true\`)}
              className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-3 text-secondary bg-white border border-gray-300 rounded-lg hover:bg-secondary hover:text-white hover:border-secondary transition-all font-medium"
            >
              <MessageSquare className="h-5 w-5" />
              Proponi Modifiche
            </button>
            <button
              onClick={() => handleChallengeAction("decline")}
              className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-3 text-white bg-[#022431] rounded-lg hover:bg-[#022431]/90 transition-all font-medium"
            >
              <X className="h-5 w-5" />
              Rifiuta Sfida
            </button>
          </>
        )}
        {isChallenger && isPending && (
          <>
            <button
              onClick={() => router.push(\`\${dashboardBase}/arena/configure-challenge/\${challenge.opponent_id}?edit=\${challenge.id}\`)}
              className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-3 text-white bg-secondary rounded-lg hover:bg-secondary/90 transition-all font-medium"
            >
              <MessageSquare className="h-5 w-5" />
              Modifica Sfida
            </button>
            <button
              onClick={handleCancelChallenge}
              className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-3 text-white bg-[#023b52] rounded-lg hover:bg-[#023b52]/90 transition-all font-medium"
            >
              <X className="h-5 w-5" />
              Cancella Sfida
            </button>
          </>
        )}
      </div>
    </div>
  );
}
`;

fs.writeFileSync(path, content, 'utf8');
console.log('Done. Lines written:', content.split('\n').length);
