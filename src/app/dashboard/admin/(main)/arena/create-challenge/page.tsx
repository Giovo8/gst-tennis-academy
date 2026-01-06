"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import {
  ArrowLeft,
  Swords,
  Calendar,
  Clock,
  MapPin,
  Users,
  Info,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface Player {
  id: string;
  full_name: string;
  avatar_url?: string;
  role: string;
}

const COURTS = ["Campo 1", "Campo 2", "Campo 3", "Campo 4"];
const MATCH_TYPES = [
  { value: "singles", label: "Singolo" },
  { value: "doubles", label: "Doppio" },
];
const CHALLENGE_TYPES = [
  { value: "ranked", label: "Classificata" },
  { value: "friendly", label: "Amichevole" },
];
const MATCH_FORMATS = [
  { value: "best_of_3", label: "Best of 3" },
  { value: "best_of_5", label: "Best of 5" },
  { value: "single_set", label: "Set Singolo" },
];

export default function CreateChallengePage() {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [challenger, setChallenger] = useState("");
  const [opponent, setOpponent] = useState("");
  const [matchType, setMatchType] = useState("singles");
  const [challengeType, setChallengeType] = useState("ranked");
  const [matchFormat, setMatchFormat] = useState("best_of_3");
  const [myPartner, setMyPartner] = useState("");
  const [opponentPartner, setOpponentPartner] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedCourt, setSelectedCourt] = useState("Campo 1");
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [slots, setSlots] = useState<{ time: string; available: boolean }[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadPlayers();
  }, []);

  useEffect(() => {
    if (selectedDate && selectedCourt) {
      loadAvailableSlots();
    }
  }, [selectedDate, selectedCourt]);

  async function loadPlayers() {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, role")
        .in("role", ["atleta", "maestro"])
        .order("full_name");

      if (error) throw error;
      setPlayers(data || []);
    } catch (error) {
      console.error("Error loading players:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadAvailableSlots() {
    setLoadingSlots(true);
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const response = await fetch(
        `/api/bookings/availability?date=${dateStr}&court=${encodeURIComponent(selectedCourt)}`
      );

      if (response.ok) {
        const data = await response.json();
        setSlots(data.slots || []);
      }
    } catch (error) {
      console.error("Error loading slots:", error);
    } finally {
      setLoadingSlots(false);
    }
  }

  function handleSlotClick(time: string, available: boolean) {
    if (!available) return;

    setSelectedSlots((prev) => {
      if (prev.includes(time)) {
        return prev.filter((t) => t !== time);
      } else {
        return [...prev, time].sort();
      }
    });
  }

  async function handleSubmit() {
    setError("");
    setSuccess("");

    // Validation
    if (!challenger || !opponent) {
      setError("Seleziona sia lo sfidante che lo sfidato");
      return;
    }

    if (challenger === opponent) {
      setError("Lo sfidante e lo sfidato devono essere persone diverse");
      return;
    }

    if (matchType === "doubles" && (!myPartner || !opponentPartner)) {
      setError("Per il doppio devi selezionare i partner di entrambe le coppie");
      return;
    }

    if (selectedSlots.length === 0) {
      setError("Seleziona almeno uno slot orario");
      return;
    }

    try {
      setSending(true);

      // Get session token
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error("Sessione scaduta, effettua di nuovo il login.");
      }

      // Calculate start and end times
      const firstSlot = selectedSlots[0];
      const [hours, minutes] = firstSlot.split(":").map(Number);
      const startTime = new Date(selectedDate);
      startTime.setHours(hours, minutes, 0, 0);

      const endTime = new Date(startTime);
      endTime.setHours(startTime.getHours() + selectedSlots.length, 0, 0, 0);

      const duration = selectedSlots.length * 60;

      // Create booking
      const bookingResponse = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: challenger,
          court: selectedCourt,
          type: "campo",
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          status: "pending",
          manager_confirmed: false,
          notes: `Sfida Arena (creata da admin): ${challengeType === "ranked" ? "Ranked" : "Amichevole"} - ${matchType === "singles" ? "Singolo" : "Doppio"} - ${matchFormat.replace("_", " ")}`,
        }),
      });

      if (!bookingResponse.ok) {
        const bookingError = await bookingResponse.json();
        throw new Error(bookingError.error || "Errore nella prenotazione del campo");
      }

      const bookingData = await bookingResponse.json();

      // Create challenge
      const challengeResponse = await fetch("/api/arena/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenger_id: challenger,
          opponent_id: opponent,
          scheduled_date: startTime.toISOString(),
          court: selectedCourt,
          match_format: matchFormat,
          duration_minutes: duration,
          match_type: matchType,
          challenge_type: challengeType,
          my_partner_id: matchType === "doubles" ? myPartner : null,
          opponent_partner_id: matchType === "doubles" ? opponentPartner : null,
          booking_id: bookingData.booking?.id,
          message: message.trim() || "Sfida creata dall'amministratore",
        }),
      });

      if (!challengeResponse.ok) {
        const challengeError = await challengeResponse.json();
        throw new Error(challengeError.error || "Errore nella creazione della sfida");
      }

      setSuccess("Sfida creata con successo!");
      setTimeout(() => {
        router.push("/dashboard/admin/arena");
      }, 1500);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setSending(false);
    }
  }

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  };

  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 90);
    return maxDate.toISOString().split("T")[0];
  };

  const availablePartners = players.filter(
    (p) => p.id !== challenger && p.id !== opponent && p.id !== myPartner && p.id !== opponentPartner
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-600">Caricamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
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
            Crea Nuova Sfida
          </h1>
          <p className="text-gray-600 mt-1">Crea una sfida tra due utenti</p>
        </div>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {/* Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Players Selection */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-orange-500" />
            Seleziona Giocatori
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sfidante *
              </label>
              <select
                value={challenger}
                onChange={(e) => setChallenger(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">Seleziona sfidante</option>
                {players.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.full_name} ({player.role})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sfidato *
              </label>
              <select
                value={opponent}
                onChange={(e) => setOpponent(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">Seleziona sfidato</option>
                {players.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.full_name} ({player.role})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Match Type */}
        <div className="p-6 border-b border-gray-200">
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            Tipo Match *
          </label>
          <div className="grid grid-cols-2 gap-3">
            {MATCH_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setMatchType(type.value)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  matchType === type.value
                    ? "border-orange-500 bg-orange-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="font-medium text-gray-900">{type.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Partners (if doubles) */}
        {matchType === "doubles" && (
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Partner Doppio</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-2 font-medium">
                  Partner Sfidante
                </label>
                <select
                  value={myPartner}
                  onChange={(e) => setMyPartner(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">Seleziona partner</option>
                  {availablePartners
                    .filter((p) => p.id !== opponentPartner)
                    .map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.full_name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-2 font-medium">
                  Partner Sfidato
                </label>
                <select
                  value={opponentPartner}
                  onChange={(e) => setOpponentPartner(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">Seleziona partner</option>
                  {availablePartners
                    .filter((p) => p.id !== myPartner)
                    .map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.full_name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Challenge Type */}
        <div className="p-6 border-b border-gray-200">
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            Tipo Sfida *
          </label>
          <div className="grid grid-cols-2 gap-3">
            {CHALLENGE_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setChallengeType(type.value)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  challengeType === type.value
                    ? "border-orange-500 bg-orange-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="font-medium text-gray-900">{type.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Match Format */}
        <div className="p-6 border-b border-gray-200">
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            Formato Match *
          </label>
          <div className="grid grid-cols-3 gap-3">
            {MATCH_FORMATS.map((format) => (
              <button
                key={format.value}
                onClick={() => setMatchFormat(format.value)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  matchFormat === format.value
                    ? "border-orange-500 bg-orange-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="font-medium text-gray-900">{format.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Date & Court */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-orange-50/30 to-amber-50/30">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
            <div>
              <p className="text-xs text-orange-600 uppercase tracking-wider font-semibold mb-1">
                <Calendar className="h-3 w-3 inline mr-1" />
                Prenotazione Campo
              </p>
              <h2 className="text-xl font-bold text-gray-900 capitalize">
                {format(selectedDate, "EEEE dd MMMM yyyy", { locale: it })}
              </h2>
            </div>
            <input
              type="date"
              value={format(selectedDate, "yyyy-MM-dd")}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              min={getMinDate()}
              max={getMaxDate()}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
            <MapPin className="h-3 w-3 inline mr-1" />
            Campo *
          </label>
          <select
            value={selectedCourt}
            onChange={(e) => setSelectedCourt(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            {COURTS.map((court) => (
              <option key={court} value={court}>
                {court}
              </option>
            ))}
          </select>
        </div>

        {/* Time Slots */}
        <div className="p-6 border-b border-gray-200">
          {loadingSlots ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-12 w-12 animate-spin text-orange-500 mb-4" />
              <p className="text-gray-600 font-semibold">Caricamento slot...</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-500" />
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                    Slot disponibili
                  </h3>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-orange-500"></div>
                    <span className="text-gray-600">Selezionato</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded border-2 border-gray-300"></div>
                    <span className="text-gray-600">Disponibile</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-gray-200"></div>
                    <span className="text-gray-600">Occupato</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3">
                {slots.map((slot) => (
                  <button
                    key={slot.time}
                    onClick={() => handleSlotClick(slot.time, slot.available)}
                    disabled={!slot.available}
                    className={`relative p-4 rounded-lg border-2 transition-all ${
                      selectedSlots.includes(slot.time)
                        ? "bg-orange-500 border-orange-500 shadow-md"
                        : slot.available
                        ? "bg-white border-gray-200 hover:border-orange-300 hover:shadow-sm"
                        : "bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <Clock
                        className={`h-4 w-4 ${
                          selectedSlots.includes(slot.time)
                            ? "text-white"
                            : slot.available
                            ? "text-orange-500"
                            : "text-gray-400"
                        }`}
                      />
                      <span
                        className={`text-base font-bold ${
                          selectedSlots.includes(slot.time)
                            ? "text-white"
                            : slot.available
                            ? "text-gray-900"
                            : "text-gray-400 line-through"
                        }`}
                      >
                        {slot.time}
                      </span>
                    </div>
                    {selectedSlots.includes(slot.time) && (
                      <div className="absolute top-1.5 right-1.5">
                        <CheckCircle className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Message */}
        <div className="p-6 border-b border-gray-200">
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Messaggio (Opzionale)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Aggiungi un messaggio alla sfida..."
            rows={3}
            className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>

        {/* Info Alert */}
        <div className="p-6 border-b border-gray-200 bg-blue-50">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-800 font-semibold mb-1">
                Nota per l'amministratore:
              </p>
              <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                <li>La sfida verrà creata in stato "pending" in attesa dell'accettazione dell'avversario</li>
                <li>La prenotazione del campo richiederà comunque la tua conferma come gestore</li>
                <li>Entrambi i giocatori riceveranno una notifica</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="p-6">
          <button
            onClick={handleSubmit}
            disabled={sending || !challenger || !opponent || selectedSlots.length === 0}
            className="w-full px-6 py-3 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {sending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Creazione in corso...
              </>
            ) : (
              <>
                <Swords className="h-5 w-5" />
                Crea Sfida
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
