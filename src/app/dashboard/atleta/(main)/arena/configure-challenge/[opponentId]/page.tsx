"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  ArrowLeft,
  Swords,
  Calendar,
  Clock,
  MapPin,
  Trophy,
  Loader2,
  Users,
  Info,
  MessageSquare,
  Star,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

interface OpponentProfile {
  id: string;
  full_name: string;
  avatar_url?: string;
  email: string;
}

interface Player {
  id: string;
  full_name: string;
  avatar_url?: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

const COURTS = ["Campo 1", "Campo 2", "Campo 3", "Campo 4", "Campo 5", "Campo 6", "Campo 7", "Campo 8"];

const MATCH_FORMATS = [
  { value: "best_of_1", label: "Best of 1 Set", duration: 60 },
  { value: "best_of_3", label: "Best of 3 Sets", duration: 120 },
  { value: "best_of_5", label: "Best of 5 Sets", duration: 180 },
];

const MATCH_TYPES = [
  { value: "singolo", label: "Singolo", icon: "👤" },
  { value: "doppio", label: "Doppio", icon: "👥" },
];

const CHALLENGE_TYPES = [
  { value: "ranked", label: "Ranked", icon: <Trophy className="h-5 w-5" />, description: "Conta per la classifica e statistiche" },
  { value: "amichevole", label: "Amichevole", icon: <Star className="h-5 w-5" />, description: "Solo per divertimento, senza punti" },
];

export default function ConfigureChallengePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const opponentId = params.opponentId as string;
  const editChallengeId = searchParams.get("edit");
  const isCounterProposal = searchParams.get("counter") === "true";

  const [opponent, setOpponent] = useState<OpponentProfile | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form state
  const [challengeType, setChallengeType] = useState("ranked");
  const [matchFormat, setMatchFormat] = useState("best_of_3");
  const [matchType, setMatchType] = useState("singolo");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedCourt, setSelectedCourt] = useState(COURTS[0]);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [myPartner, setMyPartner] = useState("");
  const [opponentPartner, setOpponentPartner] = useState("");
  const [message, setMessage] = useState("");

  // Slots
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    loadData();
  }, [opponentId]);

  useEffect(() => {
    if (editChallengeId && opponent) {
      loadExistingChallenge();
    }
  }, [editChallengeId, opponent]);

  useEffect(() => {
    if (selectedDate && selectedCourt) {
      loadAvailableSlots();
    }
  }, [selectedDate, selectedCourt]);

  async function loadData() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      setCurrentUserId(session.user.id);

      const response = await fetch("/api/arena/players", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPlayers(data.players);
        
        const foundOpponent = data.players.find((p: any) => p.id === opponentId);
        if (foundOpponent) {
          setOpponent(foundOpponent);
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadExistingChallenge() {
    try {
      const response = await fetch(`/api/arena/challenges?challenge_id=${editChallengeId}`);
      if (response.ok) {
        const data = await response.json();
        const challenge = data.challenge;
        
        if (challenge) {
          setChallengeType(challenge.challenge_type || "ranked");
          setMatchFormat(challenge.match_format || "best_of_3");
          setMatchType(challenge.match_type || "singolo");
          setMessage(challenge.message || "");
          setMyPartner(challenge.my_partner_id || "");
          setOpponentPartner(challenge.opponent_partner_id || "");
          
          if (challenge.booking) {
            const bookingDate = new Date(challenge.booking.start_time);
            setSelectedDate(bookingDate);
            setSelectedCourt(challenge.booking.court);
            
            // Extract selected slots from booking
            const startTime = new Date(challenge.booking.start_time);
            const endTime = new Date(challenge.booking.end_time);
            const slots: string[] = [];
            let current = new Date(startTime);
            
            while (current < endTime) {
              slots.push(
                current.toLocaleTimeString("it-IT", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              );
              current = new Date(current.getTime() + 30 * 60000);
            }
            
            setSelectedSlots(slots);
          }
        }
      }
    } catch (error) {
      console.error("Error loading existing challenge:", error);
    }
  }

  async function loadAvailableSlots() {
    if (!selectedDate || !selectedCourt) return;

    setLoadingSlots(true);
    
    const dateStr = selectedDate.toISOString().split("T")[0];

    // Get existing bookings for this court and date
    const { data: bookings } = await supabase
      .from("bookings")
      .select("start_time, end_time, manager_confirmed")
      .eq("court", selectedCourt)
      .neq("status", "cancelled")
      .gte("start_time", `${dateStr}T00:00:00`)
      .lte("start_time", `${dateStr}T23:59:59`);

    // Build occupied time ranges for confirmed bookings
    const occupiedRanges: { start: Date; end: Date }[] = [];
    
    bookings?.forEach(b => {
      // Only consider confirmed bookings
      if (b.manager_confirmed) {
        occupiedRanges.push({
          start: new Date(b.start_time),
          end: new Date(b.end_time)
        });
      }
    });

    // Generate slots (8:00 - 22:00)
    const generatedSlots: TimeSlot[] = [];
    const now = new Date();
    const isToday = selectedDate.toDateString() === now.toDateString();

    for (let hour = 8; hour < 22; hour++) {
      const time = `${hour.toString().padStart(2, "0")}:00`;
      
      const slotStart = new Date(selectedDate);
      slotStart.setHours(hour, 0, 0, 0);
      
      const slotEnd = new Date(slotStart);
      slotEnd.setHours(hour + 1, 0, 0, 0);

      // Check if occupied by any confirmed booking
      const isOccupied = occupiedRanges.some(range => {
        return (slotStart < range.end && slotEnd > range.start);
      });

      let available = !isOccupied;
      
      // If today, check if slot is in the past (1h buffer)
      if (isToday && hour <= now.getHours()) {
        available = false;
      }

      generatedSlots.push({ time, available });
    }

    setSlots(generatedSlots);
    setLoadingSlots(false);
  }

  const handleDateInputChange = (value: string) => {
    if (!value) return;
    const [year, month, day] = value.split("-").map(Number);
    const newDate = new Date();
    newDate.setFullYear(year, month - 1, day);
    setSelectedDate(newDate);
  };

  const handleSlotClick = (time: string, available: boolean) => {
    if (!available) return;

    setSelectedSlots((prev) => {
      if (prev.includes(time)) {
        // Deselect
        return prev.filter((t) => t !== time);
      } else {
        // Select consecutive slots
        const allSlots = slots.map((s) => s.time);
        const newIndex = allSlots.indexOf(time);

        if (prev.length === 0) {
          return [time];
        }

        const existingIndices = prev.map((t) => allSlots.indexOf(t));
        const minIndex = Math.min(...existingIndices);
        const maxIndex = Math.max(...existingIndices);

        // If clicking adjacent
        if (newIndex === minIndex - 1 || newIndex === maxIndex + 1) {
          return [...prev, time].sort((a, b) => allSlots.indexOf(a) - allSlots.indexOf(b));
        }

        // Otherwise start fresh
        return [time];
      }
    });
  };

  async function handleSubmit() {
    if (selectedSlots.length === 0 || !selectedCourt) {
      setError("Seleziona un campo e almeno uno slot orario");
      return;
    }

    if (matchType === "doppio" && (!myPartner || !opponentPartner)) {
      setError("Per il doppio devi selezionare entrambi i compagni");
      return;
    }

    setSending(true);
    setError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Devi essere autenticato");
        return;
      }

      // Recupera il token dell'utente
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error("Sessione scaduta, effettua di nuovo il login.");
      }

      // Calculate start and end times from selected slots
      const firstSlot = selectedSlots[0];
      const [hours, minutes] = firstSlot.split(":").map(Number);
      const startTime = new Date(selectedDate);
      startTime.setHours(hours, minutes, 0, 0);

      const endTime = new Date(startTime);
      endTime.setHours(startTime.getHours() + selectedSlots.length, 0, 0, 0);

      const duration = selectedSlots.length * 60;

      if (editChallengeId) {
        // Update existing challenge
        // First, update or create booking
        const existingChallengeResponse = await fetch(`/api/arena/challenges?challenge_id=${editChallengeId}`);
        const existingData = await existingChallengeResponse.json();
        const existingChallenge = existingData.challenge;

        let bookingId = existingChallenge?.booking_id;

        if (existingChallenge?.booking_id) {
          // Update existing booking
          await fetch(`/api/bookings/${existingChallenge.booking_id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              court: selectedCourt,
              start_time: startTime.toISOString(),
              end_time: endTime.toISOString(),
              notes: `Sfida Arena: ${challengeType === "ranked" ? "Ranked" : "Amichevole"} - ${matchType === "singolo" ? "Singolo" : "Doppio"} - ${matchFormat.replace("_", " ")}`,
            }),
          });
        } else {
          // Create new booking if doesn't exist
          const bookingResponse = await fetch("/api/bookings", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              user_id: user.id,
              court: selectedCourt,
              type: "campo",
              start_time: startTime.toISOString(),
              end_time: endTime.toISOString(),
              status: "pending",
              manager_confirmed: false,
              notes: `Sfida Arena: ${challengeType === "ranked" ? "Ranked" : "Amichevole"} - ${matchType === "singolo" ? "Singolo" : "Doppio"} - ${matchFormat.replace("_", " ")}`,
            }),
          });

          if (!bookingResponse.ok) {
            const bookingError = await bookingResponse.json();
            throw new Error(bookingError.error || "Errore nella prenotazione del campo");
          }

          const bookingData = await bookingResponse.json();
          bookingId = bookingData.booking?.id;
        }

        // Update challenge
        const challengeResponse = await fetch("/api/arena/challenges", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            challenge_id: editChallengeId,
            scheduled_date: startTime.toISOString(),
            court: selectedCourt,
            match_format: matchFormat,
            duration_minutes: duration,
            match_type: matchType,
            challenge_type: challengeType,
            my_partner_id: matchType === "doppio" ? myPartner : null,
            opponent_partner_id: matchType === "doppio" ? opponentPartner : null,
            booking_id: bookingId,
            message: message.trim() || null,
            status: isCounterProposal ? "counter_proposal" : undefined,
          }),
        });

        if (!challengeResponse.ok) {
          const challengeError = await challengeResponse.json();
          throw new Error(challengeError.error || "Errore nella modifica della sfida");
        }

        setSuccess("Sfida modificata con successo!");
        setTimeout(() => {
          router.push(`/dashboard/atleta/arena/challenge/${editChallengeId}`);
        }, 1500);
      } else {
        // Create new challenge (existing code)
      const bookingResponse = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: user.id,
          court: selectedCourt,
          type: "campo",
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          status: "pending",
          manager_confirmed: false,
          notes: `Sfida Arena: ${challengeType === "ranked" ? "Ranked" : "Amichevole"} - ${matchType === "singolo" ? "Singolo" : "Doppio"} - ${matchFormat.replace("_", " ")}`,
        }),
      });

      if (!bookingResponse.ok) {
        const bookingError = await bookingResponse.json();
        throw new Error(bookingError.error || "Errore nella prenotazione del campo");
      }

      const bookingData = await bookingResponse.json();

      // Create challenge with booking_id
      const challengeResponse = await fetch("/api/arena/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenger_id: user.id,
          opponent_id: opponentId,
          scheduled_date: startTime.toISOString(),
          court: selectedCourt,
          match_format: matchFormat,
          duration_minutes: duration,
          match_type: matchType,
          challenge_type: challengeType,
          my_partner_id: matchType === "doppio" ? myPartner : null,
          opponent_partner_id: matchType === "doppio" ? opponentPartner : null,
          booking_id: bookingData.booking?.id,
          message: message.trim() || null,
        }),
      });

      if (!challengeResponse.ok) {
        const challengeError = await challengeResponse.json();
        throw new Error(challengeError.error || "Errore nella creazione della sfida");
      }

      const challengeData = await challengeResponse.json();

      // Create chat if message exists
      if (message.trim()) {
        await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipient_id: opponentId,
            message: message.trim(),
            challenge_id: challengeData.challenge?.id,
          }),
        });
      }

      setSuccess("Sfida creata con successo!");
      setTimeout(() => {
        router.push("/dashboard/atleta/arena?success=challenge_created");
      }, 1500);
      }
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
    (p) => p.id !== currentUserId && p.id !== opponentId && p.id !== myPartner && p.id !== opponentPartner
  );

  const canSubmit = selectedDate && selectedCourt && selectedSlots.length > 0 &&
    ((matchType === "singolo") || (matchType === "doppio" && myPartner && opponentPartner));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-frozen-500" />
      </div>
    );
  }

  if (!opponent) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Avversario non trovato</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <div>
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-600 hover:text-gray-900 mb-4 inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Torna alla scelta avversario
        </button>
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <div className="p-2 bg-frozen-500 rounded-xl">
            <Swords className="h-8 w-8 text-white" />
          </div>
          Configura la Sfida
        </h1>
        <p className="text-sm text-gray-600">
          Imposta i dettagli del match con {opponent.full_name}
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-900">Errore</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-green-900">Successo</p>
            <p className="text-sm text-green-700 mt-1">{success}</p>
          </div>
        </div>
      )}

      {/* Opponent Card */}
      <div className="bg-gradient-to-r from-frozen-50 to-blue-50 rounded-xl border-2 border-frozen-200 p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-frozen-100 flex items-center justify-center overflow-hidden flex-shrink-0">
            {opponent.avatar_url ? (
              <img
                src={opponent.avatar_url}
                alt={opponent.full_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-2xl font-bold text-frozen-600">
                {opponent.full_name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <p className="text-sm text-frozen-600 font-semibold">Avversario</p>
            <h3 className="text-xl font-bold text-gray-900">{opponent.full_name}</h3>
            <p className="text-sm text-gray-600">{opponent.email}</p>
          </div>
        </div>
      </div>

      {/* Configuration Card */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        
        {/* Challenge Type */}
        <div className="p-6 border-b border-gray-200">
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            Tipo di Sfida *
          </label>
          <div className="grid grid-cols-2 gap-3">
            {CHALLENGE_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setChallengeType(type.value)}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  challengeType === type.value
                    ? "border-frozen-500 bg-frozen-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={challengeType === type.value ? "text-frozen-600" : "text-gray-600"}>
                    {type.icon}
                  </div>
                  <div className="font-medium text-gray-900">{type.label}</div>
                </div>
                <div className="text-xs text-gray-600">{type.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Match Type */}
        <div className="p-6">
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            Tipo di Match *
          </label>
          <div className="grid grid-cols-2 gap-3">
            {MATCH_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setMatchType(type.value)}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  matchType === type.value
                    ? "border-frozen-500 bg-frozen-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="text-2xl mb-2">{type.icon}</div>
                <div className="font-medium text-gray-900">{type.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Partners for Doubles */}
        {matchType === "doppio" && (
          <div className="p-6 bg-blue-50">
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              <Users className="h-4 w-4 inline mr-2" />
              Compagni di Doppio *
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-2 font-medium">Il tuo compagno</label>
                <select
                  value={myPartner}
                  onChange={(e) => setMyPartner(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-frozen-500 focus:border-frozen-500"
                >
                  <option value="">Seleziona compagno</option>
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
                  Compagno di {opponent.full_name}
                </label>
                <select
                  value={opponentPartner}
                  onChange={(e) => setOpponentPartner(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-frozen-500 focus:border-frozen-500"
                >
                  <option value="">Seleziona compagno</option>
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
            <div className="mt-2 flex items-start gap-2 text-xs text-gray-600">
              <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>Seleziona i compagni per entrambe le coppie</span>
            </div>
          </div>
        )}

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
                    ? "border-frozen-500 bg-frozen-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="font-medium text-gray-900">{format.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Date & Court Selection Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-secondary/5 to-secondary/10">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs text-secondary/70 uppercase tracking-wider font-semibold mb-1">
                <Calendar className="h-3 w-3 inline mr-1" />
                Prenotazione Campo
              </p>
              <h2 className="text-xl font-bold text-secondary capitalize">
                {format(selectedDate, "EEEE dd MMMM yyyy", { locale: it })}
              </h2>
            </div>
            
            {/* Date Picker */}
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={format(selectedDate, "yyyy-MM-dd")}
                onChange={(e) => handleDateInputChange(e.target.value)}
                min={getMinDate()}
                max={getMaxDate()}
                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
              />
            </div>
          </div>
        </div>

        {/* Court Selection */}
        <div className="p-6 border-b border-gray-200">
          <label className="block text-xs font-semibold text-secondary/70 uppercase tracking-wider mb-2">
            <MapPin className="h-3 w-3 inline mr-1" />
            Campo *
          </label>
          <select
            value={selectedCourt}
            onChange={(e) => setSelectedCourt(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
          >
            {COURTS.map((court) => (
              <option key={court} value={court}>
                {court}
              </option>
            ))}
          </select>          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">
                <span className="font-semibold">Nota:</span> La prenotazione del campo verrà creata ma dovrà essere confermata dal gestore/amministratore prima di essere definitiva. Riceverai una notifica quando sarà confermata.
              </p>
            </div>
          </div>        </div>

        {/* Time Slots */}
        <div className="p-6 border-b border-gray-200">
          {loadingSlots ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-12 w-12 animate-spin text-secondary mb-4" />
              <p className="text-secondary font-semibold">Caricamento slot...</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-secondary/60" />
                  <h3 className="text-sm font-semibold text-secondary/70 uppercase tracking-wider">
                    Slot disponibili
                  </h3>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-secondary"></div>
                    <span className="text-secondary/70">Selezionato</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded border-2 border-gray-300"></div>
                    <span className="text-secondary/70">Disponibile</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-gray-200"></div>
                    <span className="text-secondary/70">Occupato</span>
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
                        ? "bg-secondary border-secondary shadow-md"
                        : slot.available
                        ? "bg-white border-gray-200 hover:border-secondary/40 hover:shadow-sm"
                        : "bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <Clock className={`h-4 w-4 ${
                        selectedSlots.includes(slot.time) ? "text-white" : slot.available ? "text-secondary/60" : "text-gray-400"
                      }`} />
                      <span className={`text-base font-bold ${
                        selectedSlots.includes(slot.time) ? "text-white" : slot.available ? "text-secondary" : "text-gray-400 line-through"
                      }`}>
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

              {selectedSlots.length > 0 && (
                <div className="mt-4 p-4 bg-frozen-50 rounded-lg border border-frozen-200">
                  <div className="flex items-center gap-2 text-sm text-frozen-900">
                    <Info className="h-4 w-4 flex-shrink-0" />
                    <span>
                      Match programmato: <strong>{selectedSlots[0]}</strong> su <strong>{selectedCourt}</strong> ({selectedSlots.length}h)
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Message */}
        <div className="p-6">
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            <MessageSquare className="h-4 w-4 inline mr-2" />
            Messaggio (opzionale)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Aggiungi un messaggio alla tua sfida (verrà creata una chat)..."
            rows={4}
            maxLength={500}
            className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-frozen-500 focus:border-frozen-500 resize-none"
          />
          <p className="text-xs text-gray-500 mt-2">{message.length}/500 caratteri</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-6 shadow-lg z-10">
        <div className="max-w-5xl mx-auto flex gap-3">
          <button
            onClick={() => router.back()}
            disabled={sending}
            className="flex-1 px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Annulla
          </button>
          <button
            onClick={handleSubmit}
            disabled={sending || !canSubmit}
            className="flex-1 px-6 py-3 text-sm font-semibold text-white bg-frozen-500 rounded-lg hover:bg-frozen-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {sending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Invio in corso...
              </>
            ) : (
              <>
                <Trophy className="h-5 w-5" />
                Lancia Sfida
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
