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
  Edit,
  Trash2,
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

export default function AdminChallengeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params?.id) ? params?.id[0] : params?.id;

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadChallengeDetails();
    }
  }, [id]);

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

  async function handleUpdateStatus(newStatus: string) {
    if (!challenge) return;

    try {
      const response = await fetch("/api/arena/challenges", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challenge_id: challenge.id, status: newStatus }),
      });

      if (response.ok) {
        loadChallengeDetails();
      }
    } catch (error) {
      console.error("Error updating challenge:", error);
    }
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
      }
    } catch (error) {
      console.error("Error deleting challenge:", error);
    }
  }

  async function handleConfirmBooking() {
    if (!challenge?.booking_id) return;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch(`/api/bookings/${challenge.booking_id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          manager_confirmed: true,
        }),
      });

      if (response.ok) {
        loadChallengeDetails();
        alert("✅ Prenotazione confermata!");
      }
    } catch (error) {
      console.error("Error confirming booking:", error);
      alert("❌ Errore nella conferma della prenotazione");
    }
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      pending: { label: "In Attesa", className: "bg-yellow-100 text-yellow-800" },
      accepted: { label: "Accettata", className: "bg-green-100 text-green-800" },
      declined: { label: "Rifiutata", className: "bg-red-100 text-red-800" },
      completed: { label: "Completata", className: "bg-blue-100 text-blue-800" },
      cancelled: { label: "Cancellata", className: "bg-gray-100 text-gray-800" },
      counter_proposal: { label: "Controproposta", className: "bg-purple-100 text-purple-800" },
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
          <Swords className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">Sfida non trovata</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Swords className="h-8 w-8 text-orange-500" />
              Dettagli Sfida
            </h1>
            <p className="text-gray-600 mt-1">ID: {challenge.id}</p>
          </div>
        </div>
        <button
          onClick={handleDelete}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
        >
          <Trash2 className="h-4 w-4" />
          Elimina
        </button>
      </div>

      {/* Status Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Stato Sfida</h2>
          {getStatusBadge(challenge.status)}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => handleUpdateStatus("pending")}
            className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition-colors text-sm font-medium"
          >
            In Attesa
          </button>
          <button
            onClick={() => handleUpdateStatus("accepted")}
            className="px-4 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium"
          >
            Accettata
          </button>
          <button
            onClick={() => handleUpdateStatus("declined")}
            className="px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
          >
            Rifiutata
          </button>
          <button
            onClick={() => handleUpdateStatus("cancelled")}
            className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
          >
            Cancellata
          </button>
        </div>
      </div>

      {/* Players */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-orange-500" />
          Giocatori
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Challenger */}
          <div className="p-4 bg-frozen-50 rounded-lg border border-frozen-200">
            <p className="text-xs font-medium text-frozen-600 mb-2">SFIDANTE</p>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-frozen-200 flex items-center justify-center overflow-hidden">
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
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
              <p className="text-lg font-bold text-gray-900">{challenge.duration_minutes} minuti</p>
            </div>
          )}
        </div>

        {challenge.winner_id && (
          <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-xs font-medium text-green-600 mb-1">VINCITORE</p>
            <p className="text-lg font-bold text-green-900">
              {challenge.winner_id === challenge.challenger_id
                ? challenge.challenger?.full_name
                : challenge.opponent?.full_name}
            </p>
            {challenge.score && (
              <p className="text-sm text-green-700 mt-1">Score: {challenge.score}</p>
            )}
          </div>
        )}
      </div>

      {/* Booking Info */}
      {challenge.booking && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-500" />
              Prenotazione Campo
            </h2>
            {!challenge.booking.manager_confirmed && (
              <button
                onClick={handleConfirmBooking}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <Check className="h-4 w-4" />
                Conferma Prenotazione
              </button>
            )}
          </div>

          {!challenge.booking.manager_confirmed && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <svg className="h-5 w-5 text-amber-600 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <h3 className="text-sm font-semibold text-amber-800">In attesa di conferma</h3>
                  <p className="mt-1 text-sm text-amber-700">
                    La prenotazione del campo è in attesa della tua conferma come gestore.
                  </p>
                </div>
              </div>
            </div>
          )}

          {challenge.booking.manager_confirmed && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-semibold text-green-800">Prenotazione confermata</h3>
                  <p className="mt-1 text-sm text-green-700">
                    La prenotazione del campo è stata confermata.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs font-medium text-gray-600 mb-1">DATA</p>
              <p className="text-sm font-bold text-gray-900">
                {new Date(challenge.booking.start_time).toLocaleDateString("it-IT", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs font-medium text-gray-600 mb-1">ORARIO</p>
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
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs font-medium text-gray-600 mb-1">CAMPO</p>
              <p className="text-sm font-bold text-gray-900">{challenge.booking.court}</p>
            </div>
          </div>
        </div>
      )}

      {/* Message */}
      {challenge.message && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-500" />
            Messaggio
          </h2>
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-gray-900 italic">"{challenge.message}"</p>
          </div>
        </div>
      )}
    </div>
  );
}
