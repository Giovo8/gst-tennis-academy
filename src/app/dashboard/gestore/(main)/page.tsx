"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Users, 
  Calendar, 
  Trophy, 
  LayoutGrid,
  MessageSquare,
  Clock,
  ArrowRight,
  Sparkles,
  Zap,
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
    },
    {
      title: "Prenotazioni",
      description: "Gestisci tutte le prenotazioni",
      href: "/dashboard/gestore/bookings",
      icon: Calendar,
    },
    {
      title: "Tornei",
      description: "Gestisci tornei e iscrizioni",
      href: "/dashboard/gestore/tornei",
      icon: Trophy,
    },
    {
      title: "Utenti",
      description: "Gestisci atleti e maestri",
      href: "/dashboard/gestore/users",
      icon: Users,
    },
    {
      title: "Bacheca",
      description: "Annunci e comunicazioni",
      href: "/dashboard/gestore/announcements",
      icon: MessageSquare,
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-24 bg-white/5 rounded-2xl border border-white/10" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-white/5 rounded-2xl border border-white/10" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/10 via-transparent to-cyan-500/10 backdrop-blur-xl p-6 sm:p-8">
        <div className="pointer-events-none absolute left-10 top-5 h-32 w-32 rounded-full blur-3xl bg-blue-500/20 animate-pulse" />
        <div className="pointer-events-none absolute right-10 bottom-5 h-24 w-24 rounded-full blur-3xl bg-cyan-500/15 animate-pulse" style={{animationDelay: '1s'}} />
        
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-blue-300 mb-3">
            <Sparkles className="h-3.5 w-3.5" />
            Area Gestore
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Dashboard Gestore</h1>
          <p className="text-white/60">Gestisci le attività dell&apos;academy</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 hover:border-white/20 hover:bg-white/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/10">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{stats.totalUsers}</p>
            <p className="text-sm text-white/50 mt-1">utenti totali</p>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 hover:border-white/20 hover:bg-white/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-green-500/10">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-green-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{stats.totalBookings}</p>
            <p className="text-sm text-white/50 mt-1">prenotazioni totali</p>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 hover:border-white/20 hover:bg-white/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/10">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-400" />
              </div>
              <span className="text-xs text-white/40">Oggi</span>
            </div>
            <p className="text-3xl font-bold text-white">{stats.todayBookings}</p>
            <p className="text-sm text-white/50 mt-1">prenotazioni oggi</p>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 hover:border-white/20 hover:bg-white/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/10">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Trophy className="h-5 w-5 text-purple-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{stats.activeTournaments}</p>
            <p className="text-sm text-white/50 mt-1">tornei attivi</p>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
            <Zap className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="font-semibold text-white">Accesso Rapido</h2>
            <p className="text-xs text-white/50">Funzioni principali</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 hover:border-white/20 hover:bg-white/10 transition-all duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-4 group-hover:bg-cyan-500/20 group-hover:shadow-lg group-hover:shadow-cyan-500/20 transition-all">
                    <Icon className="h-6 w-6 text-cyan-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                    {link.title}
                    <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-cyan-400" />
                  </h3>
                  <p className="text-sm text-white/50">{link.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
        <h2 className="font-semibold text-white mb-4">Azioni Rapide</h2>
        <div className="flex flex-wrap gap-3">
          <Link 
            href="/dashboard/gestore/courts"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-5 py-2.5 text-sm font-semibold text-white hover:shadow-lg hover:shadow-cyan-500/30 transition-all"
          >
            <LayoutGrid className="h-4 w-4" />
            Gestisci Campi
          </Link>
          <Link 
            href="/dashboard/gestore/bookings"
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10 hover:border-white/30 transition-all"
          >
            <Calendar className="h-4 w-4" />
            Vedi Prenotazioni
          </Link>
          <Link 
            href="/dashboard/gestore/users"
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10 hover:border-white/30 transition-all"
          >
            <Users className="h-4 w-4" />
            Gestisci Utenti
          </Link>
        </div>
      </div>
    </div>
  );
}
