"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Users, 
  Calendar, 
  TrendingUp, 
  Trophy, 
  LayoutGrid,
  MessageSquare,
  Clock,
  ArrowRight
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type Stats = {
  totalUsers: number;
  totalBookings: number;
  todayBookings: number;
  activeTournaments: number;
};

export default function GestoreDashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalBookings: 0,
    todayBookings: 0,
    activeTournaments: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const [usersRes, bookingsRes, todayBookingsRes, tournamentsRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("bookings").select("id", { count: "exact", head: true }),
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .gte("start_time", today.toISOString())
          .lt("start_time", tomorrow.toISOString()),
        supabase
          .from("tournaments")
          .select("id", { count: "exact", head: true })
          .eq("status", "active"),
      ]);

      setStats({
        totalUsers: usersRes.count || 0,
        totalBookings: bookingsRes.count || 0,
        todayBookings: todayBookingsRes.count || 0,
        activeTournaments: tournamentsRes.count || 0,
      });

      setLoading(false);
    }

    loadStats();
  }, []);

  const quickLinks = [
    {
      title: "Gestione Campi",
      description: "Visualizza stato campi e blocca slot",
      href: "/dashboard/gestore/courts",
      icon: LayoutGrid,
      color: "from-emerald-500/20 to-emerald-600/10",
      borderColor: "border-emerald-500/30",
      iconBg: "from-emerald-500/40 to-emerald-600/30",
    },
    {
      title: "Prenotazioni",
      description: "Gestisci tutte le prenotazioni",
      href: "/dashboard/gestore/bookings",
      icon: Calendar,
      color: "from-blue-500/20 to-blue-600/10",
      borderColor: "border-blue-500/30",
      iconBg: "from-blue-500/40 to-blue-600/30",
    },
    {
      title: "Tornei",
      description: "Gestisci tornei e iscrizioni",
      href: "/dashboard/gestore/tornei",
      icon: Trophy,
      color: "from-amber-500/20 to-amber-600/10",
      borderColor: "border-amber-500/30",
      iconBg: "from-amber-500/40 to-amber-600/30",
    },
    {
      title: "Utenti",
      description: "Gestisci atleti e maestri",
      href: "/dashboard/gestore/users",
      icon: Users,
      color: "from-cyan-500/20 to-cyan-600/10",
      borderColor: "border-cyan-500/30",
      iconBg: "from-cyan-500/40 to-cyan-600/30",
    },
    {
      title: "Bacheca",
      description: "Annunci e comunicazioni",
      href: "/dashboard/gestore/announcements",
      icon: MessageSquare,
      color: "from-violet-500/20 to-violet-600/10",
      borderColor: "border-violet-500/30",
      iconBg: "from-violet-500/40 to-violet-600/30",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard Gestore</h1>
        <p className="text-muted-2">Gestisci le attività dell&apos;academy</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-2">Utenti Totali</p>
              <p className="text-3xl font-bold text-white">
                {loading ? "..." : stats.totalUsers}
              </p>
            </div>
            <div className="rounded-lg bg-emerald-500/20 p-3">
              <Users className="h-6 w-6 text-emerald-400" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-transparent p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-2">Prenotazioni Totali</p>
              <p className="text-3xl font-bold text-white">
                {loading ? "..." : stats.totalBookings}
              </p>
            </div>
            <div className="rounded-lg bg-blue-500/20 p-3">
              <Calendar className="h-6 w-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-transparent p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-2">Prenotazioni Oggi</p>
              <p className="text-3xl font-bold text-white">
                {loading ? "..." : stats.todayBookings}
              </p>
            </div>
            <div className="rounded-lg bg-amber-500/20 p-3">
              <Clock className="h-6 w-6 text-amber-400" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-transparent p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-2">Tornei Attivi</p>
              <p className="text-3xl font-bold text-white">
                {loading ? "..." : stats.activeTournaments}
              </p>
            </div>
            <div className="rounded-lg bg-violet-500/20 p-3">
              <Trophy className="h-6 w-6 text-violet-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Accesso Rapido</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`group rounded-xl border ${link.borderColor} bg-gradient-to-br ${link.color} p-5 transition-all hover:scale-[1.02] hover:shadow-lg`}
              >
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${link.iconBg} flex items-center justify-center mb-3`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                  {link.title}
                  <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </h3>
                <p className="text-sm text-muted-2">{link.description}</p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Azioni Rapide</h2>
        <div className="flex flex-wrap gap-3">
          <Link 
            href="/dashboard/gestore/courts"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 transition-all"
          >
            <LayoutGrid className="h-4 w-4" />
            Gestisci Campi
          </Link>
          <Link 
            href="/dashboard/gestore/bookings"
            className="inline-flex items-center gap-2 rounded-xl border border-blue-500/50 bg-blue-500/10 px-5 py-2.5 text-sm font-semibold text-blue-300 hover:bg-blue-500/20 transition-all"
          >
            <Calendar className="h-4 w-4" />
            Vedi Prenotazioni
          </Link>
          <Link 
            href="/dashboard/gestore/users"
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/50 bg-cyan-500/10 px-5 py-2.5 text-sm font-semibold text-cyan-300 hover:bg-cyan-500/20 transition-all"
          >
            <Users className="h-4 w-4" />
            Gestisci Utenti
          </Link>
        </div>
      </div>
    </div>
  );
}
