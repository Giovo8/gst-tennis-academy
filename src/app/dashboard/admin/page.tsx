"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/auth/AuthGuard";
import { Users, Calendar, Settings, TrendingUp, FileText, Target, CreditCard, ImageIcon, List, Type, Trophy, MessageSquare, Mail, Sparkles } from "lucide-react";
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
      <div className="min-h-screen bg-gradient-to-br from-[#021627] via-[#031a35] to-[#021627] text-white">
        <main className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-16">
          {/* Header */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-blue-400">
              <Settings className="h-5 w-5" />
              <p className="text-sm uppercase tracking-[0.2em] font-semibold">Area Amministrazione</p>
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-200 via-blue-300 to-cyan-300 bg-clip-text text-transparent">
              Dashboard Admin
            </h1>
            <p className="text-lg text-gray-400">Gestisci utenti, prenotazioni e servizi</p>
          </div>

        {/* Stats Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Utenti"
            value={loading ? "..." : stats.totalUsers}
            icon={<Users className="h-7 w-7" />}
            color="blue"
          />

          <StatCard
            title="Prenotazioni"
            value={loading ? "..." : stats.totalBookings}
            icon={<Calendar className="h-7 w-7" />}
            color="green"
          />

          <StatCard
            title="Oggi"
            value={loading ? "..." : stats.todayBookings}
            icon={<TrendingUp className="h-7 w-7" />}
            color="purple"
          />
        </div>

        {/* Management Sections */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <DashboardLinkCard href="/dashboard/admin/users" icon={<Users className="h-10 w-10" />} title="Gestione Utenti" description="Crea, modifica ed elimina utenti. Gestisci ruoli e permessi." footer={<span className="text-xs text-gray-400">Vai alla gestione utenti</span>} />

          <DashboardLinkCard href="/bookings" icon={<Calendar className="h-10 w-10" />} title="Gestione Prenotazioni" description="Visualizza, gestisci e crea prenotazioni per campi e lezioni." footer={<span className="text-xs text-gray-400">Apri calendario prenotazioni</span>} />

          <DashboardLinkCard href="/dashboard/admin/news" icon={<FileText className="h-10 w-10" />} title="Gestione News" description="Crea, modifica ed elimina le news visibili nella homepage." />

          <DashboardLinkCard href="/dashboard/admin/hero-images" icon={<ImageIcon className="h-10 w-10" />} title="Immagini Hero" description="Gestisci il carousel di immagini della sezione hero." />

          <DashboardLinkCard href="/dashboard/admin/hero-content" icon={<Type className="h-10 w-10" />} title="Contenuti Hero" description="Personalizza testi, pulsanti e statistiche della hero." />

          <DashboardLinkCard href="/dashboard/admin/homepage-order" icon={<List className="h-10 w-10" />} title="Ordine Homepage" description="Riordina le sezioni visibili nella homepage." />

          <DashboardLinkCard href="/dashboard/admin/staff" icon={<Users className="h-10 w-10" />} title="Gestione Staff" description="Gestisci i membri dello staff con foto e biografie." />

          <DashboardLinkCard href="/dashboard/admin/courses" icon={<Target className="h-10 w-10" />} title="Gestione Corsi" description="Gestisci corsi, abbonamenti e prezzi." />

          <DashboardLinkCard href="/dashboard/admin/services" icon={<Settings className="h-10 w-10" />} title="Servizi" description="Configura corsi, abbonamenti e servizi dell'academy." />

          <DashboardLinkCard
            href="/dashboard/admin/tornei"
            icon={<Trophy className="h-10 w-10" />}
            title="Gestione Tornei"
            description="Gestisci i tornei dell'academy."
          />

          <DashboardLinkCard
            href="/dashboard/admin/announcements"
            icon={<MessageSquare className="h-10 w-10" />}
            title="Bacheca Annunci"
            description="Gestisci gli annunci visibili nella bacheca."
          />

          <DashboardLinkCard
            href="/dashboard/admin/email"
            icon={<Mail className="h-10 w-10" />}
            title="Email Marketing"
            description="Invia email agli utenti e gestisci le campagne."
          />

          <DashboardLinkCard
            href="/dashboard/admin/gallery"
            icon={<Sparkles className="h-10 w-10" />}
            title="Galleria Immagini"
            description="Gestisci la galleria fotografica dell'academy."
          />
        </div>

        {/* Quick Actions */}
        <div className="rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-500/10 to-transparent backdrop-blur-xl p-8">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <div className="w-1.5 h-8 bg-gradient-to-b from-blue-400 to-cyan-400 rounded-full"></div>
            Azioni Rapide
          </h2>
          <div className="flex flex-wrap gap-4">
            <Link 
              href="/dashboard/admin/users?action=create"
              className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-3 text-sm font-semibold text-white hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 hover:-translate-y-0.5"
            >
              <Users className="h-4 w-4 group-hover:scale-110 transition-transform" />
              Nuovo Utente
            </Link>
            <Link 
              href="/bookings"
              className="group inline-flex items-center gap-2 rounded-xl border-2 border-blue-400/30 bg-blue-500/10 px-6 py-3 text-sm font-semibold text-blue-300 hover:bg-blue-500/20 hover:border-blue-400/50 transition-all duration-300 hover:-translate-y-0.5"
            >
              <Calendar className="h-4 w-4 group-hover:scale-110 transition-transform" />
              Nuova Prenotazione
            </Link>
          </div>
        </div>
      </main>
      </div>
    </AuthGuard>
  );
}


