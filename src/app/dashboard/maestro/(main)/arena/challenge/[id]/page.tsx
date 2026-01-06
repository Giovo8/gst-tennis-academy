"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Trophy,
  Users,
  MessageSquare,
  Check,
  X,
  Swords,
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

  useEffect(() => {
    if (id) {
      loadChallengeDetails();
    }
  }, [id]);

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
        console.log("Challenge data:", data);
        if (data.challenge) {
          setChallenge(data.challenge);
        }
      } else {
        console.error("Failed to fetch challenge:", response.status);
      }
    } catch (error) {
      console.error("Error loading challenge:", error);
    }

    setLoading(false);
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
        router.push("/dashboard/maestro/arena");
      }, 1500);
    } catch (error: any) {
      console.error("Error submitting result:", error);
      alert(error.message || "Errore nell'invio del risultato");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-12 bg-gray-200 rounded-xl w-48" />
        <div className="h-96 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="text-center py-12">
        <Swords className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Sfida non trovata</p>
        <button
          onClick={() => router.back()}
          className="mt-4 px-4 py-2 bg-frozen-500 text-white rounded-lg hover:bg-frozen-600"
        >
          Torna indietro
        </button>
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
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="h-5 w-5" />
        <span className="font-medium">Torna all'Arena</span>
      </button>

      {/* Challenge Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Status Banner */}
        <div
          className={`px-6 py-4 ${
            challenge.status === "accepted"
              ? "bg-green-50 border-b border-green-100"
              : challenge.status === "pending" || challenge.status === "counter_proposal"
              ? "bg-yellow-50 border-b border-yellow-100"
              : challenge.status === "completed"
              ? "bg-blue-50 border-b border-blue-100"
              : "bg-red-50 border-b border-red-100"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Swords
                className={`h-6 w-6 ${
                  challenge.status === "accepted"
                    ? "text-green-600"
                    : challenge.status === "pending" || challenge.status === "counter_proposal"
                    ? "text-yellow-600"
                    : challenge.status === "completed"
                    ? "text-blue-600"
                    : "text-red-600"
                }`}
              />
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {isChallenger ? "Hai sfidato" : "Sei stato sfidato da"} {opponent?.full_name}
                </h1>
                <p className="text-sm text-gray-600 mt-0.5">
                  Sfida {
                    challenge.status === "pending" 
                      ? "in attesa di conferma" 
                      : challenge.status === "counter_proposal"
                      ? "modificata dall'avversario - in attesa della tua conferma"
                      : challenge.status === "accepted" 
                      ? "accettata" 
                      : challenge.status === "completed" 
                      ? "completata" 
                      : "rifiutata"
                  }
                </p>
              </div>
            </div>
            <span
              className={`px-4 py-2 rounded-full font-semibold text-sm ${
                challenge.status === "accepted"
                  ? "bg-green-100 text-green-700"
                  : challenge.status === "pending" || challenge.status === "counter_proposal"
                  ? "bg-yellow-100 text-yellow-700"
                  : challenge.status === "completed"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {challenge.status === "accepted"
                ? "Accettata"
                : challenge.status === "pending"
                ? "In attesa"
                : challenge.status === "counter_proposal"
                ? "Modificata"
                : challenge.status === "completed"
                ? "Completata"
                : "Rifiutata"}
            </span>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6 space-y-6">
          {/* Players */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-frozen-500" />
              Giocatori
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Challenger */}
              <div className="p-4 bg-frozen-50 rounded-lg border border-frozen-200">
                <p className="text-xs font-medium text-frozen-600 mb-2">SFIDANTE</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-frozen-100 flex items-center justify-center overflow-hidden">
                    {challenge.challenger?.avatar_url ? (
                      <img
                        src={challenge.challenger.avatar_url}
                        alt={challenge.challenger.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="font-bold text-frozen-700 text-lg">
                        {challenge.challenger?.full_name?.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{challenge.challenger?.full_name}</p>
                    {isChallenger && (
                      <span className="text-xs text-frozen-600 font-medium">(Tu)</span>
                    )}
                  </div>
                </div>
                {challenge.match_type === "doubles" && challenge.my_partner && (
                  <div className="mt-3 pt-3 border-t border-frozen-200">
                    <p className="text-xs font-medium text-frozen-600 mb-2">PARTNER</p>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-frozen-100 flex items-center justify-center overflow-hidden">
                        {challenge.my_partner?.avatar_url ? (
                          <img
                            src={challenge.my_partner.avatar_url}
                            alt={challenge.my_partner.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="font-bold text-frozen-700 text-sm">
                            {challenge.my_partner?.full_name?.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-gray-900">
                        {challenge.my_partner?.full_name}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Opponent */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs font-medium text-gray-600 mb-2">SFIDATO</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                    {challenge.opponent?.avatar_url ? (
                      <img
                        src={challenge.opponent.avatar_url}
                        alt={challenge.opponent.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="font-bold text-gray-700 text-lg">
                        {challenge.opponent?.full_name?.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{challenge.opponent?.full_name}</p>
                    {!isChallenger && (
                      <span className="text-xs text-gray-600 font-medium">(Tu)</span>
                    )}
                  </div>
                </div>
                {challenge.match_type === "doubles" && challenge.opponent_partner && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs font-medium text-gray-600 mb-2">PARTNER</p>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                        {challenge.opponent_partner?.avatar_url ? (
                          <img
                            src={challenge.opponent_partner.avatar_url}
                            alt={challenge.opponent_partner.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="font-bold text-gray-700 text-sm">
                            {challenge.opponent_partner?.full_name?.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-gray-900">
                        {challenge.opponent_partner?.full_name}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Match Details */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              Dettagli Match
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {challenge.match_type && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs font-medium text-gray-600 mb-1">TIPO MATCH</p>
                  <p className="text-lg font-bold text-gray-900">
                    {challenge.match_type === "singles" ? "Singolo" : "Doppio"}
                  </p>
                </div>
              )}
              {challenge.match_format && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs font-medium text-gray-600 mb-1">FORMATO</p>
                  <p className="text-lg font-bold text-gray-900">{challenge.match_format}</p>
                </div>
              )}
              {challenge.challenge_type && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs font-medium text-gray-600 mb-1">TIPO SFIDA</p>
                  <p className="text-lg font-bold text-gray-900">
                    {challenge.challenge_type === "ranked" ? "Classificata" : "Amichevole"}
                  </p>
                </div>
              )}
              {challenge.duration_minutes && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs font-medium text-gray-600 mb-1">DURATA STIMATA</p>
                  <p className="text-lg font-bold text-gray-900">
                    {challenge.duration_minutes} minuti
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Booking Info */}
          {challenge.booking && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-green-500" />
                Prenotazione Campo
              </h2>
              {!challenge.booking.manager_confirmed && (
                <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-amber-800">In attesa di conferma</h3>
                      <p className="mt-1 text-sm text-amber-700">
                        La prenotazione del campo è stata creata ma è in attesa di conferma da parte del gestore/amministratore. Riceverai una notifica quando verrà confermata.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {challenge.booking.manager_confirmed && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <Check className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-green-800">Prenotazione confermata</h3>
                      <p className="mt-1 text-sm text-green-700">
                        Il gestore ha confermato la prenotazione del campo. Puoi presentarti all'orario indicato.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs font-medium text-green-600 mb-1">DATA</p>
                    <p className="text-sm font-bold text-gray-900">
                      {new Date(challenge.booking.start_time).toLocaleDateString("it-IT", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-green-600 mb-1">ORARIO</p>
                    <p className="text-sm font-bold text-gray-900">
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
                  <div>
                    <p className="text-xs font-medium text-green-600 mb-1">CAMPO</p>
                    <p className="text-sm font-bold text-gray-900">{challenge.booking.court}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Message */}
          {challenge.message && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-500" />
                Messaggio
              </h2>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-gray-900 italic">"{challenge.message}"</p>
              </div>
            </div>
          )}

          {/* Actions */}
          {canRespond && (
            <div className="space-y-3 pt-4 border-t">
              <div className="flex gap-3">
                <button
                  onClick={() => handleChallengeAction("accept")}
                  className="flex-1 px-6 py-3 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Check className="h-5 w-5" />
                  Accetta Sfida
                </button>
                <button
                  onClick={() => handleChallengeAction("decline")}
                  className="flex-1 px-6 py-3 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                >
                  <X className="h-5 w-5" />
                  Rifiuta Sfida
                </button>
              </div>
              <button
                onClick={() => router.push(`/dashboard/maestro/arena/configure-challenge/${challenge.challenger_id}?edit=${challenge.id}&counter=true`)}
                className="w-full px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
              >
                <MessageSquare className="h-5 w-5" />
                Proponi Modifiche
              </button>
            </div>
          )}

          {/* Edit Challenge - For challenger when pending */}
          {isChallenger && isPending && (
            <div className="flex gap-3 pt-4 border-t">
              <button
                onClick={() => router.push(`/dashboard/maestro/arena/configure-challenge/${challenge.opponent_id}?edit=${challenge.id}`)}
                className="flex-1 px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
              >
                <MessageSquare className="h-5 w-5" />
                Modifica Sfida
              </button>
              <button
                onClick={() => {
                  if (confirm("Sei sicuro di voler cancellare questa sfida?")) {
                    fetch(`/api/arena/challenges?challenge_id=${challenge.id}`, {
                      method: "DELETE",
                    }).then(() => router.push("/dashboard/maestro/arena"));
                  }
                }}
                className="px-6 py-3 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
              >
                <X className="h-5 w-5" />
                Cancella
              </button>
            </div>
          )}

          {/* Confirm Counter Proposal - For challenger when opponent modified */}
          {canConfirmCounterProposal && (
            <div className="space-y-3 pt-4 border-t">
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm text-gray-900">
                  ⚠️ <strong>{opponent?.full_name}</strong> ha proposto delle modifiche alla tua sfida. 
                  Rivedi i dettagli qui sopra e conferma o rifiuta le modifiche.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleChallengeAction("accept")}
                  className="flex-1 px-6 py-3 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Check className="h-5 w-5" />
                  Conferma Modifiche
                </button>
                <button
                  onClick={() => handleChallengeAction("decline")}
                  className="flex-1 px-6 py-3 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                >
                  <X className="h-5 w-5" />
                  Rifiuta Modifiche
                </button>
              </div>
            </div>
          )}

          {/* Submit Result - For accepted challenges */}
          {challenge.status === "accepted" && (
            <div className="flex gap-3 pt-4 border-t">
              <button
                onClick={() => setShowResultModal(true)}
                className="flex-1 px-6 py-3 bg-frozen-500 text-white font-semibold rounded-lg hover:bg-frozen-600 transition-colors flex items-center justify-center gap-2"
              >
                <Trophy className="h-5 w-5" />
                Inserisci Risultato
              </button>
            </div>
          )}

          {/* Winner Display - For completed challenges */}
          {challenge.status === "completed" && challenge.winner_id && (
            <div className="pt-4 border-t">
              <div className="p-4 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg border-2 border-amber-300">
                <div className="flex items-center gap-3">
                  <Trophy className="h-8 w-8 text-amber-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Vincitore</p>
                    <p className="text-xl font-bold text-gray-900">
                      {challenge.winner_id === challenge.challenger_id
                        ? challenge.challenger?.full_name
                        : challenge.opponent?.full_name}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Result Modal */}
      {showResultModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Trophy className="h-6 w-6 text-amber-500" />
              Inserisci Risultato
            </h3>

            <div className="space-y-4">
              {/* Winner Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chi ha vinto? <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Nel tennis non ci possono essere pareggi - devi selezionare un vincitore
                </p>
                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedWinner(challenge.challenger_id)}
                    className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                      selectedWinner === challenge.challenger_id
                        ? "border-frozen-500 bg-frozen-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <p className="font-semibold text-gray-900">
                      {challenge.challenger?.full_name}
                      {challenge.challenger_id === userId && " (Tu)"}
                    </p>
                  </button>
                  <button
                    onClick={() => setSelectedWinner(challenge.opponent_id)}
                    className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                      selectedWinner === challenge.opponent_id
                        ? "border-frozen-500 bg-frozen-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <p className="font-semibold text-gray-900">
                      {challenge.opponent?.full_name}
                      {challenge.opponent_id === userId && " (Tu)"}
                    </p>
                  </button>
                </div>
              </div>

              {/* Score Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Punteggio (opzionale)
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Inserisci il punteggio dei set (es: 6-4, 6-3 oppure 7-5, 3-6, 6-2)
                </p>
                <input
                  type="text"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  placeholder="es: 6-4, 6-3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-frozen-500 focus:border-transparent"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowResultModal(false);
                    setScore("");
                    setSelectedWinner("");
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={handleSubmitResult}
                  disabled={!selectedWinner}
                  className="flex-1 px-4 py-2 text-white bg-frozen-500 rounded-lg hover:bg-frozen-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Conferma
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Additional Info */}
      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
        <p>
          <strong>Creata il:</strong>{" "}
          {new Date(challenge.created_at).toLocaleString("it-IT", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}
