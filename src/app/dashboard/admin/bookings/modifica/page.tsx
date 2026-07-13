"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, AlertCircle, ChevronLeft, ChevronRight, CheckCircle, X } from "lucide-react";
import {
  Modal,
  ModalContent,
  ModalBody,
  ModalFooter,
} from "@/components/ui";

import { supabase } from "@/lib/supabase/client";
import { getCourts } from "@/lib/courts/getCourts";
import { DEFAULT_COURTS } from "@/lib/courts/constants";
import ParticipantsCard from "@/components/bookings/ParticipantsCard";
import CoachCard from "@/components/bookings/CoachCard";
import { isBookableCoachProfile, type UserRole } from "@/lib/roles";
import { useDragScroll } from "@/components/admin/hooks/useDragScroll";
import { MATCH_FORMATS, type MatchFormat } from "@/lib/bookings/bookingTypes";

interface Booking {
  id: string;
  user_id: string;
  court: string;
  start_time: string;
  end_time: string;
  type: string;
  coach_id?: string | null;
  notes: string | null;
  user_profile?: {
    full_name: string | null;
    email: string | null;
    phone?: string | null;
  };
  participants?: Array<{
    id?: string;
    booking_id?: string;
    full_name: string;
    email?: string;
    phone?: string;
    is_registered: boolean;
    user_id?: string | null;
    order_index?: number;
  }>;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

interface ExistingBooking {
  id: string;
  start_time: string;
  end_time: string;
  type: string;
  status: string;
  user_id?: string;
  coach_id?: string;
  user_profile?: { full_name: string | null; email?: string | null } | null;
  coach_profile?: { full_name: string | null; email?: string | null } | null;
  participants?: Array<{
    id?: string;
    booking_id?: string;
    full_name: string;
    email?: string;
    phone?: string;
    is_registered: boolean;
    user_id?: string | null;
    order_index?: number;
  }>;
  isBlock?: boolean;
  reason?: string;
}

const BOOKING_TYPES = [
  { value: "campo", label: "Campo", shortLabel: "Campo" },
  { value: "lezione_privata", label: "Lezione Privata", shortLabel: "Privata" },
];

interface AthleteProfile {
  id: string;
  full_name: string | null;
  email: string;
  phone?: string | null;
  role: UserRole;
}

type SelectedAthlete = {
  userId?: string;
  fullName: string;
  email?: string;
  phone?: string;
  isRegistered: boolean;
};

type AdminEditBookingPageProps = {
  basePath?: string;
};

export default function AdminEditBookingPage({ basePath = "/dashboard/admin" }: AdminEditBookingPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("id");
  const bookingCardClassName = "bg-white border border-black/10 rounded-lg overflow-hidden";
  const bookingCardHeaderClassName = "px-4 sm:px-6 py-4 border-b border-black/10 bg-gradient-to-r from-secondary/5 to-transparent";

  const [booking, setBooking] = useState<Booking | null>(null);
  const [selectedCourt, setSelectedCourt] = useState("");
  const [courts, setCourts] = useState<string[]>(DEFAULT_COURTS);
  const [courtsLoading, setCourtsLoading] = useState(true);
  const [bookingType, setBookingType] = useState<string>("campo");
  const [coaches, setCoaches] = useState<{ id: string; full_name: string; email?: string }[]>([]);
  const [selectedCoaches, setSelectedCoaches] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [existingBookings, setExistingBookings] = useState<ExistingBooking[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [matchFormat, setMatchFormat] = useState<MatchFormat>("singolo");
  const [selectedAthletes, setSelectedAthletes] = useState<SelectedAthlete[]>([]);
  const [athletes, setAthletes] = useState<AthleteProfile[]>([]);
  const [previousGuests, setPreviousGuests] = useState<{ fullName: string; email?: string; phone?: string }[]>([]);

  const [datePickerModalOpen, setDatePickerModalOpen] = useState(false);
  const [pendingDate, setPendingDate] = useState<Date>(() => new Date());
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });

  const { scrollRef, handleMouseDown, handleMouseMove, handleMouseUp, handleMouseLeave } = useDragScroll();

  const getPrimaryParticipant = (bookingItem: ExistingBooking | null) =>
    bookingItem?.participants?.find((participant) => participant.full_name?.trim().length > 0) || null;

  const getBookingDisplayName = (bookingItem: ExistingBooking) =>
    getPrimaryParticipant(bookingItem)?.full_name || bookingItem.user_profile?.full_name || "Sconosciuto";

  useEffect(() => {
    if (!bookingId) {
      setError("Prenotazione non trovata");
      setLoading(false);
      return;
    }

    const loadBooking = async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("bookings")
        .select("id, user_id, court, start_time, end_time, notes, type, coach_id")
        .eq("id", bookingId)
        .single();

      if (error) {
        setError("Errore nel caricamento della prenotazione");
      } else if (data) {
        let userProfile: { full_name: string | null; email: string | null; phone?: string | null } | undefined;
        let participantsData = null;

        // Carica i dati dell'atleta associato alla prenotazione
        if (data.user_id) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("full_name, email, phone")
            .eq("id", data.user_id)
            .single();

          if (profileData) {
            userProfile = {
              full_name: profileData.full_name ?? null,
              email: profileData.email ?? null,
              phone: profileData.phone ?? null,
            };
          }
        }

        const participantsQuery = await supabase
          .from("booking_participants")
          .select("id, booking_id, full_name, email, phone, is_registered, user_id, order_index")
          .eq("booking_id", bookingId)
          .order("order_index", { ascending: true });
        participantsData = participantsQuery.data;

        setBooking({ ...data, user_profile: userProfile, participants: participantsData || [] } as Booking);
        setSelectedCourt(data.court);
        setBookingType(data.type || "campo");
        setSelectedCoaches(data.coach_id ? [data.coach_id] : []);
        setSelectedDate(new Date(data.start_time));

        // Pre-compila gli slot selezionati a partire da start_time / end_time (ogni 30 min)
        const existingStart = new Date(data.start_time);
        const existingEnd = new Date(data.end_time);
        const initialSlots: string[] = [];
        const current = new Date(existingStart);
        while (current < existingEnd) {
          const hours = current.getHours().toString().padStart(2, "0");
          const minutes = current.getMinutes().toString().padStart(2, "0");
          initialSlots.push(`${hours}:${minutes}`);
          current.setMinutes(current.getMinutes() + 30);
        }
        setSelectedSlots(initialSlots);

        setNotes(data.notes || "");

        const participantsForEdit: SelectedAthlete[] = (participantsData || []).map((p: any) => ({
          userId: p.user_id || undefined,
          fullName: p.full_name || "",
          email: p.email || undefined,
          phone: p.phone || undefined,
          isRegistered: p.is_registered || false,
        }));
        setSelectedAthletes(participantsForEdit);
        setMatchFormat((participantsData?.length || 0) > 2 ? "doppio" : "singolo");
      }

      setLoading(false);
    };

    void loadBooking();
  }, [bookingId]);

  // Carica elenco maestri
  useEffect(() => {
    const loadCoachesAndAthletes = async () => {
      try {
        const courtsData = await getCourts();
        setCourts(courtsData);
        if (!selectedCourt && courtsData.length > 0) {
          setSelectedCourt(courtsData[0]);
        }

        const [coachRes, athleteRes] = await Promise.all([
          supabase.from("profiles").select("id, full_name, email, role, metadata").in("role", ["maestro", "gestore"]).order("full_name"),
          supabase.from("profiles").select("id, full_name, email, phone, role").eq("role", "atleta").order("full_name"),
        ]);
        if (coachRes.data) {
          const eligibleCoaches = coachRes.data
            .filter((coach) => isBookableCoachProfile(coach))
            .map(({ id, full_name, email }) => ({ id, full_name, email: email ?? undefined }));

          setCoaches(eligibleCoaches as { id: string; full_name: string; email?: string }[]);
        }
        if (athleteRes.data) setAthletes(athleteRes.data as AthleteProfile[]);

        const { data: guestsData } = await supabase
          .from("booking_participants")
          .select("full_name, email, phone")
          .eq("is_registered", false)
          .order("full_name");

        if (guestsData) {
          const seen = new Set<string>();
          const deduped: { fullName: string; email?: string; phone?: string }[] = guestsData.reduce((acc: { fullName: string; email?: string; phone?: string }[], g) => {
            const key = g.full_name.trim().toLowerCase();
            if (!seen.has(key)) {
              seen.add(key);
              acc.push({ fullName: g.full_name.trim(), email: g.email ?? undefined, phone: g.phone ?? undefined });
            }
            return acc;
          }, []);
          setPreviousGuests(deduped);
        }
      } finally {
        setCourtsLoading(false);
      }
    };

    void loadCoachesAndAthletes();
  }, []);

  // Carica/aggiorna gli slot disponibili per la data e il campo selezionati
  useEffect(() => {
    const loadSlots = async () => {
      if (!bookingId || !selectedDate || !selectedCourt) return;

      setLoadingSlots(true);

      try {
        const dateStr = selectedDate.toISOString().split("T")[0];

        // Get existing bookings for this court and date
        const { data: bookingsData } = await supabase
          .from("bookings")
          .select("id, start_time, end_time, status, type, user_id, coach_id")
          .eq("court", selectedCourt)
          .neq("status", "cancelled")
          .neq("status", "rejected")
          .lt("start_time", `${dateStr}T23:59:59.999Z`)
          .gt("end_time", `${dateStr}T00:00:00.000Z`);

        // Get court blocks for this court and date
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);

        const { data: blocksData } = await supabase
          .from("court_blocks")
          .select("id, start_time, end_time, reason")
          .eq("court_id", selectedCourt)
          .eq("is_disabled", false)
          .lt("start_time", `${dateStr}T23:59:59.999Z`)
          .gt("end_time", `${dateStr}T00:00:00.000Z`);

        // Fetch profiles for bookings
        const userIds = [...new Set([
          ...(bookingsData?.map(b => b.user_id) || []),
          ...(bookingsData?.map(b => b.coach_id).filter(Boolean) || [])
        ])];

        const profilesMap = new Map();
        if (userIds.length > 0) {
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, full_name, email")
            .in("id", userIds);

          profilesData?.forEach(profile => {
            profilesMap.set(profile.id, profile);
          });
        }

        const bookingIds = bookingsData?.map((bookingItem) => bookingItem.id) || [];
        let bookingParticipantsData = null;

        if (bookingIds.length > 0) {
          const participantsQuery = await supabase
            .from("booking_participants")
            .select("id, booking_id, full_name, email, phone, is_registered, user_id, order_index")
            .in("booking_id", bookingIds)
            .order("booking_id", { ascending: true })
            .order("order_index", { ascending: true });

          bookingParticipantsData = participantsQuery.data;

          if (participantsQuery.error?.message?.toLowerCase().includes("phone")) {
            const fallbackParticipantsQuery = await supabase
              .from("booking_participants")
              .select("id, booking_id, full_name, email, is_registered, user_id, order_index")
              .in("booking_id", bookingIds)
              .order("booking_id", { ascending: true })
              .order("order_index", { ascending: true });

            bookingParticipantsData = fallbackParticipantsQuery.data;
          }
        }

        const participantsMap = new Map<string, ExistingBooking["participants"]>();
        (bookingParticipantsData || []).forEach((participant: any) => {
          const existing = participantsMap.get(participant.booking_id) || [];
          existing.push(participant);
          participantsMap.set(participant.booking_id, existing);
        });

        // Enrich bookings with profiles
        const enrichedBookings = bookingsData?.map((b: any) => ({
          id: b.id,
          start_time: b.start_time,
          end_time: b.end_time,
          type: b.type,
          status: b.status,
          user_id: b.user_id,
          coach_id: b.coach_id,
          user_profile: b.user_id ? profilesMap.get(b.user_id) : undefined,
          coach_profile: b.coach_id ? profilesMap.get(b.coach_id) : undefined,
          participants: participantsMap.get(b.id) || [],
        })) || [];

        // Add court blocks as fake bookings for visualization
        const blocksAsBookings = blocksData?.map((block: any) => ({
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

        const allBookings: ExistingBooking[] = [...enrichedBookings, ...blocksAsBookings];

        setExistingBookings(allBookings);

        const occupiedSlots = new Set<string>();

        // Mark slots occupied by bookings and blocks
        allBookings.forEach((b) => {
          // Ignora la prenotazione che stiamo modificando
          if (b.id === bookingId && !b.isBlock) return;

          const start = new Date(b.start_time);
          const end = new Date(b.end_time);

          const current = new Date(start);
          while (current < end) {
            const hours = current.getHours().toString().padStart(2, "0");
            const minutes = current.getMinutes().toString().padStart(2, "0");
            occupiedSlots.add(`${hours}:${minutes}`);
            current.setMinutes(current.getMinutes() + 30);
          }
        });

        // Generate slots every 30 minutes (07:00 - 22:00)
        const generatedSlots: TimeSlot[] = [];
        const now = new Date();
        const isToday = selectedDate.toDateString() === now.toDateString();

        for (let hour = 7; hour <= 22; hour++) {
          for (const minute of [0, 30]) {
            if (hour === 22 && minute === 30) break;

            const time = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;

            // Slot disponibile se non è già occupato
            let available = !occupiedSlots.has(time);

            // If today, check if slot is in the past
            if (isToday) {
              const slotTime = new Date(selectedDate);
              slotTime.setHours(hour, minute, 0, 0);
              if (slotTime <= now) {
                available = false;
              }
            }

            generatedSlots.push({ time, available });
          }
        }

        setSlots(generatedSlots);
      } finally {
        setLoadingSlots(false);
      }
    };

    void loadSlots();
  }, [bookingId, selectedDate, selectedCourt]);

  // Verifica disponibilità slot
  const isSlotAvailable = (time: string): boolean => {
    if (!selectedCourt) return true;
    const slot = slots.find(s => s.time === time);
    // Gli slot selezionati sono sempre disponibili
    if (selectedSlots.includes(time)) return true;
    return slot ? slot.available : false;
  };

  // Gestione selezione multipla di slot consecutivi
  const toggleSlotSelection = (time: string, available: boolean) => {
    if (!available) return;

    setSelectedSlots((prev) => {
      // se già selezionato, deseleziona
      if (prev.includes(time)) {
        return prev.filter((t) => t !== time);
      }

      // prima selezione
      if (prev.length === 0) {
        return [time];
      }

      const allSlots = [...prev, time].sort((a, b) => {
        const [hA, mA] = a.split(":").map(Number);
        const [hB, mB] = b.split(":").map(Number);
        return hA * 60 + mA - (hB * 60 + mB);
      });

      // verifica se sono consecutivi (ogni slot è 30 minuti)
      for (let i = 1; i < allSlots.length; i++) {
        const [hPrev, mPrev] = allSlots[i - 1].split(":").map(Number);
        const [hCurr, mCurr] = allSlots[i].split(":").map(Number);
        const prevMinutes = hPrev * 60 + mPrev;
        const currMinutes = hCurr * 60 + mCurr;
        if (currMinutes - prevMinutes !== 30) {
          return [time]; // non consecutivi, resetta
        }
      }

      return allSlots;
    });
  };

  const maxAthletesAllowed =
    bookingType === "lezione_privata" ? 1
    : bookingType === "campo" && matchFormat === "singolo" ? 2 : 4;

  const canSave = selectedAthletes.length > 0 && !!selectedDate && !!selectedCourt && selectedSlots.length > 0 &&
    ((bookingType === "campo") || ((bookingType === "lezione_privata" || bookingType === "lezione_gruppo") && selectedCoaches.length > 0));

  useEffect(() => {
    setSelectedAthletes((prev) => {
      if (prev.length <= maxAthletesAllowed) {
        return prev;
      }
      return prev.slice(0, maxAthletesAllowed);
    });
  }, [maxAthletesAllowed]);

  const handleMatchFormatChange = (format: MatchFormat) => {
    setMatchFormat(format);
    if (format === "singolo" && selectedAthletes.length > 2) {
      setSelectedAthletes(prev => prev.slice(0, 2));
    }
  };

  async function handleSave() {
    if (!bookingId) return;

    setSaving(true);
    setError(null);

    try {
      if (!selectedDate || !selectedCourt || selectedSlots.length === 0) {
        throw new Error("Seleziona giorno, campo e almeno uno slot orario");
      }

      if (selectedAthletes.length === 0) {
        throw new Error("Seleziona almeno un atleta/partecipante");
      }

      if (selectedAthletes.length > maxAthletesAllowed) {
        throw new Error(`Massimo ${maxAthletesAllowed} partecipanti per questa prenotazione`);
      }

      if ((bookingType === "lezione_privata" || bookingType === "lezione_gruppo") && selectedCoaches.length === 0) {
        throw new Error("Seleziona almeno un maestro per le lezioni");
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (sessionError || !token) {
        throw new Error("Sessione non valida. Effettua nuovamente il login.");
      }

      const registeredAthlete = selectedAthletes.find((athlete) => athlete.isRegistered && athlete.userId);
      const bookingUserId = registeredAthlete?.userId ?? booking?.user_id ?? sessionData?.session?.user?.id;

      if (!bookingUserId) {
        throw new Error("Impossibile determinare l'utente della prenotazione");
      }

      const orderedSlots = [...selectedSlots].sort((a, b) => {
        const [hA, mA] = a.split(":").map(Number);
        const [hB, mB] = b.split(":").map(Number);
        return hA * 60 + mA - (hB * 60 + mB);
      });
      const [hours, minutes] = orderedSlots[0].split(":").map(Number);
      const startDate = new Date(selectedDate);
      startDate.setHours(hours, minutes, 0, 0);

      const endDate = new Date(startDate);
      const durationMinutes = orderedSlots.length * 30; // ogni slot dura 30 minuti
      endDate.setMinutes(startDate.getMinutes() + durationMinutes);

      const bookingResponse = await fetch(`/api/bookings?id=${encodeURIComponent(bookingId)}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: bookingUserId,
          court: selectedCourt,
          type: bookingType || "campo",
          coach_id:
            bookingType === "lezione_privata" || bookingType === "lezione_gruppo"
              ? selectedCoaches[0] || null
              : null,
          start_time: startDate.toISOString(),
          end_time: endDate.toISOString(),
          notes: notes || null,
        }),
      });

      if (!bookingResponse.ok) {
        const payload = await bookingResponse.json().catch(() => ({}));
        throw new Error(payload?.error || "Errore durante l'aggiornamento della prenotazione");
      }

      const { error: deleteParticipantsError } = await supabase
        .from("booking_participants")
        .delete()
        .eq("booking_id", bookingId);

      if (deleteParticipantsError) throw deleteParticipantsError;

      if (selectedAthletes.length > 0) {
        const participantsPayload = selectedAthletes.map((athlete, index) => ({
          booking_id: bookingId,
          user_id: athlete.userId || null,
          full_name: athlete.fullName,
          email: athlete.email || null,
          phone: athlete.phone || null,
          is_registered: athlete.isRegistered,
          order_index: index,
        }));

        let { error: insertParticipantsError } = await supabase
          .from("booking_participants")
          .insert(participantsPayload);

        if (insertParticipantsError?.message?.toLowerCase().includes("phone")) {
          const fallbackPayload = selectedAthletes.map((athlete, index) => ({
            booking_id: bookingId,
            user_id: athlete.userId || null,
            full_name: athlete.fullName,
            email: athlete.email || null,
            is_registered: athlete.isRegistered,
            order_index: index,
          }));

          const { error: fallbackInsertError } = await supabase
            .from("booking_participants")
            .insert(fallbackPayload);

          insertParticipantsError = fallbackInsertError || null;
        }

        if (insertParticipantsError) throw insertParticipantsError;
      }

      setSuccess("Prenotazione aggiornata con successo!");
      setTimeout(() => {
        router.push(`${basePath}/bookings`);
      }, 1200);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Errore durante l'aggiornamento della prenotazione"
      );
    } finally {
      setSaving(false);
    }
  }

  const WEEK_DAYS = ["lu", "ma", "me", "gi", "ve", "sa", "do"];

  const calendarDays = useMemo(() => {
    const firstOfMonth = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), 1);
    const mondayBasedDayIndex = (firstOfMonth.getDay() + 6) % 7;
    const gridStartDate = new Date(firstOfMonth);
    gridStartDate.setDate(firstOfMonth.getDate() - mondayBasedDayIndex);
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStartDate);
      date.setDate(gridStartDate.getDate() + index);
      return { date, isCurrentMonth: date.getMonth() === calendarViewDate.getMonth() };
    });
  }, [calendarViewDate]);

  function normalizeDate(date: Date): Date {
    const d = new Date(date); d.setHours(12, 0, 0, 0); return d;
  }

  function isSameCalendarDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function openDatePickerModal() {
    if (!selectedDate) return;
    const n = normalizeDate(selectedDate);
    setPendingDate(n);
    setCalendarViewDate(new Date(n.getFullYear(), n.getMonth(), 1));
    setDatePickerModalOpen(true);
  }

  function changeCalendarMonth(delta: number) {
    setCalendarViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }

  function selectCalendarDay(day: Date) {
    const n = normalizeDate(day);
    setPendingDate(n);
    setCalendarViewDate(new Date(n.getFullYear(), n.getMonth(), 1));
  }

  function applyDateSelection() {
    setSelectedDate(normalizeDate(pendingDate));
    setSelectedSlots([]);
    setDatePickerModalOpen(false);
  }

  function handleDatePickerToday() {
    const today = normalizeDate(new Date());
    setPendingDate(today);
    setCalendarViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
  }

  function getCalendarMonthLabel(date: Date): string {
    const label = date.toLocaleDateString("it-IT", { month: "long", year: "numeric" });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  function formatDateHeader(short: boolean = false): string {
    if (!selectedDate) return "";
    if (short) {
      const formatted = selectedDate.toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
      return formatted.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    }
    const formatted = selectedDate.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    return formatted.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }

  if (!bookingId) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600">ID prenotazione mancante.</p>
        <Link href={`${basePath}/bookings`} className="text-sm text-secondary underline">
          Torna alle prenotazioni
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-3">
      {/* Messages */}
      {error && (
        <div>
          <div className="bg-red-50 border border-black/10 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-900">Errore</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div>
          <div className="bg-green-50 border border-black/10 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-green-900">Successo</p>
              <p className="text-sm text-green-700 mt-1">{success}</p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-secondary" />
        </div>
      ) : (
        <div>
          <div className="space-y-6">
            {/* Selettore Data */}
            {selectedDate && (
              <div className="rounded-lg p-3 sm:p-4 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center transition-all bg-secondary">
                <button
                  type="button"
                  onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d); setSelectedSlots([]); }}
                  className="justify-self-start h-9 w-9 sm:h-10 sm:w-10 rounded-lg transition-colors hover:bg-white/10 inline-flex items-center justify-center"
                >
                  <span className="text-lg font-semibold text-white">&lt;</span>
                </button>

                <div className="min-w-0 flex justify-center">
                  <button
                    type="button"
                    onClick={openDatePickerModal}
                    className="relative inline-flex items-center justify-center rounded-lg px-1.5 sm:px-2 py-1 transition-colors hover:bg-white/10"
                    title="Scegli data"
                  >
                    <span className="inline-flex items-center justify-center sm:hidden" style={{ gap: "6px" }}>
                      <span className="font-bold text-white text-xl leading-none text-center whitespace-nowrap">
                        {formatDateHeader(true)}
                      </span>
                    </span>
                    <span className="hidden min-w-0 sm:inline-flex sm:items-center sm:gap-2">
                      <span className="font-bold text-white text-xl leading-none text-left min-w-0 truncate max-w-none capitalize">
                        {formatDateHeader()}
                      </span>
                    </span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d); setSelectedSlots([]); }}
                  className="justify-self-end h-9 w-9 sm:h-10 sm:w-10 rounded-lg transition-colors hover:bg-white/10 inline-flex items-center justify-center"
                >
                  <span className="text-lg font-semibold text-white">&gt;</span>
                </button>
              </div>
            )}

            {/* Card Dettagli prenotazione */}
            <div className={bookingCardClassName}>
              <div className={bookingCardHeaderClassName}>
                <h2 className="text-base sm:text-lg font-semibold text-secondary">Dettagli prenotazione</h2>
              </div>
              {courtsLoading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="h-10 w-10 animate-spin text-secondary mb-3" />
                  <p className="text-secondary font-semibold">Caricamento...</p>
                </div>
              ) : (
              <div className="space-y-6 p-4 sm:p-6">
                {/* Tipo prenotazione */}
                <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                  <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Tipo prenotazione</label>
                  <div className="flex-1 flex flex-col sm:grid sm:grid-cols-2 gap-2 sm:gap-3">
                    {BOOKING_TYPES.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => {
                          setBookingType(type.value);
                        }}
                        className={`w-full px-3 sm:px-5 py-2 text-sm text-center rounded-lg border transition-all ${
                          bookingType === type.value
                            ? 'bg-secondary text-white border-secondary'
                            : 'bg-white text-secondary border-gray-300 hover:border-secondary'
                        }`}
                      >
                        <span className="sm:hidden">{type.shortLabel}</span>
                        <span className="hidden sm:inline">{type.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Modalità campo */}
                {bookingType === "campo" && (
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                    <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Modalità</label>
                    <div className="flex-1 flex flex-col sm:grid sm:grid-cols-2 gap-2 sm:gap-3">
                      {MATCH_FORMATS.map((formatOption) => (
                        <button
                          key={formatOption.value}
                          type="button"
                          onClick={() => handleMatchFormatChange(formatOption.value)}
                          className={`w-full px-3 sm:px-5 py-2 text-sm text-center rounded-lg border transition-all ${
                            matchFormat === formatOption.value
                              ? "bg-secondary text-white border-secondary"
                              : "bg-white text-secondary border-gray-300 hover:border-secondary"
                          }`}
                        >
                          {formatOption.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Campo */}
                <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8">
                  <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Campo</label>
                  <div className="flex-1 flex flex-col sm:grid sm:grid-cols-4 gap-2 sm:gap-3">
                    {courts.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          setSelectedCourt(c);
                          setSelectedSlots([]);
                        }}
                        className={`w-full px-4 sm:px-5 py-2 text-sm text-center rounded-lg border transition-all ${
                          selectedCourt === c
                            ? 'bg-secondary text-white border-secondary'
                            : 'bg-white text-secondary border-gray-300 hover:border-secondary'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              )}
            </div>

            {/* Card Maestro - solo per lezione privata/gruppo */}
            {(bookingType === "lezione_privata" || bookingType === "lezione_gruppo") && (
              <CoachCard
                coaches={coaches}
                selectedCoaches={selectedCoaches}
                onChange={setSelectedCoaches}
              />
            )}

            {/* Card Partecipanti */}
            <ParticipantsCard
              athletes={athletes}
              selectedAthletes={selectedAthletes}
              onAthleteAdd={(athlete) => setSelectedAthletes((prev) => [...prev, athlete])}
              onAthleteRemove={(index) =>
                setSelectedAthletes((prev) => prev.filter((_, i) => i !== index))
              }
              maxAthletes={maxAthletesAllowed}
              previousGuests={previousGuests}
            />

            {/* Card Orari disponibili */}
            <div className={bookingCardClassName}>
              <div className={`${bookingCardHeaderClassName} flex items-center justify-between gap-4`}>
                <h2 className="text-base sm:text-lg font-semibold text-secondary">Orari disponibili</h2>
              </div>
              <div className="p-4 sm:p-6">
                {loadingSlots ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="h-12 w-12 animate-spin text-secondary mb-4" />
                    <p className="text-secondary font-semibold">Caricamento slot...</p>
                  </div>
                ) : (
                  <div
                    ref={scrollRef}
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
                        {existingBookings.filter((b) => b.status !== "cancelled").map((b) => {
                          if (b.id === bookingId && !b.isBlock) return null;
                          const start = new Date(b.start_time);
                          const end = new Date(b.end_time);
                          const startSlot = (start.getHours() - 7) * 2 + (start.getMinutes() === 30 ? 1 : 0);
                          const endSlot = (end.getHours() - 7) * 2 + (end.getMinutes() === 30 ? 1 : 0);
                          const duration = endSlot - startSlot;
                          const getStyle = () => {
                            if (b.isBlock) return { background: "linear-gradient(to bottom right, #dc2626, #ea580c)" };
                            if (b.status === "cancelled") return { background: "linear-gradient(to bottom right, #6b7280, #4b5563)" };
                            switch (b.type) {
                              case "lezione_privata": case "lezione_gruppo":
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
                              key={b.id}
                              onClick={() => router.push(b.isBlock ? `${basePath}/courts/${b.id}` : `${basePath}/bookings/${b.id}`)}
                              className="absolute p-2.5 text-white text-xs font-bold flex flex-col justify-center rounded-lg z-10 cursor-pointer hover:opacity-90 transition-opacity"
                              style={{ ...getStyle(), left: `${(startSlot / 32) * 100}%`, width: `calc(${(duration / 32) * 100}% - 4px)`, top: '4px', bottom: '4px', marginLeft: '2px' }}
                            />
                          );
                        })}

                        {/* Slot cliccabili */}
                        {Array.from({ length: 16 }, (_, hourIndex) => {
                          const hour = 7 + hourIndex;
                          const time1 = `${hour.toString().padStart(2, '0')}:00`;
                          const time2 = hour < 22 ? `${hour.toString().padStart(2, '0')}:30` : null;
                          const available1 = isSlotAvailable(time1);
                          const available2 = time2 ? isSlotAvailable(time2) : false;
                          const isSelected1 = selectedSlots.includes(time1);
                          const isSelected2 = time2 ? selectedSlots.includes(time2) : false;

                          if (!time2) {
                            return (
                              <div
                                key={hour}
                                className={`border-r border-gray-200 relative transition-colors cursor-pointer ${
                                  isSelected1 ? 'bg-secondary hover:bg-secondary/90'
                                  : available1 ? 'bg-white hover:bg-emerald-50/40'
                                  : 'bg-gray-100 cursor-not-allowed'
                                }`}
                                onClick={() => toggleSlotSelection(time1, available1)}
                                title={`${time1} - ${available1 ? (isSelected1 ? 'Selezionato' : 'Disponibile') : 'Occupato'}`}
                              >
                                <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-px h-4 bg-gray-300" />
                              </div>
                            );
                          }

                          return (
                            <div key={hour} className="border-r border-gray-200 last:border-r-0 relative flex">
                              <div
                                className={`flex-1 relative transition-colors cursor-pointer ${
                                  isSelected1 ? 'bg-secondary hover:bg-secondary/90'
                                  : available1 ? 'bg-white hover:bg-emerald-50/40'
                                  : 'bg-gray-100 cursor-not-allowed'
                                }`}
                                onClick={() => toggleSlotSelection(time1, available1)}
                                title={`${time1} - ${available1 ? (isSelected1 ? 'Selezionato' : 'Disponibile') : 'Occupato'}`}
                              />
                              <div
                                className={`flex-1 relative transition-colors cursor-pointer ${
                                  isSelected2 ? 'bg-secondary hover:bg-secondary/90'
                                  : available2 ? 'bg-white hover:bg-emerald-50/40'
                                  : 'bg-gray-100 cursor-not-allowed'
                                }`}
                                onClick={() => toggleSlotSelection(time2, available2)}
                                title={`${time2} - ${available2 ? (isSelected2 ? 'Selezionato' : 'Disponibile') : 'Occupato'}`}
                              />
                              <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-px h-4 bg-gray-300" />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Card Note */}
            <div className={bookingCardClassName}>
              <div className={bookingCardHeaderClassName}>
                <h2 className="text-base sm:text-lg font-semibold text-secondary">Note</h2>
              </div>
              <div className="p-4 sm:p-6">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Eventuali note..."
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus-visible:ring-0 focus-visible:border-black/10 resize-none"
                />
              </div>
            </div>

            {/* Bottone Salva */}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !canSave}
              className="w-full px-6 py-3 bg-secondary hover:opacity-90 disabled:bg-secondary/20 disabled:text-secondary/40 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-3"
            >
              {saving ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Salvataggio...</span>
                </>
              ) : (
                <span>Salva Modifiche</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Bottom Spacer */}
      <div className="h-8" />

      {/* Date Picker Modal */}
      <Modal open={datePickerModalOpen} onOpenChange={setDatePickerModalOpen}>
        <ModalContent size="sm" className="overflow-hidden rounded-lg !border-gray-200 shadow-xl !bg-white dark:!bg-white dark:!border-gray-200" showBuiltinClose={false}>
          <div className="flex items-center justify-between px-4 py-3 bg-secondary border-b border-secondary">
            <h3 className="text-base font-semibold text-white">Seleziona Data</h3>
            <button
              type="button"
              onClick={() => setDatePickerModalOpen(false)}
              className="p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="h-5 w-5 text-white/70" />
            </button>
          </div>
          <ModalBody className="px-4 py-4 bg-white dark:!bg-white">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => changeCalendarMonth(-1)}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-black/10 text-secondary hover:bg-gray-50 transition-colors"
                  aria-label="Mese precedente"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <p className="text-sm font-semibold text-gray-900 capitalize">
                  {getCalendarMonthLabel(calendarViewDate)}
                </p>
                <button
                  type="button"
                  onClick={() => changeCalendarMonth(1)}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-black/10 text-secondary hover:bg-gray-50 transition-colors"
                  aria-label="Mese successivo"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-500 uppercase">
                {WEEK_DAYS.map((day) => (
                  <span key={day} className="py-1">{day}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map(({ date, isCurrentMonth }) => {
                  const isSelected = isSameCalendarDay(date, pendingDate);
                  const isTodayDate = isSameCalendarDay(date, new Date());
                  return (
                    <button
                      key={date.toISOString()}
                      type="button"
                      onClick={() => selectCalendarDay(date)}
                      className={`h-9 rounded-lg text-sm transition-colors ${
                        isSelected
                          ? "bg-secondary text-white font-semibold"
                          : isCurrentMonth
                          ? "text-gray-800 hover:bg-gray-100"
                          : "text-gray-400 hover:bg-gray-50"
                      } ${!isSelected && isTodayDate ? "ring-1 ring-secondary/40" : ""}`}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          </ModalBody>
          <ModalFooter className="p-0 border-t border-gray-200 bg-white dark:!bg-white dark:!border-gray-200">
            <button
              type="button"
              onClick={handleDatePickerToday}
              className="flex-1 py-3 border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
            >
              Oggi
            </button>
            <button
              type="button"
              onClick={applyDateSelection}
              className="flex-1 py-3 bg-secondary text-white font-semibold hover:opacity-90 transition-opacity"
            >
              Applica
            </button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
