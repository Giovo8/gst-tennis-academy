"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/auth/AuthGuard";
import { Users, Calendar, Settings, TrendingUp, FileText, Target, ImageIcon, List, Type, Shield } from "lucide-react";
import DashboardLinkCard from "@/components/dashboard/DashboardLinkCard";
import StatCard from "@/components/dashboard/StatCard";
import { supabase } from "@/lib/supabase/client";

type Stats = {
  totalUsers: number;
  totalBookings: number;
  todayBookings: number;
};

export default function GestoreDashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalBookings: 0,
    todayBookings: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const [usersRes, bookingsRes, todayBookingsRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("bookings").select("id", { count: "exact", head: true }),
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .gte("start_time", today.toISOString())
          .lt("start_time", tomorrow.toISOString()),
      ]);

      setStats({
        totalUsers: usersRes.count || 0,
        totalBookings: bookingsRes.count || 0,
        todayBookings: todayBookingsRes.count || 0,
      });

      setLoading(false);
    }

    loadStats();
  }, []);

  return (
    <AuthGuard allowedRoles={["gestore", "admin"]}>
      <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-5 px-6 py-10 bg-[#021627] text-white">
        {/* Header */}
        <div className="space-y-2 sm:space-y-3">
          <p className="text-xs sm:text-sm uppercase tracking-[0.2em] text-muted-2 flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Area Gestione
          </p>
          <h1 className="text-4xl font-bold text-white">Dashboard Gestore</h1>
          <p className="text-sm sm:text-base text-muted">Gestisci utenti, prenotazioni e servizi</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Utenti"
            value={loading ? "..." : stats.totalUsers}
            icon={<Users className="h-8 w-8 text-teal-300" />}
            color="teal"
          />

          <StatCard
            title="Prenotazioni"
            value={loading ? "..." : stats.totalBookings}
            icon={<Calendar className="h-8 w-8 text-violet-300" />}
            color="violet"
          />

          <StatCard
            title="Oggi"
            value={loading ? "..." : stats.todayBookings}
            icon={<TrendingUp className="h-8 w-8 text-orange-300" />}
            color="orange"
          />
        </div>

        {/* Management Sections */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Link href="/dashboard/admin/users" className="rounded-xl border-2 border-cyan-400/50 bg-gradient-to-br from-cyan-500/20 to-transparent p-5 hover:border-cyan-400/70 hover:shadow-lg hover:shadow-cyan-500/20 transition-all duration-300">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500/40 to-cyan-600/30 flex items-center justify-center mb-3">
              <Users className="h-6 w-6 text-cyan-200" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">Gestione Utenti</h3>
            <p className="text-sm text-gray-400">Crea, modifica ed elimina utenti. Gestisci ruoli e permessi.</p>
          </Link>

          <Link href="/bookings" className="rounded-xl border-2 border-blue-400/50 bg-gradient-to-br from-blue-500/20 to-transparent p-5 hover:border-blue-400/70 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500/40 to-blue-600/30 flex items-center justify-center mb-3">
              <Calendar className="h-6 w-6 text-blue-200" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">Gestione Prenotazioni</h3>
            <p className="text-sm text-gray-400">Visualizza, gestisci e crea prenotazioni per campi e lezioni.</p>
          </Link>

          <Link href="/dashboard/admin/news" className="rounded-xl border-2 border-sky-400/50 bg-gradient-to-br from-sky-500/20 to-transparent p-5 hover:border-sky-400/70 hover:shadow-lg hover:shadow-sky-500/20 transition-all duration-300">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-sky-500/40 to-sky-600/30 flex items-center justify-center mb-3">
              <FileText className="h-6 w-6 text-sky-200" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">Gestione News</h3>
            <p className="text-sm text-gray-400">Crea, modifica ed elimina le news visibili nella homepage.</p>
          </Link>

          <Link href="/dashboard/admin/hero-images" className="rounded-xl border-2 border-indigo-400/50 bg-gradient-to-br from-indigo-500/20 to-transparent p-5 hover:border-indigo-400/70 hover:shadow-lg hover:shadow-indigo-500/20 transition-all duration-300">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500/40 to-indigo-600/30 flex items-center justify-center mb-3">
              <ImageIcon className="h-6 w-6 text-indigo-200" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">Immagini Hero</h3>
            <p className="text-sm text-gray-400">Gestisci il carousel di immagini della sezione hero.</p>
          </Link>

          <Link href="/dashboard/admin/hero-content" className="rounded-xl border-2 border-blue-400/50 bg-gradient-to-br from-blue-500/20 to-transparent p-5 hover:border-blue-400/70 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500/40 to-indigo-600/30 flex items-center justify-center mb-3">
              <Type className="h-6 w-6 text-blue-200" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">Contenuti Hero</h3>
            <p className="text-sm text-gray-400">Personalizza testi, pulsanti e statistiche della hero.</p>
          </Link>

          <Link href="/dashboard/admin/homepage-order" className="rounded-xl border-2 border-cyan-400/50 bg-gradient-to-br from-cyan-500/20 to-transparent p-5 hover:border-cyan-400/70 hover:shadow-lg hover:shadow-cyan-500/20 transition-all duration-300">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500/40 to-sky-600/30 flex items-center justify-center mb-3">
              <List className="h-6 w-6 text-cyan-200" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">Ordine Homepage</h3>
            <p className="text-sm text-gray-400">Riordina le sezioni visibili nella homepage.</p>
          </Link>

          <Link href="/dashboard/admin/staff" className="rounded-xl border-2 border-sky-400/50 bg-gradient-to-br from-sky-500/20 to-transparent p-5 hover:border-sky-400/70 hover:shadow-lg hover:shadow-sky-500/20 transition-all duration-300">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-sky-500/40 to-blue-600/30 flex items-center justify-center mb-3">
              <Users className="h-6 w-6 text-sky-200" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">Gestione Staff</h3>
            <p className="text-sm text-gray-400">Gestisci i membri dello staff con foto e biografie.</p>
          </Link>

          <Link href="/dashboard/admin/courses" className="rounded-xl border-2 border-blue-400/50 bg-gradient-to-br from-blue-500/20 to-transparent p-5 hover:border-blue-400/70 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500/40 to-cyan-600/30 flex items-center justify-center mb-3">
              <Target className="h-6 w-6 text-blue-200" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">Gestione Corsi</h3>
            <p className="text-sm text-gray-400">Gestisci corsi, abbonamenti e prezzi.</p>
          </Link>

          <Link href="/dashboard/admin/services" className="rounded-xl border-2 border-indigo-400/50 bg-gradient-to-br from-indigo-500/20 to-transparent p-5 hover:border-indigo-400/70 hover:shadow-lg hover:shadow-indigo-500/20 transition-all duration-300">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500/40 to-cyan-600/30 flex items-center justify-center mb-3">
              <Settings className="h-6 w-6 text-indigo-200" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">Servizi</h3>
            <p className="text-sm text-gray-400">Configura corsi, abbonamenti e servizi dell'academy.</p>
          </Link>
 
          <Link href="/dashboard/gestore/tornei" className="rounded-xl border-2 border-cyan-400/50 bg-gradient-to-br from-cyan-500/20 to-transparent p-5 hover:border-cyan-400/70 hover:shadow-lg hover:shadow-cyan-500/20 transition-all duration-300">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500/40 to-blue-700/30 flex items-center justify-center mb-3">
              <Target className="h-6 w-6 text-cyan-200" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">Gestione Tornei</h3>
            <p className="text-sm text-gray-400">Crea tornei e visualizza gli iscritti.</p>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="rounded-xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Azioni Rapide</h2>
          <div className="flex flex-wrap gap-3">
            <Link 
              href="/dashboard/admin/users?action=create"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 transition-all duration-300"
            >
              <Users className="h-4 w-4" />
              Nuovo Utente
            </Link>
            <Link 
              href="/bookings"
              className="inline-flex items-center gap-2 rounded-xl border-2 border-blue-400/50 bg-gradient-to-r from-blue-500/20 to-transparent px-5 py-2.5 text-sm font-semibold text-blue-200 hover:border-blue-400/70 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300"
            >
              <Calendar className="h-4 w-4" />
              Nuova Prenotazione
            </Link>
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
