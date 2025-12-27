"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/auth/AuthGuard";
import { Users, Calendar, Settings, TrendingUp, FileText, Target, CreditCard, ImageIcon, List, Type } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type Stats = {
  totalUsers: number;
  totalBookings: number;
  todayBookings: number;
};

export default function AdminDashboardPage() {
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
    <AuthGuard allowedRoles={["admin", "gestore"]}>
      <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-6 py-12 bg-[#021627] text-white">
        {/* Header */}
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-2 flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Area Amministrazione
          </p>
          <h1 className="text-4xl font-bold text-white">Dashboard Admin</h1>
          <p className="text-sm text-muted">Gestisci utenti, prenotazioni e servizi</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-accent/30 bg-gradient-to-br from-blue-500/20 to-blue-500/5 p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-500/20 p-3">
                <Users className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{loading ? "..." : stats.totalUsers}</p>
                <p className="text-sm text-muted">Utenti</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-accent/30 bg-gradient-to-br from-green-500/20 to-green-500/5 p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-500/20 p-3">
                <Calendar className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{loading ? "..." : stats.totalBookings}</p>
                <p className="text-sm text-muted">Prenotazioni</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-accent/30 bg-gradient-to-br from-purple-500/20 to-purple-500/5 p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-purple-500/20 p-3">
                <TrendingUp className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{loading ? "..." : stats.todayBookings}</p>
                <p className="text-sm text-muted">Oggi</p>
              </div>
            </div>
          </div>
        </div>

        {/* Management Sections */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Link 
            href="/dashboard/admin/users" 
            className="group rounded-xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-8 hover:bg-[#1a3d5c]/80 transition-all hover:border-accent/50 hover:shadow-lg hover:shadow-accent/10"
          >
            <Users className="h-12 w-12 text-accent mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-xl font-semibold text-white mb-2">Gestione Utenti</h3>
            <p className="text-sm text-muted">Crea, modifica ed elimina utenti. Gestisci ruoli e permessi.</p>
          </Link>

          <Link 
            href="/dashboard/admin/bookings" 
            className="group rounded-xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-8 hover:bg-[#1a3d5c]/80 transition-all hover:border-accent/50 hover:shadow-lg hover:shadow-accent/10"
          >
            <Calendar className="h-12 w-12 text-accent mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-xl font-semibold text-white mb-2">Prenotazioni</h3>
            <p className="text-sm text-muted">Visualizza e gestisci tutte le prenotazioni di campi e lezioni.</p>
          </Link>

          <Link 
            href="/dashboard/admin/news" 
            className="group rounded-xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-8 hover:bg-[#1a3d5c]/80 transition-all hover:border-accent/50 hover:shadow-lg hover:shadow-accent/10"
          >
            <FileText className="h-12 w-12 text-accent mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-xl font-semibold text-white mb-2">Gestione News</h3>
            <p className="text-sm text-muted">Crea, modifica ed elimina le news visibili nella homepage.</p>
          </Link>

          <Link 
            href="/dashboard/admin/hero-images" 
            className="group rounded-xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-8 hover:bg-[#1a3d5c]/80 transition-all hover:border-accent/50 hover:shadow-lg hover:shadow-accent/10"
          >
            <ImageIcon className="h-12 w-12 text-accent mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-xl font-semibold text-white mb-2">Immagini Hero</h3>
            <p className="text-sm text-muted">Gestisci il carousel di immagini della sezione hero.</p>
          </Link>

          <Link 
            href="/dashboard/admin/hero-content" 
            className="group rounded-xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-8 hover:bg-[#1a3d5c]/80 transition-all hover:border-accent/50 hover:shadow-lg hover:shadow-accent/10"
          >
            <Type className="h-12 w-12 text-accent mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-xl font-semibold text-white mb-2">Contenuti Hero</h3>
            <p className="text-sm text-muted">Personalizza testi, pulsanti e statistiche della hero.</p>
          </Link>

          <Link 
            href="/dashboard/admin/homepage-order" 
            className="group rounded-xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-8 hover:bg-[#1a3d5c]/80 transition-all hover:border-accent/50 hover:shadow-lg hover:shadow-accent/10"
          >
            <List className="h-12 w-12 text-accent mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-xl font-semibold text-white mb-2">Ordine Homepage</h3>
            <p className="text-sm text-muted">Riordina le sezioni visibili nella homepage.</p>
          </Link>

          <Link 
            href="/dashboard/admin/staff" 
            className="group rounded-xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-8 hover:bg-[#1a3d5c]/80 transition-all hover:border-accent/50 hover:shadow-lg hover:shadow-accent/10"
          >
            <Users className="h-12 w-12 text-accent mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-xl font-semibold text-white mb-2">Gestione Staff</h3>
            <p className="text-sm text-muted">Gestisci i membri dello staff con foto e biografie.</p>
          </Link>

          <Link 
            href="/dashboard/admin/subscriptions" 
            className="group rounded-xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-8 hover:bg-[#1a3d5c]/80 transition-all hover:border-accent/50 hover:shadow-lg hover:shadow-accent/10"
          >
            <CreditCard className="h-12 w-12 text-accent mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-xl font-semibold text-white mb-2">Gestione Abbonamenti</h3>
            <p className="text-sm text-muted">Gestisci i piani di abbonamento e i prezzi.</p>
          </Link>

          <Link 
            href="/dashboard/admin/programs" 
            className="group rounded-xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-8 hover:bg-[#1a3d5c]/80 transition-all hover:border-accent/50 hover:shadow-lg hover:shadow-accent/10"
          >
            <Target className="h-12 w-12 text-accent mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-xl font-semibold text-white mb-2">Gestione Programmi</h3>
            <p className="text-sm text-muted">Gestisci i programmi di allenamento offerti.</p>
          </Link>

          <Link 
            href="/dashboard/admin/services" 
            className="group rounded-xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-8 hover:bg-[#1a3d5c]/80 transition-all hover:border-accent/50 hover:shadow-lg hover:shadow-accent/10"
          >
            <Settings className="h-12 w-12 text-accent mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-xl font-semibold text-white mb-2">Servizi</h3>
            <p className="text-sm text-muted">Configura corsi, abbonamenti e servizi dell'academy.</p>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="rounded-xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Azioni Rapide</h2>
          <div className="flex flex-wrap gap-3">
            <Link 
              href="/dashboard/admin/users?action=create"
              className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-[#06101f] hover:bg-[#5fc7e0] transition"
            >
              <Users className="h-4 w-4" />
              Nuovo Utente
            </Link>
            <Link 
              href="/bookings"
              className="inline-flex items-center gap-2 rounded-full border border-accent px-6 py-3 text-sm font-semibold text-accent hover:bg-accent/10 transition"
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


