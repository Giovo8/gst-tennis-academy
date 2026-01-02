"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  addDays,
  addHours,
  format,
  isSameDay,
  setHours,
  setMinutes,
} from "date-fns";
import { CalendarDays, Clock, Loader2, Users2, AlertCircle, Lock } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { type UserRole } from "@/lib/roles";
import { useBookingsRealtime } from "@/lib/hooks/useBookingsRealtime";

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
  const [selectedSlots, setSelectedSlots] = useState<Date[]>([]); // Multiple slots
  const [multiSelectMode, setMultiSelectMode] = useState(false); // Toggle multi-select
  const [bookingType, setBookingType] = useState<BookingType>("campo");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [selectedCoach, setSelectedCoach] = useState<string>("");
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<string>("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Real-time bookings updates
  const { bookings, refetch: refetchBookings } = useBookingsRealtime(
    selectedDate,
    useCallback(() => {
      // Callback per aggiornamenti real-time
    }, [])
  );

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
  }, [userRole]);

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

  // Gestione click su slot
  const handleSlotClick = (slot: Date) => {
    if (multiSelectMode) {
      // Modalità multi-select: aggiungi/rimuovi dalla lista
      const isSelected = selectedSlots.some(s => s.getTime() === slot.getTime());
      if (isSelected) {
        setSelectedSlots(selectedSlots.filter(s => s.getTime() !== slot.getTime()));
      } else {
        setSelectedSlots([...selectedSlots, slot]);
      }
    } else {
      // Modalità singola: sostituisci selezione
      setSelectedSlot(slot);
      setSelectedSlots([slot]);
    }
  };

  // Toggle multi-select mode
  const toggleMultiSelect = () => {
    setMultiSelectMode(!multiSelectMode);
    if (!multiSelectMode) {
      // Entrando in modalità multi, converti slot singolo in array
      if (selectedSlot) {
        setSelectedSlots([selectedSlot]);
      }
    } else {
      // Uscendo da modalità multi, mantieni primo slot
      if (selectedSlots.length > 0) {
        setSelectedSlot(selectedSlots[0]);
      }
      setSelectedSlots([]);
    }
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

    // Verifica che ci siano slot selezionati
    const slotsToBook = multiSelectMode ? selectedSlots : (selectedSlot ? [selectedSlot] : []);
    
    if (slotsToBook.length === 0) {
      setError("Seleziona almeno uno slot orario.");
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
      
      // Verifica che TUTTI gli slot rispettino la regola 24h
      const tooSoonSlots = slotsToBook.filter(slot => slot < twentyFourHoursFromNow);
      if (tooSoonSlots.length > 0) {
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

    // Verifica che tutti gli slot siano disponibili
    const occupiedSlots = slotsToBook.filter(slot => isSlotConfirmed(slot));
    if (occupiedSlots.length > 0) {
      setError(`⚠️ ${occupiedSlots.length} slot selezionato/i non disponibile/i. Rimuovili dalla selezione.`);
      setSaving(false);
      return;
    }

    // Se modalità multi-select con più slot, usa endpoint batch
    if (multiSelectMode && slotsToBook.length > 1) {
      const bookingsPayload = slotsToBook.map(slot => {
        const slotEnd = new Date(slot.getTime());
        slotEnd.setHours(slotEnd.getHours(), 59, 0, 0);
        
        return {
          user_id: bookingUserId,
          coach_id: bookingType === "lezione_privata" ? selectedCoach : null,
          court: selectedCourt,
          type: bookingType,
          start_time: slot.toISOString(),
          end_time: slotEnd.toISOString(),
          status: bookingType === "lezione_privata" && !isAdminOrGestore ? "pending" : "confirmed",
          coach_confirmed: bookingType !== "lezione_privata" || isAdminOrGestore,
          manager_confirmed: isAdminOrGestore,
          notes: null,
        };
      });

      const resp = await fetch('/api/bookings/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookings: bookingsPayload }),
      });

      if (resp.ok) {
        const data = await resp.json();
        setSuccess(`✅ ${data.count} prenotazioni create con successo!`);
      } else {
        const body = await resp.json().catch(() => ({}));
        if (resp.status === 409 && body.conflicts) {
          setError(`⚠️ ${body.conflicts.length} slot non più disponibili. Aggiorna la pagina.`);
        } else {
          setError(body.error ?? 'Errore durante la creazione delle prenotazioni.');
        }
        setSaving(false);
        return;
      }
    } else {
      // Modalità singola o un solo slot: usa logica esistente
      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[]
      };

      for (const slot of slotsToBook) {
        const slotEnd = new Date(slot.getTime());
        slotEnd.setHours(slotEnd.getHours(), 59, 0, 0);

        const payload = {
          user_id: bookingUserId,
          coach_id: bookingType === "lezione_privata" ? selectedCoach : null,
          court: selectedCourt,
          type: bookingType,
          start_time: slot.toISOString(),
          end_time: slotEnd.toISOString(),
          status: bookingType === "lezione_privata" && !isAdminOrGestore ? "pending" : "confirmed",
          coach_confirmed: bookingType !== "lezione_privata" || isAdminOrGestore,
          manager_confirmed: isAdminOrGestore,
          notes: null,
        };

        const resp = await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (resp.ok) {
          results.success++;
        } else {
          results.failed++;
          const body = await resp.json().catch(() => ({}));
          results.errors.push(`${format(slot, "HH:mm")}: ${body.error || 'Errore'}`);
        }
      }

      // Mostra risultati
      if (results.failed === 0) {
        setSuccess(`✅ ${results.success} prenotazione/i creata/e con successo!`);
      } else if (results.success === 0) {
        setError(`❌ Errore nella creazione delle prenotazioni:\n${results.errors.join('\n')}`);
      } else {
        setSuccess(`⚠️ ${results.success} prenotate, ${results.failed} fallite`);
        setError(results.errors.join('\n'));
      }
    }
    
    // Refetch bookings using real-time hook
    await refetchBookings();
    
    setSaving(false);
    setSelectedSlot(null);
    setSelectedSlots([]);
    
    // Clear success message after 5s
    setTimeout(() => {
      setSuccess(null);
      setError(null);
    }, 5000);
  };

  const dayLabel = format(selectedDate, "EEEE dd MMMM");

  return (
    <div className="space-y-4 sm:space-y-6 rounded-2xl sm:rounded-3xl border border-tournament-border/30 bg-tournament-bg-card/60 p-4 sm:p-6">
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
            className="rounded-lg border border-white/15 bg-tournament-bg-card/60 p-3 text-white transition hover:border-accent/50 hover:bg-tournament-bg-card/80 hover:scale-105"
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
              <div className="absolute right-0 top-full mt-2 z-50 rounded-lg border border-white/15 bg-tournament-bg-light p-4 shadow-xl">
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
            className="rounded-lg border border-white/15 bg-tournament-bg-card/60 p-3 text-white transition hover:border-accent/50 hover:bg-tournament-bg-card/80 hover:scale-105"
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

      {/* Multi-Select Toggle */}
      <div className="flex items-center justify-between p-4 bg-tournament-bg-card/40 rounded-xl border border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-white">Selezione Multipla</span>
            <span className="text-xs text-gray-400">Prenota più slot consecutivi in una volta</span>
          </div>
        </div>
        <button
          onClick={toggleMultiSelect}
          className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
            multiSelectMode ? "bg-blue-500" : "bg-gray-600"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
              multiSelectMode ? "translate-x-8" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* Slot selezionati (solo in modalità multi) */}
      {multiSelectMode && selectedSlots.length > 0 && (
        <div className="p-4 bg-blue-500/10 border border-blue-400/30 rounded-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-blue-300 mb-2">
                {selectedSlots.length} slot selezionato/i
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedSlots.sort((a, b) => a.getTime() - b.getTime()).map((slot) => (
                  <span
                    key={slot.toISOString()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 border border-blue-400/40 rounded-lg text-xs font-medium text-blue-200"
                  >
                    <Clock className="h-3 w-3" />
                    {format(slot, "HH:mm")}
                  </span>
                ))}
              </div>
            </div>
            <button
              onClick={() => setSelectedSlots([])}
              className="text-xs text-blue-300 hover:text-blue-100 underline"
            >
              Cancella tutti
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-muted">
            <CalendarDays className="h-4 w-4 text-accent" />
            Seleziona uno slot da 1 ora (08:00-22:00). Le prenotazioni richiedono 24h di anticipo.
          </div>
          
          {/* Legenda */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded border-2 border-tournament-border bg-tournament-border/20"></div>
              <span className="text-gray-400">Disponibile</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded border border-red-400/50 bg-red-500/20"></div>
              <span className="text-gray-400">Occupato</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded border border-yellow-400/30 bg-yellow-400/10"></div>
              <span className="text-gray-400">In attesa</span>
            </div>
          </div>
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
              
              // Check selezione (sia singola che multipla)
              const isSelected = multiSelectMode
                ? selectedSlots.some(s => s.getTime() === slot.getTime())
                : selectedSlot && isSameDay(slot, selectedSlot) && slot.getTime() === selectedSlot.getTime();
              
              let statusLabel = "";
              let statusIcon = null;
              if (isPast) {
                statusLabel = "Passato";
                statusIcon = <Clock className="inline h-3 w-3 mr-1" />;
              } else if (tooSoon) {
                statusLabel = "< 24h";
                statusIcon = <AlertCircle className="inline h-3 w-3 mr-1" />;
              } else if (confirmed) {
                statusLabel = "Occupato";
                statusIcon = <Lock className="inline h-3 w-3 mr-1" />;
              } else if (pending) {
                statusLabel = "In attesa";
                statusIcon = <Clock className="inline h-3 w-3 mr-1" />;
              }

              return (
                <button
                  key={slot.toISOString()}
                  disabled={!available}
                  onClick={() => handleSlotClick(slot)}
                  aria-pressed={isSelected ? "true" : "false"}
                  aria-label={`${format(slot, "HH:mm")}-${format(slotEnd, "HH:mm")} ${selectedCourt} ${!available ? "(non disponibile)" : pending ? "(in attesa conferma)" : "(disponibile)"}`}
                  className={`flex flex-col rounded-lg sm:rounded-xl border px-2.5 sm:px-3 py-2.5 sm:py-3 text-left text-xs sm:text-sm transition min-h-[60px] ${
                    confirmed || isPast || tooSoon
                      ? "cursor-not-allowed border-red-400/50 bg-red-500/20 text-red-200 relative overflow-hidden"
                      : pending
                      ? "cursor-pointer border-yellow-400/30 bg-yellow-400/10 text-yellow-300 hover:border-yellow-400/50 hover:bg-yellow-400/20"
                      : isSelected
                      ? "border-tournament-border bg-tournament-border/20 text-white ring-2 ring-tournament-border/50"
                      : "border-white/10 bg-tournament-bg-card/60 text-white hover:border-tournament-border/50 hover:bg-tournament-bg-card/80 hover:scale-105"
                   } focus:outline-none focus-ring-accent`}
                >
                  {(confirmed || isPast || tooSoon) && (
                    <div className="absolute inset-0 bg-gradient-to-br from-red-600/10 to-red-800/10 pointer-events-none"></div>
                  )}
                  <span className="font-semibold text-base relative z-10">{format(slot, "HH:mm")}</span>
                  <span className="text-xs text-muted-2 relative z-10">
                    <Clock className="mr-1 inline h-3 w-3" />
                    1h · {selectedCourt}
                  </span>
                  {(confirmed || isPast || tooSoon) && (
                    <span className="mt-1 text-xs font-semibold text-red-300 relative z-10 flex items-center">
                      {statusIcon}
                      {statusLabel}
                    </span>
                  )}
                  {pending && (
                    <span className="mt-1 text-xs text-yellow-400 relative z-10 flex items-center">
                      {statusIcon}
                      {statusLabel}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
        <button
          onClick={handleCreateBooking}
          disabled={saving || (multiSelectMode ? selectedSlots.length === 0 : !selectedSlot)}
          className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold bg-tournament-border text-white transition hover:bg-primary-hover disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px] w-full sm:w-auto"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {multiSelectMode ? `Prenotando ${selectedSlots.length} slot...` : "Salvataggio..."}
            </>
          ) : (
            <>
              <Users2 className="h-4 w-4" />
              {multiSelectMode 
                ? `Conferma ${selectedSlots.length || 0} prenotazione/i`
                : "Conferma prenotazione"
              }
            </>
          )}
        </button>
        
        {/* Riepilogo selezione */}
        {!multiSelectMode && selectedSlot && (
          <span className="text-xs sm:text-sm text-gray-300 text-center sm:text-left">
            Slot: {format(selectedSlot, "HH:mm")}-{format(addHours(selectedSlot, 1), "HH:mm")} · {format(selectedSlot, "dd/MM/yyyy")} · {selectedCourt}
          </span>
        )}
        
        {multiSelectMode && selectedSlots.length > 0 && (
          <span className="text-xs sm:text-sm text-gray-300 text-center sm:text-left">
            {selectedSlots.length} slot · {format(selectedDate, "dd/MM/yyyy")} · {selectedCourt}
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

