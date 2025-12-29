"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import Link from "next/link";
import { Calendar, Clock, User, TrendingUp, AlertCircle, CheckCircle, XCircle, Award, Target, Trophy, UserCircle, CreditCard } from "lucide-react";
import DashboardLinkCard from "@/components/dashboard/DashboardLinkCard";
import StatCard from "@/components/dashboard/StatCard";
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
  }, []);

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
        </main>
      </div>
    </AuthGuard>
  );
}


