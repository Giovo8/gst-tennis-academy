"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { format, addDays } from "date-fns";
import { it } from "date-fns/locale";
import {
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
  ChevronDown,
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

interface SearchableOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SearchableOption[];
  placeholder?: string;
  searchPlaceholder?: string;
}

function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedOption = options.find((opt) => opt.value === value);
  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
  };

  const handleToggle = () => {
    setOpen((prev) => {
      const next = !prev;
      if (!next) {
        setQuery("");
      }
      return next;
    });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleToggle}
        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-left text-secondary flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
      >
        <span className={selectedOption ? "" : "text-secondary/40"}>
          {selectedOption ? selectedOption.label : placeholder || "Seleziona"}
        </span>
        <ChevronDown className="h-4 w-4 text-secondary/60 ml-2 flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="p-2 border-b border-gray-100">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder || "Cerca..."}
              className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-1 focus:ring-secondary/30 focus:border-secondary/50"
            />
          </div>
          <div className="max-h-56 overflow-auto py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-xs text-secondary/40">
                Nessun risultato
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={`w-full px-3 py-1.5 text-left text-sm hover:bg-secondary/5 ${
                    opt.value === value ? "bg-secondary/10 font-semibold" : ""
                  }`}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
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
  const [existingBookings, setExistingBookings] = useState<any[]>([]);

  // Drag to scroll
  const timelineScrollRef = useRef<HTMLDivElement | null>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  // Drag to scroll handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineScrollRef.current) return;
    isDragging.current = true;
    startX.current = e.pageX - timelineScrollRef.current.offsetLeft;
    scrollLeft.current = timelineScrollRef.current.scrollLeft;
    timelineScrollRef.current.style.cursor = 'grabbing';
    timelineScrollRef.current.style.userSelect = 'none';
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging.current || !timelineScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - timelineScrollRef.current.offsetLeft;
    const walk = (x - startX.current) * 2;
    timelineScrollRef.current.scrollLeft = scrollLeft.current - walk;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    if (timelineScrollRef.current) {
      timelineScrollRef.current.style.cursor = 'grab';
      timelineScrollRef.current.style.userSelect = 'auto';
    }
  };

  const handleMouseLeave = () => {
    if (isDragging.current) {
      handleMouseUp();
    }
  };

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
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const response = await fetch(
        `/api/bookings/availability?date=${dateStr}&court=${encodeURIComponent(selectedCourt)}`
      );

      if (response.ok) {
        const data = await response.json();
        setSlots(data.slots || []);
      } else {
        generateDefaultSlots();
      }

      await loadExistingBookings();
    } catch (error) {
      console.error("Error loading slots:", error);
      generateDefaultSlots();
    } finally {
      setLoadingSlots(false);
    }
  }

  async function loadExistingBookings() {
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, user_id, coach_id, start_time, end_time, type, status")
        .eq("court", selectedCourt)
        .neq("status", "cancelled")
        .gte("start_time", `${dateStr}T00:00:00`)
        .lte("start_time", `${dateStr}T23:59:59`);

      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const { data: courtBlocks } = await supabase
        .from("court_blocks")
        .select("id, start_time, end_time, reason")
        .eq("court_id", selectedCourt)
        .gte("start_time", startOfDay.toISOString())
        .lte("start_time", endOfDay.toISOString());

      const userIds = [...new Set([
        ...(bookings?.map(b => b.user_id) || []),
        ...(bookings?.map(b => b.coach_id).filter(Boolean) || [])
      ])];

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      const profilesMap = new Map(
        profilesData?.map(p => [p.id, p]) || []
      );

      const enrichedBookings = bookings?.map(booking => ({
        ...booking,
        user_profile: profilesMap.get(booking.user_id) || null,
        coach_profile: booking.coach_id ? profilesMap.get(booking.coach_id) || null : null
      })) || [];

      const blocksAsBookings = courtBlocks?.map(block => ({
        id: block.id,
        start_time: block.start_time,
        end_time: block.end_time,
        type: "blocco",
        status: "blocked",
        user_profile: null,
        coach_profile: null,
        reason: block.reason,
        isBlock: true
      })) || [];

      const allBookings = [...enrichedBookings, ...blocksAsBookings];
      setExistingBookings(allBookings);

      // Mark occupied slots as unavailable
      setSlots(prevSlots => prevSlots.map(slot => {
        const isOccupied = allBookings.some(booking => {
          const start = new Date(booking.start_time);
          const end = new Date(booking.end_time);
          const [slotHour, slotMinute] = slot.time.split(':').map(Number);
          const slotDate = new Date(selectedDate);
          slotDate.setHours(slotHour, slotMinute, 0, 0);
          
          return slotDate >= start && slotDate < end;
        });
        
        return {
          ...slot,
          available: !isOccupied && slot.available
        };
      }));
    } catch (error) {
      console.error("Error loading existing bookings:", error);
      setExistingBookings([]);
    }
  }

  function generateDefaultSlots() {
    const timeSlots = [];
    for (let hour = 7; hour <= 21; hour++) {
      timeSlots.push({
        time: `${hour.toString().padStart(2, "0")}:00`,
        available: true,
      });
      timeSlots.push({
        time: `${hour.toString().padStart(2, "0")}:30`,
        available: true,
      });
    }
    timeSlots.push({ time: "22:00", available: true });
    setSlots(timeSlots);
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

  const handleCourtChange = (court: string) => {
    setSelectedCourt(court);
    setSelectedSlots([]);
  };

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    setSelectedSlots([]);
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

  const partnerOptions: SearchableOption[] = availablePartners.map((player) => ({
    value: player.id,
    label: player.full_name,
  }));

  const canSubmit = selectedDate && selectedCourt && selectedSlots.length > 0 &&
    ((matchType === "singolo") || (matchType === "doppio" && myPartner && opponentPartner));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div>
          <p className="breadcrumb text-secondary/60 uppercase">
            <Link
              href="/dashboard/atleta/arena"
              className="hover:text-secondary/80 transition-colors uppercase"
            >
              Arena
            </Link>
            {" › "}
            <span className="uppercase">Configura Sfida</span>
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-secondary">Configura sfida</h1>
          <p className="text-secondary/70 text-sm mt-1 max-w-2xl">
            Imposta i dettagli del match con {opponent.full_name}.
          </p>
        </div>
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
      <div className="bg-secondary rounded-xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-lg bg-white flex items-center justify-center overflow-hidden flex-shrink-0">
            {opponent.avatar_url ? (
              <img
                src={opponent.avatar_url}
                alt={opponent.full_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-2xl font-bold text-secondary">
                {opponent.full_name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">{opponent.full_name}</h3>
          </div>
        </div>
      </div>

      {/* Date Selector */}
      <div className="rounded-lg p-3 sm:p-4 flex items-center justify-between transition-all bg-secondary">
        <button
          onClick={() => handleDateChange(addDays(selectedDate, -1))}
          className="p-1.5 sm:p-2 rounded-md transition-colors hover:bg-white/10"
        >
          <span className="text-lg font-semibold text-white">&lt;</span>
        </button>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => {
              const input = document.getElementById('date-picker') as HTMLInputElement;
              if (input) input.showPicker();
            }}
            className="p-1.5 sm:p-2 rounded-md transition-colors hover:bg-white/10"
            title="Scegli data"
          >
            <Calendar className="h-5 w-5 text-white" />
          </button>
          <input
            id="date-picker"
            type="date"
            value={format(selectedDate, "yyyy-MM-dd")}
            onChange={(e) => handleDateChange(new Date(e.target.value))}
            min={getMinDate()}
            max={getMaxDate()}
            className="absolute opacity-0 pointer-events-none"
          />
          <h2 className="text-base sm:text-lg font-bold capitalize text-white">
            <span className="hidden sm:inline">{format(selectedDate, "EEEE dd MMMM yyyy", { locale: it })}</span>
            <span className="sm:hidden">{format(selectedDate, "EEE dd MMM yyyy", { locale: it })}</span>
          </h2>
        </div>

        <button
          onClick={() => handleDateChange(addDays(selectedDate, 1))}
          className="p-1.5 sm:p-2 rounded-md transition-colors hover:bg-white/10"
        >
          <span className="text-lg font-semibold text-white">&gt;</span>
        </button>
      </div>

      {/* Configuration Card */}
      <div className="bg-white rounded-xl p-6 space-y-6">
        {loadingSlots ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-secondary mb-4" />
            <p className="text-secondary font-semibold">Caricamento slot...</p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-secondary">Dettagli sfida</h2>
            </div>

            <div className="space-y-6 mt-6">
              {/* Tipo Sfida */}
              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Tipo sfida *</label>
                <div className="flex-1 flex flex-col sm:flex-row gap-2 sm:gap-3">
                  {CHALLENGE_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setChallengeType(type.value)}
                      className={`px-5 py-2 text-sm text-left rounded-lg border transition-all ${
                        challengeType === type.value
                          ? 'bg-secondary text-white border-secondary'
                          : 'bg-white text-secondary border-gray-300 hover:border-secondary'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tipo Match */}
              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Tipo match *</label>
                <div className="flex-1 flex flex-col sm:flex-row gap-2 sm:gap-3">
                  {MATCH_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setMatchType(type.value)}
                      className={`px-5 py-2 text-sm text-left rounded-lg border transition-all ${
                        matchType === type.value
                          ? 'bg-secondary text-white border-secondary'
                          : 'bg-white text-secondary border-gray-300 hover:border-secondary'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Partners se doppio */}
              {matchType === "doppio" && (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                    <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Il tuo partner</label>
                    <div className="flex-1">
                      <SearchableSelect
                        value={myPartner}
                        onChange={setMyPartner}
                        options={partnerOptions.filter(p => p.value !== opponentPartner)}
                        placeholder="Seleziona partner"
                        searchPlaceholder="Cerca partner..."
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                    <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Partner di {opponent.full_name}</label>
                    <div className="flex-1">
                      <SearchableSelect
                        value={opponentPartner}
                        onChange={setOpponentPartner}
                        options={partnerOptions.filter(p => p.value !== myPartner)}
                        placeholder="Seleziona partner"
                        searchPlaceholder="Cerca partner..."
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Formato Match */}
              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Formato match *</label>
                <div className="flex-1 flex flex-col sm:flex-row gap-2 sm:gap-3">
                  {MATCH_FORMATS.map((format) => (
                    <button
                      key={format.value}
                      type="button"
                      onClick={() => setMatchFormat(format.value)}
                      className={`px-5 py-2 text-sm text-left rounded-lg border transition-all ${
                        matchFormat === format.value
                          ? 'bg-secondary text-white border-secondary'
                          : 'bg-white text-secondary border-gray-300 hover:border-secondary'
                      }`}
                    >
                      {format.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Campo */}
              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Campo *</label>
                <div className="flex-1 flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
                  {COURTS.map((court) => (
                    <button
                      key={court}
                      type="button"
                      onClick={() => handleCourtChange(court)}
                      className={`px-5 py-2 text-sm text-left rounded-lg border transition-all ${
                        selectedCourt === court
                          ? 'bg-secondary text-white border-secondary'
                          : 'bg-white text-secondary border-gray-300 hover:border-secondary'
                      }`}
                    >
                      {court}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-sm font-semibold text-secondary mt-6 mb-2">Orari disponibili</p>
            
            {/* Timeline orizzontale */}
            <div
              ref={timelineScrollRef}
              className="overflow-x-auto scrollbar-hide cursor-grab active:cursor-grabbing"
              style={{ overflowX: 'scroll', WebkitOverflowScrolling: 'touch' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
            >
              <div className="min-w-[1280px]">
                {/* Header con orari */}
                <div className="grid timeline-grid grid-cols-[repeat(16,_minmax(80px,_1fr))] bg-secondary rounded-lg mb-3">
                  {Array.from({ length: 16 }, (_, i) => {
                    const hour = 7 + i;
                    return (
                      <div
                        key={hour}
                        className="p-3 text-center font-bold text-white text-xs flex items-center justify-center"
                      >
                        {hour.toString().padStart(2, '0')}:00
                      </div>
                    );
                  })}
                </div>

                {/* Griglia slot selezionabili */}
                <div className="grid timeline-grid grid-cols-[repeat(16,_minmax(80px,_1fr))] bg-white rounded-lg relative" style={{ minHeight: "70px" }}>
                  {/* Prenotazioni esistenti */}
                  {existingBookings.map((booking) => {
                    const start = new Date(booking.start_time);
                    const end = new Date(booking.end_time);
                    const startHour = start.getHours();
                    const startMinute = start.getMinutes();
                    const endHour = end.getHours();
                    const endMinute = end.getMinutes();
                    
                    const startSlot = (startHour - 7) * 2 + (startMinute === 30 ? 1 : 0);
                    const endSlot = (endHour - 7) * 2 + (endMinute === 30 ? 1 : 0);
                    const duration = endSlot - startSlot;
                    
                    const getBookingStyle = () => {
                      if (booking.isBlock) {
                        return { background: "linear-gradient(to bottom right, #dc2626, #ea580c)" };
                      }
                      switch (booking.type) {
                        case "lezione_privata":
                        case "lezione_gruppo":
                          return { background: "linear-gradient(to bottom right, var(--color-frozen-lake-900), var(--secondary))" };
                        case "campo":
                          return { background: "linear-gradient(to bottom right, var(--color-frozen-lake-700), var(--color-frozen-lake-800))" };
                        case "arena":
                          return { background: "linear-gradient(to bottom right, var(--color-frozen-lake-600), var(--color-frozen-lake-700))" };
                        default:
                          return { background: "linear-gradient(to bottom right, var(--secondary-light), var(--secondary))" };
                      }
                    };
                    
                    return (
                      <div
                        key={booking.id}
                        className="absolute p-2.5 text-white text-xs font-bold flex flex-col justify-center rounded-md mx-0.5 my-1.5 z-10 pointer-events-none"
                        style={{
                          ...getBookingStyle(),
                          left: `${(startSlot / 32) * 100}%`,
                          width: `${(duration / 32) * 100}%`,
                          top: '4px',
                          bottom: '4px'
                        }}
                      >
                        <div className="truncate leading-tight">
                          {booking.isBlock ? "CAMPO BLOCCATO" : (booking.user_profile?.full_name || "Prenotazione")}
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Slot cliccabili */}
                  {Array.from({ length: 16 }, (_, hourIndex) => {
                    const hour = 7 + hourIndex;
                    const time1 = `${hour.toString().padStart(2, '0')}:00`;
                    const time2 = hour < 22 ? `${hour.toString().padStart(2, '0')}:30` : null;
                    const available1 = slots.find(s => s.time === time1)?.available ?? true;
                    const available2 = time2 ? (slots.find(s => s.time === time2)?.available ?? true) : false;
                    const isSelected1 = selectedSlots.includes(time1);
                    const isSelected2 = time2 ? selectedSlots.includes(time2) : false;
                    
                    if (!time2) {
                      return (
                        <div
                          key={hour}
                          className={`border-r border-gray-200 relative transition-all ${
                            isSelected1
                              ? 'bg-secondary hover:bg-secondary/90 shadow-inner ring-2 ring-secondary ring-inset cursor-pointer'
                              : available1
                              ? 'bg-white hover:bg-emerald-100 hover:shadow-md cursor-pointer'
                              : 'bg-gray-100 cursor-not-allowed opacity-50'
                          }`}
                          onClick={() => handleSlotClick(time1, available1)}
                          title={`${time1} - ${available1 ? (isSelected1 ? 'Selezionato' : 'Disponibile') : 'Occupato'}`}
                        >
                          <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-px h-4 bg-gray-300" />
                          {isSelected1 && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-2 h-2 rounded-full bg-white shadow-sm" />
                            </div>
                          )}
                        </div>
                      );
                    }
                    
                    return (
                      <div key={hour} className="border-r border-gray-200 last:border-r-0 relative flex">
                        <div
                          className={`flex-1 relative transition-all ${
                            isSelected1
                              ? 'bg-secondary hover:bg-secondary/90 shadow-inner ring-2 ring-secondary ring-inset cursor-pointer'
                              : available1
                              ? 'bg-white hover:bg-emerald-100 hover:shadow-md cursor-pointer'
                              : 'bg-gray-100 cursor-not-allowed opacity-50'
                          }`}
                          onClick={() => handleSlotClick(time1, available1)}
                          title={`${time1} - ${available1 ? (isSelected1 ? 'Selezionato' : 'Disponibile') : 'Occupato'}`}
                        >
                          {isSelected1 && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-2 h-2 rounded-full bg-white shadow-sm" />
                            </div>
                          )}
                        </div>
                        
                        <div
                          className={`flex-1 relative transition-all ${
                            isSelected2
                              ? 'bg-secondary hover:bg-secondary/90 shadow-inner ring-2 ring-secondary ring-inset cursor-pointer'
                              : available2
                              ? 'bg-white hover:bg-emerald-100 hover:shadow-md cursor-pointer'
                              : 'bg-gray-100 cursor-not-allowed opacity-50'
                          }`}
                          onClick={() => handleSlotClick(time2, available2)}
                          title={`${time2} - ${available2 ? (isSelected2 ? 'Selezionato' : 'Disponibile') : 'Occupato'}`}
                        >
                          {isSelected2 && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-2 h-2 rounded-full bg-white shadow-sm" />
                            </div>
                          )}
                        </div>
                        
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-px h-4 bg-gray-300" />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Message */}
            <div className="mt-6">
              <label className="block text-sm font-semibold text-secondary mb-3">
                <MessageSquare className="h-4 w-4 inline mr-2" />
                Messaggio (opzionale)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Aggiungi un messaggio alla tua sfida (verrà creata una chat)..."
                rows={4}
                maxLength={500}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary resize-none"
              />
              <p className="text-xs text-gray-500 mt-2">{message.length}/500 caratteri</p>
            </div>
          </>
        )}
      </div>

      {/* Bottone Salva */}
      <button
        onClick={handleSubmit}
        disabled={sending || !canSubmit}
        className="w-full px-6 py-3 bg-secondary hover:opacity-90 disabled:bg-secondary/20 disabled:text-secondary/40 text-white font-medium rounded-md transition-all flex items-center justify-center gap-3"
      >
        {sending ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Invio in corso...</span>
          </>
        ) : (
          <>
            <CheckCircle className="h-5 w-5" />
            <span>Invia Sfida</span>
          </>
        )}
      </button>

      {/* Bottom Spacer */}
      <div className="h-8" />
    </div>
  );
}
