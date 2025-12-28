"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import { Calendar, Check, X, Clock, User, AlertCircle, CheckCircle2, XCircle, Award } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import { supabase } from "@/lib/supabase/client";
import { format, formatDistanceToNow, isFuture, isPast } from "date-fns";
import { it } from "date-fns/locale";

type Lesson = {
  id: string;
  court: string;
  start_time: string;
  end_time: string;
  status: string;
  coach_confirmed: boolean;
  manager_confirmed: boolean;
  note: string | null;
  user: {
    full_name: string;
    email: string;
  };
};

export default function MaestroDashboardPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [allLessons, setAllLessons] = useState<Lesson[]>([]); // Per le statistiche
  const [filter, setFilter] = useState<"all" | "pending" | "confirmed">("pending");
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string>("");
  const [tournaments, setTournaments] = useState<Array<{id:string; title:string}>>([]);
  const [selectedTournament, setSelectedTournament] = useState<string>("");
  const [athletes, setAthletes] = useState<Array<{id:string; full_name?:string}>>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<string>("");
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [enrollMsg, setEnrollMsg] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [filter]);

  async function loadData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Load profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();
    
    if (profile?.full_name) setUserName(profile.full_name);

    // Prima carica TUTTE le lezioni per le statistiche
    const { data: allBookingsData } = await supabase
      .from("bookings")
      .select("*")
      .eq("coach_id", user.id)
      .eq("type", "lezione_privata")
      .order("start_time", { ascending: true });

    // Poi carica le lezioni filtrate per la visualizzazione
    let query = supabase
      .from("bookings")
      .select("*")
      .eq("coach_id", user.id)
      .eq("type", "lezione_privata")
      .order("start_time", { ascending: true });

    if (filter === "pending") {
      query = query.eq("coach_confirmed", false);
    } else if (filter === "confirmed") {
      query = query.eq("coach_confirmed", true);
    }

    const { data: bookingsData, error: bookingsError } = await query;

    if (bookingsError) {
      // Handle error silently
      setLoading(false);
      return;
    }

    // Combina tutti gli user_id da entrambe le query
    const allUserIds = [...new Set([
      ...(allBookingsData?.map((b: any) => b.user_id) || []),
      ...(bookingsData?.map((b: any) => b.user_id) || [])
    ])];

    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", allUserIds);

    const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

    // Mappa TUTTE le lezioni per le statistiche
    const allMapped = (allBookingsData || []).map((item: any) => {
      const userProfile = profilesMap.get(item.user_id);
      return {
        id: item.id,
        court: item.court,
        start_time: item.start_time,
        end_time: item.end_time,
        status: item.status,
        coach_confirmed: item.coach_confirmed,
        manager_confirmed: item.manager_confirmed,
        note: item.note,
        user: {
          full_name: userProfile?.full_name || "Atleta",
          email: userProfile?.email || "",
        },
      };
    });
    setAllLessons(allMapped);

    // Mappa le lezioni filtrate per la visualizzazione
    const mapped = (bookingsData || []).map((item: any) => {
      const userProfile = profilesMap.get(item.user_id);
      return {
        id: item.id,
        court: item.court,
        start_time: item.start_time,
        end_time: item.end_time,
        status: item.status,
        coach_confirmed: item.coach_confirmed,
        manager_confirmed: item.manager_confirmed,
        note: item.note,
        user: {
          full_name: userProfile?.full_name || "Atleta",
          email: userProfile?.email || "",
        },
      };
    });
    
    setLessons(mapped);
    setLoading(false);
  }

  useEffect(() => {
    // load tournaments and athletes for coach enrollment
    async function loadEnrollData() {
      try {
        const { data: tData } = await supabase.from('tournaments').select('id, title, starts_at').gte('starts_at', new Date().toISOString()).order('starts_at');
        setTournaments((tData as any) ?? []);
        const { data: aData } = await supabase.from('profiles').select('id, full_name').eq('role', 'atleta').order('full_name');
        setAthletes((aData as any) ?? []);
      } catch (err) {
        // ignore
      }
    }
    loadEnrollData();
  }, []);

  async function handleEnrollForTournament() {
    setEnrollMsg(null);
    setEnrollLoading(true);
    try {
      if (!selectedTournament || !selectedAthlete) {
        setEnrollMsg('Seleziona torneo e atleta');
        setEnrollLoading(false);
        return;
      }
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token ?? null;
      const res = await fetch('/api/tournament_participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ user_id: selectedAthlete, tournament_id: selectedTournament }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEnrollMsg(json.error || 'Errore iscrizione');
      } else {
        setEnrollMsg('Atleta iscritto con successo');
      }
    } catch (err: any) {
      setEnrollMsg(err.message || 'Errore rete');
    } finally {
      setEnrollLoading(false);
    }
  }

  async function handleConfirm(lessonId: string) {
    const { error } = await supabase
      .from("bookings")
      .update({ 
        coach_confirmed: true,
        status: "confirmed_by_coach"
      })
      .eq("id", lessonId);

    if (!error) {
      await loadData();
    }
  }

  async function handleReject(lessonId: string) {
    const { error } = await supabase
      .from("bookings")
      .update({ 
        status: "rejected_by_coach",
        coach_confirmed: false
      })
      .eq("id", lessonId);

    if (!error) {
      await loadData();
    }
  }

  const pendingCount = allLessons.filter(l => !l.coach_confirmed).length;

  return (
    <AuthGuard allowedRoles={["maestro"]}>
      <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-6 py-12 bg-[#021627] text-white">
        {/* Header */}
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-2 flex items-center gap-2">
            <Award className="h-4 w-4" />
            Dashboard Maestro
          </p>
          <h1 className="text-4xl font-bold text-white">
            Benvenuto, {userName || "Maestro"}
          </h1>
          <p className="text-sm text-muted">
            Gestisci le tue lezioni private e conferma le richieste degli atleti
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard title="In Attesa" value={pendingCount} icon={<Clock className="h-8 w-8 text-yellow-400" />} color="yellow" />
          <StatCard title="Confermate" value={allLessons.filter(l => l.coach_confirmed && l.manager_confirmed).length} icon={<CheckCircle2 className="h-8 w-8 text-green-400" />} color="green" />
          <StatCard title="Totali" value={allLessons.length} icon={<Calendar className="h-8 w-8 text-blue-400" />} color="blue" />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setFilter("pending")}
            className={`inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition ${
              filter === "pending"
                ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/30"
                : "border border-white/15 text-muted hover:border-yellow-500/50 hover:text-white"
            }`}
          >
            <Clock className="h-4 w-4" />
            In Attesa ({pendingCount})
          </button>
          <button
            onClick={() => setFilter("confirmed")}
            className={`inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition ${
              filter === "confirmed"
                ? "bg-green-500 text-black shadow-lg shadow-green-500/30"
                : "border border-white/15 text-muted hover:border-green-500/50 hover:text-white"
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            Confermate
          </button>
          <button
            onClick={() => setFilter("all")}
            className={`inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition ${
              filter === "all"
                ? "bg-accent text-[#06101f] shadow-lg shadow-accent/30"
                : "border border-white/15 text-muted hover:border-accent/50 hover:text-white"
            }`}
          >
            <Calendar className="h-4 w-4" />
            Tutte
          </button>
        </div>

        {/* Coach: Enroll Athletes to Tournaments */}
        <div className="rounded-xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-6">
          <h2 className="text-lg font-semibold text-white">Gestione Iscrizioni Tornei</h2>
          <p className="text-sm text-muted mb-4">Seleziona un torneo e un atleta per iscriverlo manualmente.</p>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <select value={selectedTournament} onChange={(e) => setSelectedTournament(e.target.value)} className="px py-sm bg-input rounded-md text-sm md:mr-4">
              <option value="">Scegli torneo</option>
              {tournaments.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
            <select value={selectedAthlete} onChange={(e) => setSelectedAthlete(e.target.value)} className="px py-sm bg-input rounded-md text-sm md:mr-4">
              <option value="">Scegli atleta</option>
              {athletes.map(a => <option key={a.id} value={a.id}>{a.full_name ?? a.id}</option>)}
            </select>
            <div>
              <button onClick={handleEnrollForTournament} disabled={enrollLoading} className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-[#06101f]">{enrollLoading ? 'Iscrivendo...' : 'Iscrivi atleta'}</button>
            </div>
          </div>
          {enrollMsg && <div className="mt-3 text-sm text-muted">{enrollMsg}</div>}
        </div>

        {/* Lessons List */}
        <div className="space-y-4">
          {loading ? (
            <div className="rounded-xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-12 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent"></div>
              <p className="mt-4 text-sm text-muted">Caricamento lezioni...</p>
            </div>
          ) : lessons.length === 0 ? (
            <div className="rounded-xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-12 text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-muted-2 mb-4" />
              <p className="text-lg font-semibold text-white mb-2">Nessuna lezione trovata</p>
              <p className="text-sm text-muted">
                {filter === "pending" ? "Non ci sono richieste in attesa di conferma" : "Non ci sono lezioni in questo filtro"}
              </p>
            </div>
          ) : (
            lessons.map((lesson) => {
              const startDate = new Date(lesson.start_time);
              const isPastLesson = isPast(startDate);
              const isFutureLesson = isFuture(startDate);
              
              return (
                <div
                  key={lesson.id}
                  className={`rounded-xl border p-6 transition-all hover:shadow-lg ${
                    !lesson.coach_confirmed
                      ? "border-yellow-500/50 bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 hover:border-yellow-500"
                      : lesson.manager_confirmed
                      ? "border-green-500/30 bg-[#1a3d5c]/60 hover:border-green-500/50"
                      : "border-blue-500/30 bg-[#1a3d5c]/60 hover:border-blue-500/50"
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                    {/* Left Section - Info */}
                    <div className="flex-1 space-y-4">
                      {/* Atleta Info */}
                      <div className="flex items-center gap-3">
                        <div className="inline-flex rounded-full bg-accent/20 p-2">
                          <User className="h-5 w-5 text-accent" />
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-white">
                            {lesson.user.full_name}
                          </p>
                          <p className="text-sm text-muted">{lesson.user.email}</p>
                        </div>
                      </div>

                      {/* Date & Time */}
                      <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-accent" />
                          <span className="font-medium text-white">
                            {format(startDate, "EEEE d MMMM yyyy", { locale: it })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-accent" />
                          <span className="font-medium text-white">
                            {format(startDate, "HH:mm")} - {format(new Date(lesson.end_time), "HH:mm")}
                          </span>
                        </div>
                        <div className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                          {lesson.court}
                        </div>
                      </div>

                      {/* Relative Time */}
                      {isFutureLesson && (
                        <p className="text-sm text-muted">
                          <Clock className="inline h-3 w-3 mr-1" />
                          {formatDistanceToNow(startDate, { addSuffix: true, locale: it })}
                        </p>
                      )}

                      {/* Note */}
                      {lesson.note && (
                        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                          <p className="text-xs uppercase tracking-wider text-muted-2 mb-1">Note</p>
                          <p className="text-sm text-white">{lesson.note}</p>
                        </div>
                      )}

                      {/* Status Badges */}
                      <div className="flex flex-wrap gap-2">
                        {lesson.coach_confirmed ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/20 border border-green-500/30 px-3 py-1 text-xs font-semibold text-green-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Confermata da te
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-500/20 border border-yellow-500/30 px-3 py-1 text-xs font-semibold text-yellow-400">
                            <Clock className="h-3.5 w-3.5" />
                            In attesa di conferma
                          </span>
                        )}
                        {lesson.manager_confirmed ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 border border-blue-500/30 px-3 py-1 text-xs font-semibold text-blue-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Approvata dal gestore
                          </span>
                        ) : lesson.coach_confirmed && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/20 border border-orange-500/30 px-3 py-1 text-xs font-semibold text-orange-400">
                            <Clock className="h-3.5 w-3.5" />
                            In attesa di approvazione
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right Section - Actions */}
                    {!lesson.coach_confirmed && isFutureLesson && (
                      <div className="flex flex-col gap-3 lg:min-w-[200px]">
                        <button
                          onClick={() => handleConfirm(lesson.id)}
                          className="inline-flex items-center justify-center gap-2 rounded-full bg-green-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-green-700 shadow-lg shadow-green-600/30 hover:shadow-green-600/50"
                        >
                          <Check className="h-4 w-4" />
                          Conferma Lezione
                        </button>
                        <button
                          onClick={() => handleReject(lesson.id)}
                          className="inline-flex items-center justify-center gap-2 rounded-full border border-red-500/50 bg-red-500/10 px-6 py-3 text-sm font-semibold text-red-400 transition hover:bg-red-500/20 hover:border-red-500"
                        >
                          <X className="h-4 w-4" />
                          Rifiuta
                        </button>
                      </div>
                    )}
                    {isPastLesson && (
                      <div className="lg:min-w-[200px] flex items-center justify-center">
                        <span className="inline-flex items-center gap-2 rounded-full bg-gray-500/20 border border-gray-500/30 px-4 py-2 text-xs font-semibold text-gray-400">
                          <XCircle className="h-4 w-4" />
                          Lezione conclusa
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </AuthGuard>
  );
}


