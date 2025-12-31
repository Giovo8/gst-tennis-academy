"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDays,
  addHours,
  format,
  isSameDay,
  setHours,
  setMinutes,
} from "date-fns";
import { CalendarDays, Clock, Loader2, Users2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { type UserRole } from "@/lib/roles";

type BookingType = "campo" | "lezione_privata" | "lezione_gruppo";

type BookingRecord = {
  id: string;
  user_id: string;
  coach_id: string | null;
  court: string;
  type: BookingType;
  start_time: string;
  end_time: string;
  status?: string;
  coach_confirmed?: boolean;
  manager_confirmed?: boolean;
  notes?: string;
};

type Coach = {
  id: string;
  full_name: string | null;
  role: UserRole;
};

type Athlete = {
  id: string;
  full_name: string | null;
  email: string;
  role: UserRole;
};

const courts = ["Campo 1", "Campo 2", "Campo 3"];
const slotStartHour = 8;
const slotEndHour = 21; // last start 21:00 -> ends 22:00

function buildSlots(day: Date) {
  const slots: Date[] = [];
  for (let h = slotStartHour; h <= slotEndHour; h++) {
    const slot = new Date(day);
    slot.setHours(h, 0, 0, 0); // Imposta ore, minuti, secondi, millisecondi
    slots.push(slot);
  }
  return slots;
}

function overlaps(
  booking: BookingRecord,
  court: string,
  slotStart: Date,
  slotEnd: Date
) {
  if (booking.court !== court) return false;
  const bStart = new Date(booking.start_time);
  const bEnd = new Date(booking.end_time);
  
  // Due intervalli si sovrappongono se:
  // l'inizio del primo è prima della fine del secondo E
  // la fine del primo è dopo l'inizio del secondo
  // Ma se la fine del booking coincide esattamente con l'inizio dello slot, NON c'è sovrapposizione
  return bStart < slotEnd && bEnd > slotStart;
}

export default function BookingCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedCourt, setSelectedCourt] = useState<string>(courts[0]);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [bookingType, setBookingType] = useState<BookingType>("campo");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [selectedCoach, setSelectedCoach] = useState<string>("");
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<string>("");
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const slots = useMemo(() => buildSlots(selectedDate), [selectedDate]);

  // Chiudi date picker quando si clicca fuori
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDatePicker && !(event.target as HTMLElement).closest('.date-picker-container')) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDatePicker]);

  // Carica il ruolo utente al mount
  useEffect(() => {
    const loadUserRole = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userData.user.id)
          .single();
        setUserRole(profileData?.role ?? null);
        setCurrentUserId(userData.user.id);
      }
    };
    loadUserRole();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Calcola l'inizio e la fine del giorno selezionato in formato locale
        const startDay = new Date(selectedDate);
        startDay.setHours(slotStartHour, 0, 0, 0);
        
        const endDay = new Date(selectedDate);
        endDay.setHours(slotEndHour + 1, 0, 0, 0); // Include l'ultima ora

        // Carica prenotazioni dal database
        const { data: bookingData, error: bookingError } = await supabase
          .from("bookings")
          .select("id,user_id,coach_id,court,type,start_time,end_time,status,coach_confirmed,manager_confirmed")
          .neq("status", "cancelled")
          .gte("start_time", startDay.toISOString())
          .lt("start_time", endDay.toISOString());

        if (bookingError) {
          setError("Impossibile caricare le prenotazioni.");
        } else {
          setBookings((bookingData as BookingRecord[]) ?? []);
        }

        // Carica profili utenti tramite API (bypassa RLS)
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        
        if (token) {
          // Tutti gli utenti autenticati possono vedere i maestri (per prenotare lezioni)
          // Solo admin/gestore vedono anche gli atleti (per prenotare per conto loro)
          
          const response = await fetch('/api/users', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const data = await response.json();
            
            const users = data.users || [];
            
            // Filtra per ruolo
            const coachData = users.filter((p: any) => {
              const role = String(p.role || '').toLowerCase();
              return role === 'maestro';
            });
            
            const athleteData = users.filter((p: any) => {
              const role = String(p.role || '').toLowerCase();
              return role === 'atleta';
            });
            
            setCoaches(coachData);
            // Solo admin/gestore vedono gli atleti
            if (userRole === 'admin' || userRole === 'gestore') {
              setAthletes(athleteData);
            }
          } else {
            const errorText = await response.text().catch(() => 'Unknown error');
            setError(`Errore caricamento utenti: ${response.status}`);
          }
        }
      } catch (err) {
        setError("Errore nel caricamento dei dati: " + (err as Error).message);
      }

      setLoading(false);
    };

    void fetchData();
  }, [selectedDate, userRole]);

  const isSlotConfirmed = (slot: Date) => {
    const slotEnd = new Date(slot);
    slotEnd.setHours(slot.getHours(), 59, 0, 0); // 59 minuti invece di 60
    return bookings.some((b) => {
      if (!overlaps(b, selectedCourt, slot, slotEnd)) return false;
      return b.manager_confirmed === true;
    });
  };

  const isSlotPending = (slot: Date) => {
    if (!currentUserId) return false;
    const slotEnd = new Date(slot);
    slotEnd.setHours(slot.getHours(), 59, 0, 0); // 59 minuti invece di 60
    return bookings.some((b) => {
      if (!overlaps(b, selectedCourt, slot, slotEnd)) return false;
      return b.user_id === currentUserId && b.manager_confirmed !== true;
    });
  };

  const isSlotAvailable = (slot: Date) => {
    const now = new Date();
    const isAdminOrGestore = userRole === "admin" || userRole === "gestore";
    
    // Admin e gestore non hanno limitazioni
    if (isAdminOrGestore) {
      // Solo gli slot confermati li bloccano
      return !isSlotConfirmed(slot);
    }
    
    // Per altri utenti: slot nel passato non disponibile
    if (slot < now) return false;
    
    // Slot è entro 24h da ora (solo per non admin/gestore)
    const twentyFourHoursFromNow = addHours(now, 24);
    if (slot < twentyFourHoursFromNow) return false;
    
    // Slot è confermato (solo confermate bloccano per tutti)
    if (isSlotConfirmed(slot)) return false;
    
    return true;
  };

  const handleCreateBooking = async () => {
    setError(null);
    setSuccess(null);
    setSaving(true);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setError("Effettua il login per prenotare.");
      setSaving(false);
      return;
    }

    if (!selectedSlot) {
      setError("Seleziona uno slot orario.");
      setSaving(false);
      return;
    }

    // Controlla il ruolo dell'utente
    const { data: profileData } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const isAdminOrGestore = profileData?.role === "admin" || profileData?.role === "gestore";

    // Se admin/gestore, deve selezionare un atleta
    if (isAdminOrGestore && !selectedAthlete) {
      setError("Seleziona l'atleta per cui vuoi prenotare.");
      setSaving(false);
      return;
    }

    // Determina l'ID utente da usare per la prenotazione
    const bookingUserId = isAdminOrGestore ? selectedAthlete : user.id;

    // Validazione 24h - NON SI APPLICA ad admin/gestore
    if (!isAdminOrGestore) {
      const now = new Date();
      const twentyFourHoursFromNow = addHours(now, 24);
      if (selectedSlot < twentyFourHoursFromNow) {
        setError("Le prenotazioni devono essere effettuate con almeno 24 ore di anticipo.");
        setSaving(false);
        return;
      }
    }

    if (bookingType === "lezione_privata" && !selectedCoach) {
      setError("Seleziona un maestro per la lezione privata.");
      setSaving(false);
      return;
    }

    // Crea una nuova data per end_time (59 minuti per evitare sovrapposizione con slot successivo)
    const slotEnd = new Date(selectedSlot.getTime());
    slotEnd.setHours(slotEnd.getHours(), 59, 0, 0);

    if (isSlotConfirmed(selectedSlot)) {
      setError("Slot non disponibile su questo campo.");
      setSaving(false);
      return;
    }

    const payload = {
      user_id: bookingUserId,
      coach_id: bookingType === "lezione_privata" ? selectedCoach : null,
      court: selectedCourt,
      type: bookingType,
      start_time: selectedSlot.toISOString(),
      end_time: slotEnd.toISOString(),
      status: bookingType === "lezione_privata" && !isAdminOrGestore ? "pending" : "confirmed",
      coach_confirmed: bookingType !== "lezione_privata" || isAdminOrGestore, // Admin/Gestore bypassano conferma coach
      manager_confirmed: isAdminOrGestore, // Admin/Gestore auto-approvano
      notes: null,
    };

    const resp = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const body = await resp.json().catch(() => ({}));
      setError(body.error ?? 'Errore durante la creazione della prenotazione.');
      setSaving(false);
      return;
    }

    setSuccess("Prenotazione creata!");
    // refresh bookings
    const startDay = new Date(selectedDate);
    startDay.setHours(slotStartHour, 0, 0, 0);
    
    const endDay = new Date(selectedDate);
    endDay.setHours(slotEndHour + 1, 0, 0, 0);
    
    const { data } = await supabase
      .from("bookings")
      .select("id,user_id,coach_id,court,type,start_time,end_time,status,coach_confirmed,manager_confirmed")
      .neq("status", "cancelled")
      .not("status", "in", "(rejected_by_coach,rejected_by_manager)")
      .gte("start_time", startDay.toISOString())
      .lt("start_time", endDay.toISOString());
    setBookings((data as BookingRecord[]) ?? []);
    setSaving(false);
    setSelectedSlot(null);
  };

  const dayLabel = format(selectedDate, "EEEE dd MMMM");

  return (
    <div className="space-y-4 sm:space-y-6 rounded-2xl sm:rounded-3xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-2">
            Calendario prenotazioni
          </p>
          <h3 className="text-xl sm:text-2xl font-semibold text-white">{dayLabel}</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedDate((d) => addDays(d, -1))}
            className="rounded-lg border border-white/15 bg-[#1a3d5c]/60 p-3 text-white transition hover:border-accent/50 hover:bg-[#1a3d5c]/80 hover:scale-105"
            aria-label="Giorno precedente"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="relative date-picker-container">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="rounded-lg border border-accent/30 bg-accent/10 p-3 text-accent transition hover:bg-accent/20 hover:border-accent/50 hover:scale-105"
              aria-label="Seleziona data"
            >
              <CalendarDays className="h-5 w-5" />
            </button>
            {showDatePicker && (
              <div className="absolute right-0 top-full mt-2 z-50 rounded-lg border border-white/15 bg-[#0d1f35] p-4 shadow-xl">
                <input
                  type="date"
                  value={format(selectedDate, "yyyy-MM-dd")}
                  onChange={(e) => {
                    if (e.target.value) {
                      setSelectedDate(new Date(e.target.value + "T00:00:00"));
                      setShowDatePicker(false);
                    }
                  }}
                  className="rounded-lg border border-white/15 bg-surface px-3 py-2 text-white outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </div>
            )}
          </div>
          <button
            onClick={() => setSelectedDate((d) => addDays(d, 1))}
            className="rounded-lg border border-white/15 bg-[#1a3d5c]/60 p-3 text-white transition hover:border-accent/50 hover:bg-[#1a3d5c]/80 hover:scale-105"
            aria-label="Giorno successivo"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {(userRole === "admin" || userRole === "gestore") && (
          <label className="text-sm text-muted">
            Seleziona Atleta *
            <select
              className="mt-2 w-full rounded-xl border border-white/15 bg-surface px-3 py-2 text-white outline-none focus-ring-accent"
              value={selectedAthlete}
              onChange={(e) => setSelectedAthlete(e.target.value)}
            >
              <option value="">Scegli atleta</option>
              {athletes.map((athlete) => (
                <option key={athlete.id} value={athlete.id}>
                  {athlete.full_name && athlete.full_name.trim() !== '' 
                    ? `${athlete.full_name} (${athlete.email})`
                    : athlete.email}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="text-sm text-muted">
          Tipo prenotazione
          <select
            className="mt-2 w-full rounded-xl border border-white/15 bg-surface px-3 py-2 text-white outline-none focus-ring-accent"
            value={bookingType}
            onChange={(e) => setBookingType(e.target.value as BookingType)}
          >
            <option value="campo">Campo</option>
            <option value="lezione_privata">Lezione privata</option>
            <option value="lezione_gruppo">Lezione privata di gruppo</option>
          </select>
        </label>
        <label className="text-sm text-muted">
          Campo
          <select
            className="mt-2 w-full rounded-xl border border-white/15 bg-surface px-3 py-2 text-white outline-none focus-ring-accent"
            value={selectedCourt}
            onChange={(e) => setSelectedCourt(e.target.value)}
          >
            {courts.map((court) => (
              <option key={court} value={court}>
                {court}
              </option>
            ))}
          </select>
        </label>
        {(bookingType === "lezione_privata" || bookingType === "lezione_gruppo") && (
          <label className="text-sm text-muted">
            Seleziona Maestro
            <select
              className="mt-2 w-full rounded-xl border border-white/15 bg-surface px-3 py-2 text-white outline-none focus-ring-accent"
              value={selectedCoach}
              onChange={(e) => setSelectedCoach(e.target.value)}
            >
              <option value="">Scegli un maestro</option>
              {coaches.map((coach) => (
                <option key={coach.id} value={coach.id}>
                  {coach.full_name && coach.full_name.trim() !== '' 
                    ? coach.full_name
                    : 'Maestro'}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted">
          <CalendarDays className="h-4 w-4 text-accent" />
          Seleziona uno slot da 1 ora (08:00-22:00). Le prenotazioni richiedono 24h di anticipo.
        </div>
        <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5" aria-busy={loading}>
          {loading ? (
            <div className="col-span-full flex items-center gap-2 text-sm text-muted">
              <Loader2 className="h-4 w-4 animate-spin text-accent" />
              Caricamento slot...
            </div>
          ) : (
            slots.map((slot) => {
              const slotEnd = new Date(slot);
              slotEnd.setHours(slot.getHours(), 59, 0, 0); // 59 minuti
              const available = isSlotAvailable(slot);
              const confirmed = isSlotConfirmed(slot);
              const pending = isSlotPending(slot);
              const isAdminOrGestore = userRole === "admin" || userRole === "gestore";
              const tooSoon = !isAdminOrGestore && slot < addHours(new Date(), 24) && slot >= new Date();
              const isPast = slot < new Date();
              const active = selectedSlot && isSameDay(slot, selectedSlot) && slot.getTime() === selectedSlot.getTime();
              
              let statusLabel = "";
              if (isPast) statusLabel = "Passato";
              else if (tooSoon) statusLabel = "< 24h";
              else if (confirmed) statusLabel = "Occupato";
              else if (pending) statusLabel = "In attesa";

              return (
                <button
                  key={slot.toISOString()}
                  disabled={!available}
                  onClick={() => setSelectedSlot(slot)}
                  aria-pressed={active ? "true" : "false"}
                  aria-label={`${format(slot, "HH:mm")}-${format(slotEnd, "HH:mm")} ${selectedCourt} ${!available ? "(non disponibile)" : pending ? "(in attesa conferma)" : "(disponibile)"}`}
                  className={`flex flex-col rounded-lg sm:rounded-xl border px-2.5 sm:px-3 py-2.5 sm:py-3 text-left text-xs sm:text-sm transition min-h-[60px] ${
                    confirmed || isPast || tooSoon
                      ? "cursor-not-allowed border-red-400/30 bg-red-400/10 text-red-300"
                      : pending
                      ? "cursor-pointer border-yellow-400/30 bg-yellow-400/10 text-yellow-300 hover:border-yellow-400/50 hover:bg-yellow-400/20"
                      : active
                      ? "border-[#2f7de1] bg-[#2f7de1]/20 text-white ring-2 ring-[#2f7de1]/50"
                      : "border-white/10 bg-[#1a3d5c]/60 text-white hover:border-[#2f7de1]/50 hover:bg-[#1a3d5c]/80"
                   } focus:outline-none focus-ring-accent`}
                >
                  <span className="font-semibold text-base">{format(slot, "HH:mm")}</span>
                  <span className="text-xs text-muted-2">
                    <Clock className="mr-1 inline h-3 w-3" />
                    1h · {selectedCourt}
                  </span>
                  {(confirmed || isPast || tooSoon) && <span className="mt-1 text-xs text-cyan-300">{statusLabel}</span>}
                  {pending && <span className="mt-1 text-xs text-yellow-400">{statusLabel}</span>}
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
        <button
          onClick={handleCreateBooking}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold bg-[#2f7de1] text-white transition hover:bg-[#2563c7] disabled:opacity-60 min-h-[44px] w-full sm:w-auto"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Salvataggio...
            </>
          ) : (
            <>
              <Users2 className="h-4 w-4" />
              Conferma prenotazione
            </>
          )}
        </button>
        {selectedSlot && (
          <span className="text-xs sm:text-sm text-[#c6d8c9] text-center sm:text-left">
            Slot: {format(selectedSlot, "HH:mm")}-{format(addHours(selectedSlot, 1), "HH:mm")} · {format(selectedSlot, "dd/MM/yyyy")} · {selectedCourt}
          </span>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-100">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100">
          {success}
        </p>
      )}
    </div>
  );
}

