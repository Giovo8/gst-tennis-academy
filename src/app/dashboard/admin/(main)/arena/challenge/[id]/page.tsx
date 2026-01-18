"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import {
  Check,
  Trash2,
  AlertCircle,
  Edit,
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
  const [showScoreForm, setShowScoreForm] = useState(false);
  const [winnerId, setWinnerId] = useState("");
  const [score, setScore] = useState("");
  const [savingScore, setSavingScore] = useState(false);

  useEffect(() => {
    if (id) {
      loadChallengeDetails();
    }
  }, [id]);

  useEffect(() => {
    if (challenge) {
      setWinnerId(challenge.winner_id || "");
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

    // Controlla se la data è passata
    if (challenge.booking?.start_time) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const bookingDate = new Date(challenge.booking.start_time);
      const bookingDay = new Date(bookingDate.getFullYear(), bookingDate.getMonth(), bookingDate.getDate());

      if (bookingDay < today) {
        alert("❌ Non puoi confermare una prenotazione con data passata. La sfida è stata spostata nello storico.");
        return;
      }
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch(`/api/bookings?id=${challenge.booking_id}`, {
        method: "PUT",
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
      } else {
        const errorData = await response.json();
        alert(`❌ Errore: ${errorData.error || "Impossibile confermare la prenotazione"}`);
      }
    } catch (error) {
      console.error("Error confirming booking:", error);
      alert("❌ Errore nella conferma della prenotazione");
    }
  }

  async function handleSaveScore() {
    if (!winnerId) {
      alert("Seleziona il vincitore");
      return;
    }

    if (!score.trim()) {
      alert("Inserisci il punteggio");
      return;
    }

    try {
      setSavingScore(true);

      const response = await fetch(`/api/arena/challenges?challenge_id=${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          winner_id: winnerId,
          score: score.trim(),
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

      {/* Challenge Type Header */}
      <div
        className="bg-secondary rounded-xl border-t border-r border-b border-secondary p-6 border-l-4"
        style={{ borderLeftColor: (() => {
          if (challenge.status === "completed") return "#10b981"; // verde
          if (challenge.status === "pending") return "#f59e0b"; // amber
          if (challenge.status === "accepted") return "#3b82f6"; // blu
          if (challenge.status === "declined" || challenge.status === "cancelled") return "#ef4444"; // rosso
          return "#8b5cf6"; // viola per controproposta
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
          <div className="p-4 border border-gray-100 border-l-4 border-l-secondary rounded-md bg-white mb-4">
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

          {/* Info Sfidante */}
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-start gap-3 sm:gap-4 md:gap-8 pb-4 sm:pb-6 border-b border-gray-200">
              <label className="w-full md:w-32 pt-0 md:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Email</label>
              <div className="flex-1">
                <p className="text-secondary/70">{challenge.challenger?.email || "N/A"}</p>
              </div>
            </div>
            <div className="flex flex-col md:flex-row md:items-start gap-3 sm:gap-4 md:gap-8 pb-4 sm:pb-6 border-b border-gray-200">
              <label className="w-full md:w-32 pt-0 md:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Telefono</label>
              <div className="flex-1">
                <p className="text-secondary/70">{challenge.challenger?.phone || "N/A"}</p>
              </div>
            </div>
            <div className="flex flex-col md:flex-row md:items-start gap-3 sm:gap-4 md:gap-8 pb-4 sm:pb-6 border-b border-gray-200">
              <label className="w-full md:w-32 pt-0 md:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Rank</label>
              <div className="flex-1">
                <p className="text-secondary font-semibold">{challenge.challenger?.arena_rank || "N/A"}</p>
              </div>
            </div>
            <div className="flex items-start gap-8">
              <label className="w-full md:w-32 pt-0 md:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Punteggio</label>
              <div className="flex-1">
                <p className="text-secondary/70">{challenge.challenger?.arena_points ?? "N/A"}</p>
              </div>
            </div>
          </div>

          {/* Info Partner Sfidante */}
          {challenge.match_type === "doubles" && challenge.my_partner && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-xs font-medium text-secondary/60 uppercase mb-6">Info Partner</p>
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-start gap-3 sm:gap-4 md:gap-8 pb-4 sm:pb-6 border-b border-gray-200">
                  <label className="w-full md:w-32 pt-0 md:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Email</label>
                  <div className="flex-1">
                    <p className="text-secondary/70">{challenge.my_partner.email || "N/A"}</p>
                  </div>
                </div>
                <div className="flex flex-col md:flex-row md:items-start gap-3 sm:gap-4 md:gap-8 pb-4 sm:pb-6 border-b border-gray-200">
                  <label className="w-full md:w-32 pt-0 md:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Telefono</label>
                  <div className="flex-1">
                    <p className="text-secondary/70">{challenge.my_partner.phone || "N/A"}</p>
                  </div>
                </div>
                <div className="flex flex-col md:flex-row md:items-start gap-3 sm:gap-4 md:gap-8 pb-4 sm:pb-6 border-b border-gray-200">
                  <label className="w-full md:w-32 pt-0 md:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Rank</label>
                  <div className="flex-1">
                    <p className="text-secondary font-semibold">{challenge.my_partner.arena_rank || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-8">
                  <label className="w-full md:w-32 pt-0 md:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Punteggio</label>
                  <div className="flex-1">
                    <p className="text-secondary/70">{challenge.my_partner.arena_points ?? "N/A"}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Opponent */}
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-secondary mb-4">Avversario</h3>
          <div className="p-4 border border-gray-100 border-l-4 border-l-secondary/40 rounded-md bg-white mb-4">
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

          {/* Info Avversario */}
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-start gap-3 sm:gap-4 md:gap-8 pb-4 sm:pb-6 border-b border-gray-200">
              <label className="w-full md:w-32 pt-0 md:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Email</label>
              <div className="flex-1">
                <p className="text-secondary/70">{challenge.opponent?.email || "N/A"}</p>
              </div>
            </div>
            <div className="flex flex-col md:flex-row md:items-start gap-3 sm:gap-4 md:gap-8 pb-4 sm:pb-6 border-b border-gray-200">
              <label className="w-full md:w-32 pt-0 md:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Telefono</label>
              <div className="flex-1">
                <p className="text-secondary/70">{challenge.opponent?.phone || "N/A"}</p>
              </div>
            </div>
            <div className="flex flex-col md:flex-row md:items-start gap-3 sm:gap-4 md:gap-8 pb-4 sm:pb-6 border-b border-gray-200">
              <label className="w-full md:w-32 pt-0 md:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Rank</label>
              <div className="flex-1">
                <p className="text-secondary font-semibold">{challenge.opponent?.arena_rank || "N/A"}</p>
              </div>
            </div>
            <div className="flex items-start gap-8">
              <label className="w-full md:w-32 pt-0 md:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Punteggio</label>
              <div className="flex-1">
                <p className="text-secondary/70">{challenge.opponent?.arena_points ?? "N/A"}</p>
              </div>
            </div>
          </div>

          {/* Info Partner Avversario */}
          {challenge.match_type === "doubles" && challenge.opponent_partner && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-xs font-medium text-secondary/60 uppercase mb-6">Info Partner</p>
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-start gap-3 sm:gap-4 md:gap-8 pb-4 sm:pb-6 border-b border-gray-200">
                  <label className="w-full md:w-32 pt-0 md:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Email</label>
                  <div className="flex-1">
                    <p className="text-secondary/70">{challenge.opponent_partner.email || "N/A"}</p>
                  </div>
                </div>
                <div className="flex flex-col md:flex-row md:items-start gap-3 sm:gap-4 md:gap-8 pb-4 sm:pb-6 border-b border-gray-200">
                  <label className="w-full md:w-32 pt-0 md:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Telefono</label>
                  <div className="flex-1">
                    <p className="text-secondary/70">{challenge.opponent_partner.phone || "N/A"}</p>
                  </div>
                </div>
                <div className="flex flex-col md:flex-row md:items-start gap-3 sm:gap-4 md:gap-8 pb-4 sm:pb-6 border-b border-gray-200">
                  <label className="w-full md:w-32 pt-0 md:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Rank</label>
                  <div className="flex-1">
                    <p className="text-secondary font-semibold">{challenge.opponent_partner.arena_rank || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-8">
                  <label className="w-full md:w-32 pt-0 md:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Punteggio</label>
                  <div className="flex-1">
                    <p className="text-secondary/70">{challenge.opponent_partner.arena_points ?? "N/A"}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
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

        {challenge.winner_id && !showScoreForm && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-start gap-8 mb-4">
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
            <button
              onClick={() => setShowScoreForm(true)}
              className="px-4 py-2 text-sm font-medium text-secondary bg-white border border-secondary rounded-md hover:bg-secondary hover:text-white transition-all"
            >
              Modifica Risultato
            </button>
          </div>
        )}

        {(challenge.status === "accepted" || challenge.status === "completed") && !challenge.winner_id && !showScoreForm && (() => {
          // Controlla se la data del match è passata
          const now = new Date();
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          let isDatePassed = false;

          if (challenge.booking?.start_time) {
            const challengeDate = new Date(challenge.booking.start_time);
            const challengeDay = new Date(challengeDate.getFullYear(), challengeDate.getMonth(), challengeDate.getDate());
            isDatePassed = challengeDay < today;
          }

          return (
            <div className="mt-6 pt-6 border-t border-gray-200">
              {isDatePassed && challenge.status !== "completed" && (
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    ⚠️ La data del match è passata. La sfida verrà spostata nello storico.
                  </p>
                </div>
              )}
              <button
                onClick={() => setShowScoreForm(true)}
                className="px-4 py-2.5 text-sm font-medium text-white bg-secondary rounded-md hover:opacity-90 transition-all flex items-center gap-2"
              >
                <Check className="h-4 w-4" />
                Inserisci Risultato
              </button>
            </div>
          );
        })()}

        {showScoreForm && (
          <div className="mt-6 pt-6 border-t border-gray-200 space-y-6">
            <h3 className="text-md font-semibold text-secondary">Risultato Match</h3>

            {/* Selettore Vincitore */}
            <div className="flex flex-col md:flex-row md:items-start gap-3 sm:gap-4 md:gap-8 pb-4 sm:pb-6 border-b border-gray-200">
              <label className="w-full md:w-48 pt-0 md:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
                Vincitore *
              </label>
              <div className="flex-1 space-y-3">
                {/* Team Sfidante */}
                <button
                  type="button"
                  onClick={() => setWinnerId(challenge.challenger_id)}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                    winnerId === challenge.challenger_id
                      ? "border-secondary bg-secondary/5"
                      : "border-gray-200 hover:border-secondary/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      winnerId === challenge.challenger_id
                        ? "border-secondary bg-secondary"
                        : "border-gray-300"
                    }`}>
                      {winnerId === challenge.challenger_id && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-secondary">
                        {challenge.challenger?.full_name}
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
                  onClick={() => setWinnerId(challenge.opponent_id)}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                    winnerId === challenge.opponent_id
                      ? "border-secondary bg-secondary/5"
                      : "border-gray-200 hover:border-secondary/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      winnerId === challenge.opponent_id
                        ? "border-secondary bg-secondary"
                        : "border-gray-300"
                    }`}>
                      {winnerId === challenge.opponent_id && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-secondary">
                        {challenge.opponent?.full_name}
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

            {/* Campo Score */}
            <div className="flex flex-col md:flex-row md:items-start gap-3 sm:gap-4 md:gap-8 pb-4 sm:pb-6 border-b border-gray-200">
              <label className="w-full md:w-48 pt-0 md:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
                Punteggio *
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

            {/* Bottoni Azione */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveScore}
                disabled={savingScore || !winnerId || !score.trim()}
                className="px-4 py-2.5 text-sm font-medium text-white bg-secondary rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                {savingScore ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Salvataggio...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Salva Risultato
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowScoreForm(false);
                  setWinnerId(challenge.winner_id || "");
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
            <div className="flex flex-col md:flex-row md:items-start gap-3 sm:gap-4 md:gap-8 pb-4 sm:pb-6 border-b border-gray-200">
              <label className="w-full md:w-48 pt-0 md:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Campo</label>
              <div className="flex-1">
                <p className="text-secondary font-semibold">{challenge.booking.court}</p>
              </div>
            </div>
            <div className="flex items-start gap-8">
              <label className="w-full md:w-48 pt-0 md:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Stato</label>
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
    </div>
  );
}
