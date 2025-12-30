"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import Link from "next/link";
import { Calendar, Clock, User, TrendingUp, AlertCircle, CheckCircle, XCircle, Award, Target, Trophy, UserCircle, CreditCard } from "lucide-react";
import DashboardLinkCard from "@/components/dashboard/DashboardLinkCard";
import StatCard from "@/components/dashboard/StatCard";
import AnnouncementsWidget from "@/components/dashboard/AnnouncementsWidget";
import { supabase } from "@/lib/supabase/client";

type Booking = {
  id: string;
  court: string;
  type: string;
  start_time: string;
  end_time: string;
  status: string;
  coach_confirmed: boolean;
  manager_confirmed: boolean;
  coach?: {
    full_name: string;
  } | null;
};

type Stats = {
  totalBookings: number;
  upcomingBookings: number;
  pendingLessons: number;
  completedBookings: number;
};

type Tournament = {
  id: string;
  title: string;
  tournament_type: 'eliminazione_diretta' | 'girone_eliminazione' | 'campionato';
  start_date?: string;
  max_participants?: number;
  status?: string;
  current_phase?: string;
  participant_count?: number;
  is_enrolled?: boolean;
  participation_id?: string;
};

export default function AthleteDashboardPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalBookings: 0,
    upcomingBookings: 0,
    pendingLessons: 0,
    completedBookings: 0,
  });
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string>("");
  const [subscriptionType, setSubscriptionType] = useState<string | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loadingTournaments, setLoadingTournaments] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, subscription_type")
        .eq("id", user.id)
        .single();
      
      if (profile?.full_name) setUserName(profile.full_name);
      if (profile?.subscription_type) setSubscriptionType(profile.subscription_type);

      const now = new Date().toISOString();

      // Load all bookings for stats
      const { data: allBookings } = await supabase
        .from("bookings")
        .select("*")
        .eq("user_id", user.id);

      // Load upcoming bookings with coach info
      const { data: bookingData, error: bookingError } = await supabase
        .from("bookings")
        .select("id, court, type, start_time, end_time, status, coach_confirmed, manager_confirmed, coach_id")
        .eq("user_id", user.id)
        .neq("status", "cancelled")
        .gte("start_time", now)
        .order("start_time", { ascending: true })
        .limit(5);
      
      if (bookingError) {
        // Handle booking error silently
      }
      
      if (bookingData) {
        // Get unique coach IDs
        const coachIds = [...new Set(bookingData.filter(b => b.coach_id).map(b => b.coach_id))];
        
        // Load coach names
        let coachMap: Record<string, string> = {};
        if (coachIds.length > 0) {
          const { data: coaches } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", coachIds);
          
          if (coaches) {
            coaches.forEach(coach => {
              coachMap[coach.id] = coach.full_name || "Maestro";
            });
          }
        }
        
        const mapped = bookingData.map((item: any) => ({
          id: item.id,
          court: item.court,
          type: item.type,
          start_time: item.start_time,
          end_time: item.end_time,
          status: item.status,
          coach_confirmed: item.coach_confirmed,
          manager_confirmed: item.manager_confirmed,
          coach: item.coach_id ? { full_name: coachMap[item.coach_id] || "N/A" } : null,
        }));
        setBookings(mapped);
      }

      // Calculate stats
      if (allBookings) {
        const upcoming = allBookings.filter(b => new Date(b.start_time) >= new Date()).length;
        const pending = allBookings.filter(b => 
          b.type === 'lezione_privata' && 
          (!b.coach_confirmed || !b.manager_confirmed) &&
          new Date(b.start_time) >= new Date()
        ).length;
        const completed = allBookings.filter(b => 
          new Date(b.start_time) < new Date() &&
          b.status === 'confirmed'
        ).length;

        setStats({
          totalBookings: allBookings.length,
          upcomingBookings: upcoming,
          pendingLessons: pending,
          completedBookings: completed,
        });
      }

      setLoading(false);
    }

    loadData();
    loadTournaments();
  }, []);

  async function loadTournaments() {
    setLoadingTournaments(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Carica tornei in fase iscrizioni
      const { data: availableTournaments } = await supabase
        .from("tournaments")
        .select("*")
        .eq("current_phase", "iscrizioni")
        .order("start_date", { ascending: true });

      // Carica partecipazioni dell'atleta
      const { data: participations } = await supabase
        .from("tournament_participants")
        .select("tournament_id, id")
        .eq("user_id", user.id);

      const participationMap = new Map(participations?.map(p => [p.tournament_id, p.id]) || []);

      // Carica tornei a cui è iscritto
      const { data: enrolledTournaments } = await supabase
        .from("tournaments")
        .select("*")
        .in("id", Array.from(participationMap.keys()))
        .order("start_date", { ascending: true });

      // Conta i partecipanti per ogni torneo
      const allTournamentIds = [
        ...(availableTournaments?.map(t => t.id) || []),
        ...(enrolledTournaments?.map(t => t.id) || [])
      ];

      let participantCounts: Record<string, number> = {};
      if (allTournamentIds.length > 0) {
        const { data: counts } = await supabase
          .from("tournament_participants")
          .select("tournament_id")
          .in("tournament_id", allTournamentIds);
        
        if (counts) {
          counts.forEach(c => {
            participantCounts[c.tournament_id] = (participantCounts[c.tournament_id] || 0) + 1;
          });
        }
      }

      // Combina i tornei disponibili con info iscrizione
      const available = (availableTournaments || []).map(t => ({
        ...t,
        participant_count: participantCounts[t.id] || 0,
        is_enrolled: participationMap.has(t.id),
        participation_id: participationMap.get(t.id)
      }));

      // Combina i tornei a cui è iscritto
      const enrolled = (enrolledTournaments || [])
        .filter(t => t.current_phase !== 'iscrizioni')
        .map(t => ({
          ...t,
          participant_count: participantCounts[t.id] || 0,
          is_enrolled: true,
          participation_id: participationMap.get(t.id)
        }));

      setTournaments([...available, ...enrolled]);
    } catch (error) {
      console.error("Error loading tournaments:", error);
    } finally {
      setLoadingTournaments(false);
    }
  }

  function formatDateTime(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString("it-IT", { 
      weekday: "long", 
      day: "numeric", 
      month: "long",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function getStatusBadge(booking: Booking) {
    if (booking.status === "cancelled" || booking.status.includes("rejected")) {
      return <span className="text-xs bg-cyan-500/15 text-cyan-300 px-3 py-1 rounded-full border border-cyan-500/30 flex items-center gap-1">
        <XCircle className="h-3 w-3" />
        Annullata
      </span>;
    }
    if (booking.status === "confirmed" && booking.manager_confirmed) {
      return <span className="text-xs bg-blue-500/15 text-blue-300 px-3 py-1 rounded-full border border-blue-500/30 flex items-center gap-1">
        <CheckCircle className="h-3 w-3" />
        Confermata
      </span>;
    }
    if (booking.type === "lezione_privata") {
      if (!booking.coach_confirmed) {
        return <span className="text-xs bg-cyan-500/15 text-cyan-400 px-3 py-1 rounded-full border border-cyan-500/30 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Attesa maestro
        </span>;
      }
      if (!booking.manager_confirmed) {
        return <span className="text-xs bg-blue-500/15 text-blue-300 px-3 py-1 rounded-full border border-blue-500/30 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Attesa gestore
        </span>;
      }
    }
    return <span className="text-xs bg-blue-500/15 text-blue-400 px-3 py-1 rounded-full border border-blue-500/30">
      In attesa
    </span>;
  }

  async function handleEnrollTournament(tournamentId: string) {
    setEnrolling(tournamentId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!session?.access_token || !user) {
        alert('Sessione non valida');
        return;
      }

      const res = await fetch('/api/tournament_participants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          tournament_id: tournamentId,
          user_id: user.id
        })
      });

      const data = await res.json();

      if (res.ok) {
        alert('Iscrizione completata con successo!');
        loadTournaments();
      } else {
        alert(data.error || 'Errore nell\'iscrizione');
      }
    } catch (error) {
      console.error('Error enrolling:', error);
      alert('Errore nell\'iscrizione al torneo');
    } finally {
      setEnrolling(null);
    }
  }

  async function handleUnenrollTournament(participationId: string, tournamentTitle: string) {
    if (!confirm(`Sei sicuro di voler cancellare l'iscrizione a "${tournamentTitle}"?`)) {
      return;
    }

    setEnrolling(participationId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        alert('Sessione non valida');
        return;
      }

      const res = await fetch(`/api/tournament_participants?id=${participationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (res.ok) {
        alert('Iscrizione cancellata con successo');
        loadTournaments();
      } else {
        const data = await res.json();
        alert(data.error || 'Errore nella cancellazione');
      }
    } catch (error) {
      console.error('Error unenrolling:', error);
      alert('Errore nella cancellazione dell\'iscrizione');
    } finally {
      setEnrolling(null);
    }
  }

  function getTournamentTypeLabel(type?: string) {
    switch(type) {
      case 'eliminazione_diretta': return 'Eliminazione Diretta';
      case 'girone_eliminazione': return 'Girone + Eliminazione';
      case 'campionato': return 'Campionato';
      default: return 'Torneo';
    }
  }

  function getTournamentTypeIcon(type?: string) {
    switch(type) {
      case 'campionato': return Award;
      case 'girone_eliminazione': return Target;
      default: return Trophy;
    }
  }

  return (
    <AuthGuard allowedRoles={["atleta"]}>
      <div className="min-h-screen bg-[#021627] text-white">
        <main className="mx-auto flex max-w-7xl flex-col gap-5 px-6 py-10">
          {/* Header */}
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-2">Dashboard Atleta</p>
            <h1 className="text-4xl font-bold text-white">
              Benvenuto, {userName || "Atleta"}!
            </h1>
            <p className="text-sm text-muted">Gestisci le tue prenotazioni e monitora i tuoi allenamenti</p>
          </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Prossime" value={stats.upcomingBookings} icon={<Calendar className="h-8 w-8 text-sky-300" />} color="sky" />
          <StatCard title="In attesa" value={stats.pendingLessons} icon={<Clock className="h-8 w-8 text-orange-300" />} color="orange" />
          <StatCard title="Completate" value={stats.completedBookings} icon={<Award className="h-8 w-8 text-lime-300" />} color="lime" />
          <StatCard title="Totali" value={stats.totalBookings} icon={<Target className="h-8 w-8 text-violet-300" />} color="violet" />
        </div>

        {/* Subscription Card */}
        {subscriptionType && (
          <div className="rounded-xl border border-accent/30 bg-gradient-to-r from-accent/10 to-accent/5 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-accent/20 p-4">
                  <Award className="h-8 w-8 text-accent" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">Abbonamento {subscriptionType.charAt(0).toUpperCase() + subscriptionType.slice(1)}</h3>
                  <p className="text-sm text-muted">Accesso illimitato ai campi</p>
                </div>
              </div>
              <Link href="/profile" className="rounded-full bg-accent/20 border border-accent/30 px-4 py-2 text-sm font-semibold text-accent hover:bg-accent/30 transition">
                Gestisci
              </Link>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DashboardLinkCard href="/bookings" icon={<Calendar className="h-10 w-10 text-accent mb-4 group-hover:scale-110 transition-transform" />} title="Prenota Campo" description="Match o allenamento libero" footer={<span className="text-xs text-muted">Apri il calendario</span>} />

          <DashboardLinkCard href="/bookings" icon={<User className="h-10 w-10 text-accent mb-4 group-hover:scale-110 transition-transform" />} title="Lezione Privata" description="Prenota con un maestro" footer={<span className="text-xs text-muted">Seleziona maestro e orario</span>} />

          <DashboardLinkCard href="/dashboard/atleta/bookings" icon={<TrendingUp className="h-10 w-10 text-accent mb-4 group-hover:scale-110 transition-transform" />} title="Storico" description="Tutte le prenotazioni" footer={<span className="text-xs text-muted">Visualizza lo storico</span>} />

          <DashboardLinkCard href="/profile" icon={<User className="h-10 w-10 text-accent mb-4 group-hover:scale-110 transition-transform" />} title="Profilo" description="Dati personali" footer={<span className="text-xs text-muted">Gestisci i tuoi dati</span>} />
        </div>

        {/* Announcements Widget */}
        <AnnouncementsWidget />

        {/* Upcoming Bookings */}
        <div className="rounded-xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
              <Calendar className="h-6 w-6 text-accent" />
              Prossime Prenotazioni
            </h2>
            <Link href="/dashboard/atleta/bookings" className="text-sm text-accent hover:underline">
              Vedi tutte →
            </Link>
          </div>
          
          {loading ? (
            <p className="text-sm text-muted text-center py-8">Caricamento...</p>
          ) : bookings.length > 0 ? (
            <div className="space-y-3">
              {bookings.map((booking) => (
                <div key={booking.id} className="rounded-lg border border-[#2f7de1]/20 bg-[#0d1f35]/60 p-5 hover:bg-[#0d1f35]/80 transition">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          booking.type === "lezione_privata" 
                            ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                            : booking.type === "lezione_gruppo"
                            ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                            : "bg-blue-500/20 text-green-300 border border-blue-500/30"
                        }`}>
                          {booking.type === "campo" ? "Campo" : booking.type === "lezione_privata" ? "Lezione Privata" : "Lezione Privata di Gruppo"}
                        </span>
                        {booking.coach && (
                          <span className="text-xs text-muted">
                            con {booking.coach.full_name}
                          </span>
                        )}
                      </div>
                      <p className="font-semibold text-white text-lg">{booking.court}</p>
                      <p className="text-sm text-muted mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDateTime(booking.start_time)}
                      </p>
                    </div>
                    {getStatusBadge(booking)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-2 mx-auto mb-4" />
              <p className="text-muted mb-4">Nessuna prenotazione in programma</p>
              <Link href="/bookings" className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-[#06101f] hover:bg-[#5fc7e0] transition">
                <Calendar className="h-4 w-4" />
                Prenota ora
              </Link>
            </div>
          )}

          {/* Quick Links - Funzionalità dalle navbar */}
          <div className="rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-500/10 to-transparent backdrop-blur-xl p-8 mt-8">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <div className="w-1.5 h-8 bg-gradient-to-b from-blue-400 to-cyan-400 rounded-full"></div>
              Accesso Rapido
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Link 
                href="/bookings"
                className="group flex flex-col items-center gap-3 rounded-xl border border-blue-400/20 bg-blue-500/5 p-6 hover:bg-blue-500/10 hover:border-blue-400/40 transition-all duration-300 hover:-translate-y-1"
              >
                <Calendar className="h-8 w-8 text-cyan-400 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-semibold text-white">Prenota Campo</span>
              </Link>
              <Link 
                href="/profile"
                className="group flex flex-col items-center gap-3 rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-6 hover:bg-cyan-500/10 hover:border-cyan-400/40 transition-all duration-300 hover:-translate-y-1"
              >
                <UserCircle className="h-8 w-8 text-cyan-400 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-semibold text-white">Il Mio Profilo</span>
              </Link>
              <Link 
                href="/tornei"
                className="group flex flex-col items-center gap-3 rounded-xl border border-blue-400/20 bg-blue-500/5 p-6 hover:bg-blue-500/10 hover:border-blue-400/40 transition-all duration-300 hover:-translate-y-1"
              >
                <Trophy className="h-8 w-8 text-blue-400 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-semibold text-white">Tornei</span>
              </Link>
              <Link 
                href="/courses"
                className="group flex flex-col items-center gap-3 rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-6 hover:bg-cyan-500/10 hover:border-cyan-400/40 transition-all duration-300 hover:-translate-y-1"
              >
                <CreditCard className="h-8 w-8 text-cyan-400 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-semibold text-white">Abbonamenti</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Tournaments Section */}
        <div className="rounded-xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
              <Trophy className="h-6 w-6 text-[#7de3ff]" />
              I Miei Tornei
            </h2>
            <Link href="/tornei" className="text-sm text-[#7de3ff] hover:underline">
              Esplora tutti i tornei →
            </Link>
          </div>
          
          {loadingTournaments ? (
            <p className="text-sm text-muted text-center py-8">Caricamento tornei...</p>
          ) : tournaments.length > 0 ? (
            <div className="space-y-6">
              {/* Tornei a cui è iscritto */}
              {tournaments.filter(t => t.is_enrolled).length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    Iscrizioni Attive ({tournaments.filter(t => t.is_enrolled).length})
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {tournaments.filter(t => t.is_enrolled).map((tournament) => {
                      const Icon = getTournamentTypeIcon(tournament.tournament_type);
                      return (
                        <div key={tournament.id} className="rounded-lg border border-green-500/30 bg-gradient-to-br from-green-500/10 to-transparent p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="p-2 rounded-lg bg-green-500/20 border border-green-500/30">
                                <Icon className="h-5 w-5 text-green-400" />
                              </div>
                              <div>
                                <span className="text-xs font-semibold text-green-400 uppercase tracking-wider">
                                  {getTournamentTypeLabel(tournament.tournament_type)}
                                </span>
                              </div>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                              tournament.current_phase === 'iscrizioni' 
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                                : tournament.current_phase === 'eliminazione' || tournament.current_phase === 'gironi'
                                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                                : 'bg-gray-500/20 text-gray-400 border border-gray-500/40'
                            }`}>
                              {tournament.current_phase === 'iscrizioni' ? 'Iscrizioni' : 
                               tournament.current_phase === 'eliminazione' ? 'In Corso' :
                               tournament.current_phase === 'gironi' ? 'Gironi' : 'Concluso'}
                            </span>
                          </div>
                          <h4 className="font-bold text-white mb-2">{tournament.title}</h4>
                          <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
                            {tournament.start_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(tournament.start_date).toLocaleDateString('it-IT')}
                              </span>
                            )}
                            {tournament.max_participants && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {tournament.participant_count || 0}/{tournament.max_participants}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Link 
                              href={`/tornei/${tournament.id}`}
                              className="flex-1 text-center rounded-lg bg-[#7de3ff]/20 border border-[#7de3ff]/30 px-3 py-2 text-sm font-semibold text-[#7de3ff] hover:bg-[#7de3ff]/30 transition-all"
                            >
                              Visualizza
                            </Link>
                            {tournament.current_phase === 'iscrizioni' && (
                              <button
                                onClick={() => handleUnenrollTournament(tournament.participation_id!, tournament.title)}
                                disabled={enrolling === tournament.participation_id}
                                className="flex-1 rounded-lg bg-red-500/20 border border-red-500/30 px-3 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/30 transition-all disabled:opacity-50"
                              >
                                {enrolling === tournament.participation_id ? 'Rimozione...' : 'Cancella Iscrizione'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tornei disponibili per iscrizione */}
              {tournaments.filter(t => !t.is_enrolled && t.current_phase === 'iscrizioni').length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-[#7de3ff]" />
                    Tornei Disponibili ({tournaments.filter(t => !t.is_enrolled && t.current_phase === 'iscrizioni').length})
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {tournaments.filter(t => !t.is_enrolled && t.current_phase === 'iscrizioni').map((tournament) => {
                      const Icon = getTournamentTypeIcon(tournament.tournament_type);
                      const isFull = tournament.participant_count! >= tournament.max_participants!;
                      return (
                        <div key={tournament.id} className="rounded-lg border border-[#7de3ff]/20 bg-gradient-to-br from-[#7de3ff]/5 to-transparent p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="p-2 rounded-lg bg-[#7de3ff]/20 border border-[#7de3ff]/30">
                                <Icon className="h-5 w-5 text-[#7de3ff]" />
                              </div>
                              <div>
                                <span className="text-xs font-semibold text-[#7de3ff] uppercase tracking-wider">
                                  {getTournamentTypeLabel(tournament.tournament_type)}
                                </span>
                              </div>
                            </div>
                            {isFull && (
                              <span className="text-xs px-2 py-1 rounded-full font-bold bg-red-500/20 text-red-400 border border-red-500/40">
                                Completo
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-white mb-2">{tournament.title}</h4>
                          <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
                            {tournament.start_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(tournament.start_date).toLocaleDateString('it-IT')}
                              </span>
                            )}
                            {tournament.max_participants && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {tournament.participant_count || 0}/{tournament.max_participants}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Link 
                              href={`/tornei/${tournament.id}`}
                              className="flex-1 text-center rounded-lg bg-[#0a1929]/60 border border-[#7de3ff]/20 px-3 py-2 text-sm font-semibold text-gray-300 hover:bg-[#0a1929]/80 hover:text-white transition-all"
                            >
                              Dettagli
                            </Link>
                            <button
                              onClick={() => handleEnrollTournament(tournament.id)}
                              disabled={enrolling === tournament.id || isFull}
                              className="flex-1 rounded-lg bg-gradient-to-r from-[#7de3ff] to-[#4fb3ff] px-3 py-2 text-sm font-bold text-[#0a1929] hover:shadow-lg hover:shadow-[#7de3ff]/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {enrolling === tournament.id ? 'Iscrizione...' : isFull ? 'Completo' : 'Iscriviti'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <Trophy className="h-12 w-12 text-muted-2 mx-auto mb-4" />
              <p className="text-muted mb-4">Nessun torneo disponibile al momento</p>
              <Link href="/tornei" className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#7de3ff] to-[#4fb3ff] px-6 py-3 text-sm font-semibold text-[#0a1929] hover:shadow-lg hover:shadow-[#7de3ff]/40 transition-all">
                <Trophy className="h-4 w-4" />
                Esplora tornei
              </Link>
            </div>
          )}
        </div>
        </main>
      </div>
    </AuthGuard>
  );
}


