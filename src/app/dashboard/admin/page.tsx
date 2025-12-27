"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/auth/AuthGuard";
import { Users, Calendar, Settings, TrendingUp, FileText, Target, CreditCard, ImageIcon, List, Type } from "lucide-react";
import DashboardLinkCard from "@/components/dashboard/DashboardLinkCard";
import StatCard from "@/components/dashboard/StatCard";
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
          <StatCard
            title="Utenti"
            value={loading ? "..." : stats.totalUsers}
            icon={<Users className="h-8 w-8 text-blue-400" />}
            color="blue"
          />

          <StatCard
            title="Prenotazioni"
            value={loading ? "..." : stats.totalBookings}
            icon={<Calendar className="h-8 w-8 text-green-400" />}
            color="green"
          />

          <StatCard
            title="Oggi"
            value={loading ? "..." : stats.todayBookings}
            icon={<TrendingUp className="h-8 w-8 text-purple-400" />}
            color="purple"
          />
        </div>

        {/* Management Sections */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <DashboardLinkCard href="/dashboard/admin/users" icon={<Users className="h-12 w-12 text-accent mb-4 group-hover:scale-110 transition-transform" />} title="Gestione Utenti" description="Crea, modifica ed elimina utenti. Gestisci ruoli e permessi." footer={<span className="text-xs text-muted">Vai alla gestione utenti</span>} />

          <DashboardLinkCard href="/bookings" icon={<Calendar className="h-12 w-12 text-accent mb-4 group-hover:scale-110 transition-transform" />} title="Gestione Prenotazioni" description="Visualizza, gestisci e crea prenotazioni per campi e lezioni." footer={<span className="text-xs text-muted">Apri calendario prenotazioni</span>} />

          <DashboardLinkCard href="/dashboard/admin/news" icon={<FileText className="h-12 w-12 text-accent mb-4 group-hover:scale-110 transition-transform" />} title="Gestione News" description="Crea, modifica ed elimina le news visibili nella homepage." />

          <DashboardLinkCard href="/dashboard/admin/hero-images" icon={<ImageIcon className="h-12 w-12 text-accent mb-4 group-hover:scale-110 transition-transform" />} title="Immagini Hero" description="Gestisci il carousel di immagini della sezione hero." />

          <DashboardLinkCard href="/dashboard/admin/hero-content" icon={<Type className="h-12 w-12 text-accent mb-4 group-hover:scale-110 transition-transform" />} title="Contenuti Hero" description="Personalizza testi, pulsanti e statistiche della hero." />

          <DashboardLinkCard href="/dashboard/admin/homepage-order" icon={<List className="h-12 w-12 text-accent mb-4 group-hover:scale-110 transition-transform" />} title="Ordine Homepage" description="Riordina le sezioni visibili nella homepage." />

          <DashboardLinkCard href="/dashboard/admin/staff" icon={<Users className="h-12 w-12 text-accent mb-4 group-hover:scale-110 transition-transform" />} title="Gestione Staff" description="Gestisci i membri dello staff con foto e biografie." />

          <DashboardLinkCard href="/dashboard/admin/courses" icon={<Target className="h-12 w-12 text-accent mb-4 group-hover:scale-110 transition-transform" />} title="Gestione Corsi" description="Gestisci corsi, abbonamenti e prezzi." />

          <DashboardLinkCard href="/dashboard/admin/services" icon={<Settings className="h-12 w-12 text-accent mb-4 group-hover:scale-110 transition-transform" />} title="Servizi" description="Configura corsi, abbonamenti e servizi dell'academy." />
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


