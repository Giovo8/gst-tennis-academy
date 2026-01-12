"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import {
  Check,
  Trash2,
  AlertCircle,
  Edit,
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
          <p className="text-secondary/60">Sfida non trovata</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="inline-flex items-center text-xs font-semibold text-secondary/60 uppercase tracking-wider mb-1">
        <button
          onClick={() => router.push('/dashboard/admin/arena')}
          className="hover:text-secondary/80 transition-colors"
        >
          GESTIONE ARENA
        </button>
        <span className="mx-2">›</span>
        <span>DETTAGLI SFIDA</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-secondary mb-2">Dettagli Sfida</h1>
          <p className="text-secondary/70 font-medium">
            Visualizza e gestisci i dettagli della sfida arena
          </p>
        </div>
        <div className="flex items-center gap-3">
          {challenge.booking && !challenge.booking.manager_confirmed && (
            <button
              onClick={handleConfirmBooking}
              className="px-4 py-2.5 text-sm font-medium text-white bg-secondary rounded-md hover:opacity-90 transition-all flex items-center gap-2"
            >
              <Check className="h-4 w-4" />
              Conferma Prenotazione
            </button>
          )}
          <button
            onClick={() => router.push(`/dashboard/admin/arena/challenge/${id}/edit`)}
            className="p-2.5 text-secondary/70 bg-white rounded-md hover:bg-secondary hover:text-white transition-all"
            title="Modifica"
          >
            <Edit className="h-5 w-5" />
          </button>
          <button
            onClick={handleDelete}
            className="p-2.5 text-secondary/70 bg-white rounded-md hover:bg-red-600 hover:text-white transition-all"
            title="Elimina"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Players */}
      <div className="bg-white rounded-xl p-6">
        <h2 className="text-lg font-semibold text-secondary mb-6">Giocatori</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Challenger */}
          <div className="p-4 border-l-4 border-secondary rounded-md bg-white">
            <p className="text-xs font-medium text-secondary/60 mb-2">SFIDANTE</p>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-secondary text-white flex items-center justify-center overflow-hidden">
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
                <p className="font-bold text-secondary">{challenge.challenger?.full_name}</p>
              </div>
            </div>
            {challenge.match_type === "doubles" && challenge.my_partner && (
              <div className="mt-3 pt-3 border-t border-secondary/10">
                <p className="text-xs font-medium text-secondary/60 mb-2">PARTNER</p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-secondary text-white flex items-center justify-center overflow-hidden">
                    {challenge.my_partner?.avatar_url ? (
                      <img
                        src={challenge.my_partner.avatar_url}
                        alt={challenge.my_partner.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="font-bold text-sm">
                        {challenge.my_partner?.full_name?.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-secondary">
                    {challenge.my_partner?.full_name}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Opponent */}
          <div className="p-4 border-l-4 border-secondary/40 rounded-md bg-white">
            <p className="text-xs font-medium text-secondary/60 mb-2">SFIDATO</p>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-secondary text-white flex items-center justify-center overflow-hidden">
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
                <p className="font-bold text-secondary">{challenge.opponent?.full_name}</p>
              </div>
            </div>
            {challenge.match_type === "doubles" && challenge.opponent_partner && (
              <div className="mt-3 pt-3 border-t border-secondary/10">
                <p className="text-xs font-medium text-secondary/60 mb-2">PARTNER</p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-secondary text-white flex items-center justify-center overflow-hidden">
                    {challenge.opponent_partner?.avatar_url ? (
                      <img
                        src={challenge.opponent_partner.avatar_url}
                        alt={challenge.opponent_partner.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="font-bold text-sm">
                        {challenge.opponent_partner?.full_name?.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-secondary">
                    {challenge.opponent_partner?.full_name}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Match Details */}
      <div className="bg-white rounded-xl p-6">
        <h2 className="text-lg font-semibold text-secondary mb-6">Dettagli Match</h2>
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-start gap-3 sm:gap-4 md:gap-8 pb-4 sm:pb-6 border-b border-gray-200">
            <label className="w-full md:w-48 pt-0 md:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Stato</label>
            <div className="flex-1">
              <p className="text-secondary font-semibold">
                {getStatusLabel(challenge.status)}
              </p>
            </div>
          </div>
          {challenge.match_type && (
            <div className="flex flex-col md:flex-row md:items-start gap-3 sm:gap-4 md:gap-8 pb-4 sm:pb-6 border-b border-gray-200">
              <label className="w-full md:w-48 pt-0 md:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Tipo Match</label>
              <div className="flex-1">
                <p className="text-secondary font-semibold">
                  {challenge.match_type === "singles" ? "Singolo" : "Doppio"}
                </p>
              </div>
            </div>
          )}
          {challenge.match_format && (
            <div className="flex flex-col md:flex-row md:items-start gap-3 sm:gap-4 md:gap-8 pb-4 sm:pb-6 border-b border-gray-200">
              <label className="w-full md:w-48 pt-0 md:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Formato</label>
              <div className="flex-1">
                <p className="text-secondary/70">{challenge.match_format}</p>
              </div>
            </div>
          )}
          {challenge.challenge_type && (
            <div className="flex items-start gap-8">
              <label className="w-full md:w-48 pt-0 md:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Tipo Sfida</label>
              <div className="flex-1">
                <p className="text-secondary font-semibold">
                  {challenge.challenge_type === "ranked" ? "Classificata" : "Amichevole"}
                </p>
              </div>
            </div>
          )}
        </div>

        {challenge.winner_id && (
          <div className="mt-6 flex items-start gap-8 pt-6 border-t border-gray-200">
            <label className="w-full md:w-48 pt-0 md:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Vincitore</label>
            <div className="flex-1">
              <p className="text-secondary font-bold">
                {challenge.winner_id === challenge.challenger_id
                  ? challenge.challenger?.full_name
                  : challenge.opponent?.full_name}
              </p>
              {challenge.score && (
                <p className="text-sm text-secondary/70 mt-1">Score: {challenge.score}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Info Giocatori */}
      <div className="bg-white rounded-xl p-6">
        <h2 className="text-lg font-semibold text-secondary mb-6">Info Giocatori</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Sfidante */}
          <div className="space-y-6">
            <div>
              <p className="text-xs font-medium text-secondary/60 uppercase mb-3">Sfidante</p>
              <div className="space-y-4">
                <div className="flex items-start gap-8">
                  <label className="w-32 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Nome</label>
                  <div className="flex-1">
                    <p className="text-secondary font-semibold">{challenge.challenger?.full_name || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-8">
                  <label className="w-32 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Email</label>
                  <div className="flex-1">
                    <p className="text-secondary/70">{challenge.challenger?.email || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-8">
                  <label className="w-32 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Telefono</label>
                  <div className="flex-1">
                    <p className="text-secondary/70">{challenge.challenger?.phone || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-8">
                  <label className="w-32 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Rank</label>
                  <div className="flex-1">
                    <p className="text-secondary font-semibold">{challenge.challenger?.arena_rank || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-8">
                  <label className="w-32 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Punteggio</label>
                  <div className="flex-1">
                    <p className="text-secondary/70">{challenge.challenger?.arena_points ?? "N/A"}</p>
                  </div>
                </div>
              </div>
            </div>
            {challenge.match_type === "doubles" && challenge.my_partner && (
              <div className="pt-4 border-t border-gray-200">
                <p className="text-xs font-medium text-secondary/60 uppercase mb-3">Partner Sfidante</p>
                <div className="space-y-4">
                  <div className="flex items-start gap-8">
                    <label className="w-32 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Nome</label>
                    <div className="flex-1">
                      <p className="text-secondary font-semibold">{challenge.my_partner.full_name}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-8">
                    <label className="w-32 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Email</label>
                    <div className="flex-1">
                      <p className="text-secondary/70">{challenge.my_partner.email || "N/A"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-8">
                    <label className="w-32 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Telefono</label>
                    <div className="flex-1">
                      <p className="text-secondary/70">{challenge.my_partner.phone || "N/A"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-8">
                    <label className="w-32 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Rank</label>
                    <div className="flex-1">
                      <p className="text-secondary font-semibold">{challenge.my_partner.arena_rank || "N/A"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-8">
                    <label className="w-32 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Punteggio</label>
                    <div className="flex-1">
                      <p className="text-secondary/70">{challenge.my_partner.arena_points ?? "N/A"}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sfidato */}
          <div className="space-y-6">
            <div>
              <p className="text-xs font-medium text-secondary/60 uppercase mb-3">Sfidato</p>
              <div className="space-y-4">
                <div className="flex items-start gap-8">
                  <label className="w-32 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Nome</label>
                  <div className="flex-1">
                    <p className="text-secondary font-semibold">{challenge.opponent?.full_name || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-8">
                  <label className="w-32 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Email</label>
                  <div className="flex-1">
                    <p className="text-secondary/70">{challenge.opponent?.email || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-8">
                  <label className="w-32 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Telefono</label>
                  <div className="flex-1">
                    <p className="text-secondary/70">{challenge.opponent?.phone || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-8">
                  <label className="w-32 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Rank</label>
                  <div className="flex-1">
                    <p className="text-secondary font-semibold">{challenge.opponent?.arena_rank || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-8">
                  <label className="w-32 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Punteggio</label>
                  <div className="flex-1">
                    <p className="text-secondary/70">{challenge.opponent?.arena_points ?? "N/A"}</p>
                  </div>
                </div>
              </div>
            </div>
            {challenge.match_type === "doubles" && challenge.opponent_partner && (
              <div className="pt-4 border-t border-gray-200">
                <p className="text-xs font-medium text-secondary/60 uppercase mb-3">Partner Sfidato</p>
                <div className="space-y-4">
                  <div className="flex items-start gap-8">
                    <label className="w-32 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Nome</label>
                    <div className="flex-1">
                      <p className="text-secondary font-semibold">{challenge.opponent_partner.full_name}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-8">
                    <label className="w-32 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Email</label>
                    <div className="flex-1">
                      <p className="text-secondary/70">{challenge.opponent_partner.email || "N/A"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-8">
                    <label className="w-32 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Telefono</label>
                    <div className="flex-1">
                      <p className="text-secondary/70">{challenge.opponent_partner.phone || "N/A"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-8">
                    <label className="w-32 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Rank</label>
                    <div className="flex-1">
                      <p className="text-secondary font-semibold">{challenge.opponent_partner.arena_rank || "N/A"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-8">
                    <label className="w-32 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Punteggio</label>
                    <div className="flex-1">
                      <p className="text-secondary/70">{challenge.opponent_partner.arena_points ?? "N/A"}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Booking Info */}
      {challenge.booking && (
        <div className="bg-white rounded-xl p-6">
          <h2 className="text-lg font-semibold text-secondary mb-6">Prenotazione Campo</h2>

          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-start gap-3 sm:gap-4 md:gap-8 pb-4 sm:pb-6 border-b border-gray-200">
              <label className="w-full md:w-48 pt-0 md:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Data</label>
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
            <div className="flex flex-col md:flex-row md:items-start gap-3 sm:gap-4 md:gap-8 pb-4 sm:pb-6 border-b border-gray-200">
              <label className="w-full md:w-48 pt-0 md:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Orario</label>
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
            <div className="flex items-start gap-8">
              <label className="w-full md:w-48 pt-0 md:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Campo</label>
              <div className="flex-1">
                <p className="text-secondary font-semibold">{challenge.booking.court}</p>
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
    </div>
  );
}
