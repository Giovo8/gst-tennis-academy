"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import {
  Check,
  X,
  Trophy,
  MessageSquare,
  Shield,
  Star,
} from "lucide-react";

interface Challenge {
  id: string;
  challenger_id: string;
  opponent_id: string;
  status: "pending" | "accepted" | "declined" | "completed" | "cancelled" | "counter_proposal";
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
  };
  opponent?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  my_partner?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  opponent_partner?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  booking?: {
    id: string;
    court: string;
    start_time: string;
    end_time: string;
    status: string;
    manager_confirmed: boolean;
  };
}

function getStatusLabel(status: string): string {
  const statusMap: Record<string, string> = {
    pending: "In Attesa",
    accepted: "Accettata",
    declined: "Rifiutata",
    completed: "Completata",
    cancelled: "Cancellata",
    counter_proposal: "Controproposta",
  };
  return statusMap[status] || status;
}

export default function ChallengePage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params?.id) ? params?.id[0] : params?.id;

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [userId, setUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [showResultModal, setShowResultModal] = useState(false);
  const [score, setScore] = useState("");
  const [selectedWinner, setSelectedWinner] = useState<string>("");
  const [savingResult, setSavingResult] = useState(false);

  useEffect(() => {
    if (id) {
      loadChallengeDetails();
    }
  }, [id]);

  useEffect(() => {
    if (challenge) {
      setSelectedWinner(challenge.winner_id || "");
      setScore(challenge.score || "");
    }
  }, [challenge]);

  async function loadChallengeDetails() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    setUserId(user.id);

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

  async function handleChallengeAction(action: "accept" | "decline") {
    if (!challenge) return;

    try {
      const status = action === "accept" ? "accepted" : "declined";
      const response = await fetch("/api/arena/challenges", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challenge_id: challenge.id, status }),
      });

      if (response.ok) {
        loadChallengeDetails();
      }
    } catch (error) {
      console.error("Error updating challenge:", error);
    }
  }

  async function handleSubmitResult() {
    if (!selectedWinner) {
      alert("Nel tennis non ci possono essere pareggi. Devi selezionare un vincitore.");
      return;
    }

    try {
      setSavingResult(true);
      const response = await fetch("/api/arena/challenges", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenge_id: challenge?.id,
          status: "completed",
          winner_id: selectedWinner,
          score: score || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Errore nell'invio del risultato");
      }

      setShowResultModal(false);
      alert("Risultato registrato con successo! Le statistiche verranno aggiornate.");
      setTimeout(() => {
        router.push("/dashboard/atleta/arena");
      }, 1500);
    } catch (error: any) {
      console.error("Error submitting result:", error);
      alert(error.message || "Errore nell'invio del risultato");
    } finally {
      setSavingResult(false);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <p className="breadcrumb text-secondary/60 uppercase">
            <button
              onClick={() => router.push('/dashboard/atleta/arena')}
              className="hover:text-secondary/80 transition-colors uppercase"
            >
              Arena
            </button>
            {" › "}
            <span className="uppercase">Dettagli Sfida</span>
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-secondary">Dettagli Sfida</h1>
          <p className="text-secondary/70 text-sm mt-1">
            Visualizza i dettagli della sfida arena
          </p>
        </div>
      </div>

      {/* Challenge Type Header */}
      <div
        className="bg-secondary rounded-xl border-t border-r border-b border-secondary p-6 border-l-4"
        style={{ borderLeftColor: (() => {
          if (challenge.status === "completed") return "#10b981";
          if (challenge.status === "pending") return "#f59e0b";
          if (challenge.status === "accepted") return "#3b82f6";
          if (challenge.status === "declined" || challenge.status === "cancelled") return "#ef4444";
          return "#8b5cf6";
        })() }}
      >
        <div className="flex items-start gap-6">
          {challenge.challenge_type === "ranked" ? (
            <Shield className="h-8 w-8 text-white flex-shrink-0" strokeWidth={2.5} />
          ) : (
            <Star className="h-8 w-8 text-white flex-shrink-0" strokeWidth={2.5} />
          )}
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white">
              {challenge.challenge_type === "ranked" ? "Sfida Classificata" : "Sfida Amichevole"}
            </h2>
          </div>
        </div>
      </div>

      {/* Players */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Challenger */}
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-secondary mb-4">Sfidante</h3>
          <div className="p-4 border border-gray-100 border-l-4 border-l-secondary rounded-md bg-secondary">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-white text-secondary flex items-center justify-center overflow-hidden">
                {challenge.challenger?.avatar_url ? (
                  <img
                    src={challenge.challenger.avatar_url}
                    alt={challenge.challenger.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="font-bold text-lg">
                    {challenge.challenger?.full_name?.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <p className="font-bold text-white">{challenge.challenger?.full_name}</p>
                {challenge.challenger_id === userId && (
                  <span className="text-xs text-white/70 font-medium">(Tu)</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Challenger Partner - Only for doubles */}
        {challenge.match_type === "doubles" && (
          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-secondary mb-4">Partner Sfidante</h3>
            <div className="p-4 border border-gray-100 border-l-4 border-l-secondary rounded-md bg-secondary">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-white text-secondary flex items-center justify-center overflow-hidden">
                  {challenge.my_partner?.avatar_url ? (
                    <img
                      src={challenge.my_partner.avatar_url}
                      alt={challenge.my_partner.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="font-bold text-lg">
                      {challenge.my_partner?.full_name?.charAt(0).toUpperCase() || "?"}
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-bold text-white">
                    {challenge.my_partner?.full_name || "Non assegnato"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Opponent */}
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-secondary mb-4">Avversario</h3>
          <div className="p-4 border border-gray-100 border-l-4 border-l-secondary rounded-md bg-secondary">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-white text-secondary flex items-center justify-center overflow-hidden">
                {challenge.opponent?.avatar_url ? (
                  <img
                    src={challenge.opponent.avatar_url}
                    alt={challenge.opponent.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="font-bold text-lg">
                    {challenge.opponent?.full_name?.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <p className="font-bold text-white">{challenge.opponent?.full_name}</p>
                {challenge.opponent_id === userId && (
                  <span className="text-xs text-white/70 font-medium">(Tu)</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Opponent Partner - Only for doubles */}
        {challenge.match_type === "doubles" && (
          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-secondary mb-4">Partner Avversario</h3>
            <div className="p-4 border border-gray-100 border-l-4 border-l-secondary rounded-md bg-secondary">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-white text-secondary flex items-center justify-center overflow-hidden">
                  {challenge.opponent_partner?.avatar_url ? (
                    <img
                      src={challenge.opponent_partner.avatar_url}
                      alt={challenge.opponent_partner.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="font-bold text-lg">
                      {challenge.opponent_partner?.full_name?.charAt(0).toUpperCase() || "?"}
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-bold text-white">
                    {challenge.opponent_partner?.full_name || "Non assegnato"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Match Details */}
      <div className="bg-white rounded-xl p-6">
        <h2 className="text-lg font-semibold text-secondary mb-6">Dettagli Match</h2>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pt-6 pb-6 border-b border-gray-200">
            <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Stato</label>
            <div className="flex-1">
              <p className="text-secondary font-semibold">
                {getStatusLabel(challenge.status)}
              </p>
            </div>
          </div>
          {challenge.match_type && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Tipo Match</label>
              <div className="flex-1">
                <p className="text-secondary font-semibold">
                  {challenge.match_type === "singles" ? "Singolo" : "Doppio"}
                </p>
              </div>
            </div>
          )}
          {challenge.match_format && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Formato</label>
              <div className="flex-1">
                <p className="text-secondary/70">{challenge.match_format}</p>
              </div>
            </div>
          )}
          {challenge.challenge_type && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Tipo Sfida</label>
              <div className="flex-1">
                <p className="text-secondary font-semibold">
                  {challenge.challenge_type === "ranked" ? "Classificata" : "Amichevole"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Winner Display - For completed challenges */}
        {challenge.status === "completed" && challenge.winner_id && !showResultModal && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8">
              <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Vincitore</label>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <Trophy className="h-6 w-6 text-amber-500" />
                  <p className="text-secondary font-bold text-lg">
                    {challenge.winner_id === challenge.challenger_id
                      ? challenge.challenger?.full_name
                      : challenge.opponent?.full_name}
                  </p>
                </div>
                {challenge.score && (
                  <p className="text-sm text-secondary/70 mt-2">Score: {challenge.score}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Submit Result Button - For accepted challenges */}
        {challenge.status === "accepted" && !showResultModal && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={() => setShowResultModal(true)}
              className="px-4 py-2.5 text-sm font-medium text-white bg-secondary rounded-md hover:opacity-90 transition-all flex items-center gap-2"
            >
              <Trophy className="h-4 w-4" />
              Inserisci Risultato
            </button>
          </div>
        )}

        {/* Result Form - Inline like admin */}
        {showResultModal && (
          <div className="mt-6 pt-6 border-t border-gray-200 space-y-6">
            <h3 className="text-md font-semibold text-secondary">Risultato Match</h3>

            {/* Winner Selection */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
              <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
                Vincitore *
              </label>
              <div className="flex-1 space-y-3">
                <p className="text-xs text-secondary/60 mb-3">
                  Nel tennis non ci possono essere pareggi - devi selezionare un vincitore
                </p>

                {/* Team Sfidante */}
                <button
                  type="button"
                  onClick={() => setSelectedWinner(challenge.challenger_id)}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                    selectedWinner === challenge.challenger_id
                      ? "border-secondary bg-secondary/5"
                      : "border-gray-200 hover:border-secondary/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedWinner === challenge.challenger_id
                        ? "border-secondary bg-secondary"
                        : "border-gray-300"
                    }`}>
                      {selectedWinner === challenge.challenger_id && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-secondary">
                        {challenge.challenger?.full_name}
                        {challenge.challenger_id === userId && " (Tu)"}
                        {challenge.match_type === "doubles" && challenge.my_partner && (
                          <span className="font-normal"> / {challenge.my_partner.full_name}</span>
                        )}
                      </p>
                      <p className="text-xs text-secondary/60">Sfidante</p>
                    </div>
                  </div>
                </button>

                {/* Team Sfidato */}
                <button
                  type="button"
                  onClick={() => setSelectedWinner(challenge.opponent_id)}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                    selectedWinner === challenge.opponent_id
                      ? "border-secondary bg-secondary/5"
                      : "border-gray-200 hover:border-secondary/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedWinner === challenge.opponent_id
                        ? "border-secondary bg-secondary"
                        : "border-gray-300"
                    }`}>
                      {selectedWinner === challenge.opponent_id && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-secondary">
                        {challenge.opponent?.full_name}
                        {challenge.opponent_id === userId && " (Tu)"}
                        {challenge.match_type === "doubles" && challenge.opponent_partner && (
                          <span className="font-normal"> / {challenge.opponent_partner.full_name}</span>
                        )}
                      </p>
                      <p className="text-xs text-secondary/60">Sfidato</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Score Input */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
              <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
                Punteggio (opzionale)
              </label>
              <div className="flex-1">
                <input
                  type="text"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  placeholder="es: 6-4, 6-3"
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary"
                />
                <p className="text-xs text-secondary/60 mt-2">
                  Inserisci il punteggio nel formato: 6-4, 6-3 oppure 6-4, 3-6, 6-2
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleSubmitResult}
                disabled={savingResult || !selectedWinner}
                className="px-4 py-2.5 text-sm font-medium text-white bg-secondary rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                {savingResult ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Salvataggio...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Conferma Risultato
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowResultModal(false);
                  setSelectedWinner(challenge.winner_id || "");
                  setScore(challenge.score || "");
                }}
                disabled={savingResult}
                className="px-4 py-2.5 text-sm font-medium text-secondary bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Annulla
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Booking Info */}
      {challenge.booking && (
        <div className="bg-white rounded-xl p-6">
          <h2 className="text-lg font-semibold text-secondary mb-6">Prenotazione Campo</h2>


          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pt-6 pb-6 border-b border-gray-200">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Data</label>
              <div className="flex-1">
                <p className="text-secondary font-semibold">
                  {new Date(challenge.booking.start_time).toLocaleDateString("it-IT", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
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
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Campo</label>
              <div className="flex-1">
                <p className="text-secondary font-semibold">{challenge.booking.court}</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Stato</label>
              <div className="flex-1">
                <p className="text-secondary font-semibold">
                  {challenge.booking.manager_confirmed === true ? "Confermata" : "In attesa di conferma"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Message */}
      {challenge.message && (
        <div className="bg-white rounded-xl p-6">
          <h2 className="text-lg font-semibold text-secondary mb-6">Messaggio</h2>
          <div className="p-4 bg-secondary/5 rounded-lg">
            <p className="text-secondary italic">"{challenge.message}"</p>
          </div>
        </div>
      )}

      {/* Actions for Pending Challenges - Opponent can accept/decline */}
      {canRespond && (
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => handleChallengeAction("accept")}
            className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-3 text-white bg-secondary rounded-lg hover:bg-secondary/90 transition-all font-medium"
          >
            <Check className="h-5 w-5" />
            Accetta Sfida
          </button>
          <button
            onClick={() => handleChallengeAction("decline")}
            className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-3 text-white bg-[#022431] rounded-lg hover:bg-[#022431]/90 transition-all font-medium"
          >
            <X className="h-5 w-5" />
            Rifiuta Sfida
          </button>
          <button
            onClick={() => router.push(`/dashboard/atleta/arena/configure-challenge/${challenge.challenger_id}?edit=${challenge.id}&counter=true`)}
            className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-3 text-secondary bg-white border border-gray-300 rounded-lg hover:bg-secondary hover:text-white hover:border-secondary transition-all font-medium"
          >
            <MessageSquare className="h-5 w-5" />
            Proponi Modifiche
          </button>
        </div>
      )}

      {/* Actions for Pending Challenges - Challenger can edit/cancel */}
      {isChallenger && isPending && (
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => router.push(`/dashboard/atleta/arena/configure-challenge/${challenge.opponent_id}?edit=${challenge.id}`)}
            className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-3 text-white bg-secondary rounded-lg hover:bg-secondary/90 transition-all font-medium"
          >
            <MessageSquare className="h-5 w-5" />
            Modifica Sfida
          </button>
          <button
            onClick={() => {
              if (confirm("Sei sicuro di voler cancellare questa sfida?")) {
                fetch(`/api/arena/challenges?challenge_id=${challenge.id}`, {
                  method: "DELETE",
                }).then(() => router.push("/dashboard/atleta/arena"));
              }
            }}
            className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-3 text-white bg-[#022431] rounded-lg hover:bg-[#022431]/90 transition-all font-medium"
          >
            <X className="h-5 w-5" />
            Cancella Sfida
          </button>
        </div>
      )}

      {/* Confirm Counter Proposal */}
      {canConfirmCounterProposal && (
        <div className="bg-white rounded-xl p-6">
          <h2 className="text-lg font-semibold text-secondary mb-4">Controproposta Ricevuta</h2>
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
      )}
    </div>
  );
}
