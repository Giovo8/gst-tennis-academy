"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import {
  Users,
  Calendar,
  Trophy,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight,
  LayoutGrid,
  Activity,
} from "lucide-react";

interface Stats {
  totalUsers: number;
  todayBookings: number;
  pendingBookings: number;
  activeTournaments: number;
  monthlyRevenue: number;
  newUsersThisMonth: number;
}

interface CourtStatus {
  name: string;
  status: "free" | "occupied" | "maintenance";
  currentBooking?: {
    user: string;
    endTime: string;
  };
}

interface RecentActivity {
  id: string;
  type: "booking" | "registration" | "tournament";
  message: string;
  time: string;
}

export default function AdminControlRoom() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    todayBookings: 0,
    pendingBookings: 0,
    activeTournaments: 0,
    monthlyRevenue: 0,
    newUsersThisMonth: 0,
  });
  const [courts, setCourts] = useState<CourtStatus[]>([]);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  async function loadDashboardData() {
    // Load stats from API
    try {
      const response = await fetch("/api/stats/admin");
      if (response.ok) {
        const data = await response.json();
        setStats({
          totalUsers: data.totalUsers || 0,
          todayBookings: data.bookingsToday || 0,
          pendingBookings: data.pendingBookings || 0,
          activeTournaments: data.activeTournaments || 0,
          monthlyRevenue: data.monthlyRevenue || 0,
          newUsersThisMonth: data.newUsersThisMonth || 0,
        });
      }
    } catch {}

    // Load court status
    const now = new Date();
    const courtNames = ["Campo 1", "Campo 2", "Campo 3", "Campo 4"];
    
    const { data: currentBookings } = await supabase
      .from("bookings")
      .select("court, user_id, end_time")
      .neq("status", "cancelled")
      .lte("start_time", now.toISOString())
      .gt("end_time", now.toISOString());

    const { data: blockedCourts } = await supabase
      .from("court_blocks")
      .select("court_name")
      .lte("start_time", now.toISOString())
      .gt("end_time", now.toISOString());

    const blockedCourtNames = blockedCourts?.map(b => b.court_name) || [];

    const courtStatuses: CourtStatus[] = courtNames.map(name => {
      if (blockedCourtNames.includes(name)) {
        return { name, status: "maintenance" };
      }

      const booking = currentBookings?.find(b => b.court === name);
      if (booking) {
        return {
          name,
          status: "occupied",
          currentBooking: {
            user: "In uso",
            endTime: new Date(booking.end_time).toLocaleTimeString("it-IT", {
              hour: "2-digit",
              minute: "2-digit"
            }),
          },
        };
      }

      return { name, status: "free" };
    });

    setCourts(courtStatuses);

    // Load recent activities
    const recentActivities: RecentActivity[] = [];
    
    // Recent bookings
    const { data: recentBookings } = await supabase
      .from("bookings")
      .select("id, court, created_at")
      .order("created_at", { ascending: false })
      .limit(3);

    recentBookings?.forEach(b => {
      recentActivities.push({
        id: `booking-${b.id}`,
        type: "booking",
        message: `Nuova prenotazione: ${b.court}`,
        time: getRelativeTime(b.created_at),
      });
    });

    // Recent registrations
    const { data: recentUsers } = await supabase
      .from("profiles")
      .select("id, full_name, created_at")
      .order("created_at", { ascending: false })
      .limit(2);

    recentUsers?.forEach(u => {
      recentActivities.push({
        id: `user-${u.id}`,
        type: "registration",
        message: `Nuovo utente: ${u.full_name || "Anonimo"}`,
        time: getRelativeTime(u.created_at),
      });
    });

    // Sort by time
    setActivities(recentActivities.slice(0, 5));
    setLoading(false);
  }

  function getRelativeTime(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Ora";
    if (diffMins < 60) return `${diffMins} min fa`;
    if (diffHours < 24) return `${diffHours} ore fa`;
    return `${diffDays} giorni fa`;
  }

  const getCourtStatusColor = (status: CourtStatus["status"]) => {
    switch (status) {
      case "free": return "bg-green-500";
      case "occupied": return "bg-red-500";
      case "maintenance": return "bg-yellow-500";
    }
  };

  const getCourtStatusLabel = (status: CourtStatus["status"]) => {
    switch (status) {
      case "free": return "Libero";
      case "occupied": return "Occupato";
      case "maintenance": return "Manutenzione";
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 skeleton rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 skeleton rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Control Room</h1>
          <p className="text-[var(--foreground-muted)] mt-1">
            Panoramica in tempo reale dell'academy
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-[var(--foreground-muted)]">
          <Activity className="h-4 w-4 text-green-500 animate-pulse" />
          Live
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[var(--surface)] rounded-xl p-5 border border-[var(--border)]">
          <div className="flex items-center justify-between mb-3">
            <Users className="h-5 w-5 text-[var(--primary)]" />
            <span className="text-xs text-green-500">
              +{stats.newUsersThisMonth} questo mese
            </span>
          </div>
          <p className="text-3xl font-bold text-[var(--foreground)]">{stats.totalUsers}</p>
          <p className="text-sm text-[var(--foreground-subtle)] mt-1">utenti totali</p>
        </div>

        <div className="bg-[var(--surface)] rounded-xl p-5 border border-[var(--border)]">
          <div className="flex items-center justify-between mb-3">
            <Calendar className="h-5 w-5 text-green-500" />
            <span className="text-xs text-[var(--foreground-subtle)]">Oggi</span>
          </div>
          <p className="text-3xl font-bold text-[var(--foreground)]">{stats.todayBookings}</p>
          <p className="text-sm text-[var(--foreground-subtle)] mt-1">prenotazioni</p>
        </div>

        <div className="bg-[var(--surface)] rounded-xl p-5 border border-[var(--border)]">
          <div className="flex items-center justify-between mb-3">
            <Clock className="h-5 w-5 text-yellow-500" />
            <span className="text-xs text-yellow-500">Da confermare</span>
          </div>
          <p className="text-3xl font-bold text-[var(--foreground)]">{stats.pendingBookings}</p>
          <p className="text-sm text-[var(--foreground-subtle)] mt-1">in attesa</p>
        </div>

        <div className="bg-[var(--surface)] rounded-xl p-5 border border-[var(--border)]">
          <div className="flex items-center justify-between mb-3">
            <Trophy className="h-5 w-5 text-purple-500" />
            <span className="text-xs text-[var(--foreground-subtle)]">Attivi</span>
          </div>
          <p className="text-3xl font-bold text-[var(--foreground)]">{stats.activeTournaments}</p>
          <p className="text-sm text-[var(--foreground-subtle)] mt-1">tornei</p>
        </div>
      </div>

      {/* Courts Status */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)]">
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-[var(--primary)]" />
            <h2 className="font-semibold text-[var(--foreground)]">Stato Campi</h2>
          </div>
          <Link
            href="/dashboard/admin/courts"
            className="text-sm text-[var(--primary)] hover:underline"
          >
            Gestisci
          </Link>
        </div>
        
        <div className="p-5 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {courts.map((court) => (
            <div
              key={court.name}
              className="p-4 rounded-lg border border-[var(--border)] bg-[var(--background-subtle)]"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-[var(--foreground)]">{court.name}</span>
                <span className={`w-3 h-3 rounded-full ${getCourtStatusColor(court.status)}`} />
              </div>
              <p className={`text-sm font-medium ${
                court.status === "free" ? "text-green-600 dark:text-green-400" :
                court.status === "occupied" ? "text-red-600 dark:text-red-400" :
                "text-yellow-600 dark:text-yellow-400"
              }`}>
                {getCourtStatusLabel(court.status)}
              </p>
              {court.currentBooking && (
                <p className="text-xs text-[var(--foreground-muted)] mt-1">
                  Fino alle {court.currentBooking.endTime}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)]">
          <div className="p-5 border-b border-[var(--border)]">
            <h2 className="font-semibold text-[var(--foreground)]">Azioni Rapide</h2>
          </div>
          <div className="p-4 space-y-2">
            <Link
              href="/dashboard/admin/users"
              className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--surface-hover)] transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-[var(--primary)]" />
                <span className="text-[var(--foreground)]">Gestione Utenti</span>
              </div>
              <ArrowRight className="h-4 w-4 text-[var(--foreground-subtle)] group-hover:text-[var(--primary)]" />
            </Link>
            
            <Link
              href="/dashboard/admin/bookings"
              className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--surface-hover)] transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-green-500" />
                <span className="text-[var(--foreground)]">Gestione Prenotazioni</span>
              </div>
              <ArrowRight className="h-4 w-4 text-[var(--foreground-subtle)] group-hover:text-green-500" />
            </Link>
            
            <Link
              href="/dashboard/admin/tornei"
              className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--surface-hover)] transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Trophy className="h-5 w-5 text-purple-500" />
                <span className="text-[var(--foreground)]">Gestione Tornei</span>
              </div>
              <ArrowRight className="h-4 w-4 text-[var(--foreground-subtle)] group-hover:text-purple-500" />
            </Link>
            
            <Link
              href="/dashboard/admin/invite-codes"
              className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--surface-hover)] transition-colors group"
            >
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-yellow-500" />
                <span className="text-[var(--foreground)]">Codici Invito</span>
              </div>
              <ArrowRight className="h-4 w-4 text-[var(--foreground-subtle)] group-hover:text-yellow-500" />
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)]">
          <div className="p-5 border-b border-[var(--border)]">
            <h2 className="font-semibold text-[var(--foreground)]">Attività Recenti</h2>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {activities.length === 0 ? (
              <div className="p-8 text-center text-[var(--foreground-muted)]">
                Nessuna attività recente
              </div>
            ) : (
              activities.map((activity) => (
                <div key={activity.id} className="p-4 flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    activity.type === "booking" ? "bg-green-500" :
                    activity.type === "registration" ? "bg-blue-500" :
                    "bg-purple-500"
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm text-[var(--foreground)]">{activity.message}</p>
                    <p className="text-xs text-[var(--foreground-subtle)]">{activity.time}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
