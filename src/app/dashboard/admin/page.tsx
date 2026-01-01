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
  totalTournaments: number;
  activeTournaments: number;
  activeCourses: number;
  pendingBookings: number;
  monthlyRevenue: number;
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalBookings: 0,
    todayBookings: 0,
    totalTournaments: 0,
    activeTournaments: 0,
    activeCourses: 0,
    pendingBookings: 0,
    monthlyRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const response = await fetch("/api/stats/admin");
        if (!response.ok) throw new Error("Errore caricamento statistiche");
        
        const data = await response.json();
        setStats({
          totalUsers: data.totalUsers || 0,
          totalBookings: data.totalBookings || 0,
          todayBookings: data.bookingsToday || 0,
          totalTournaments: data.totalTournaments || 0,
          activeTournaments: data.activeTournaments || 0,
          activeCourses: data.activeCourses || 0,
          pendingBookings: data.pendingBookings || 0,
          monthlyRevenue: data.monthlyRevenue || 0,
        });
      } catch (error) {
        console.error("Errore caricamento statistiche:", error);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  return (
    <AuthGuard allowedRoles={["admin", "gestore"]}>
      <div className="min-h-screen bg-gradient-to-br from-[#021627] via-[#031a35] to-[#021627] text-white">
        <main className="mx-auto flex max-w-7xl flex-col gap-4 sm:gap-6 px-4 sm:px-6 py-6 sm:py-10">
          {/* Header */}
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center gap-2 text-blue-400">
              <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
              <p className="text-xs sm:text-sm uppercase tracking-[0.2em] font-semibold">Area Amministrazione</p>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-200 via-blue-300 to-cyan-300 bg-clip-text text-transparent">
              Dashboard Admin
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-gray-400">Gestisci utenti, prenotazioni e servizi</p>
          </div>

        {/* Stats Grid */}
        <div className="grid gap-3 sm:gap-4 lg:gap-6 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard
            title="Utenti"
            value={loading ? "..." : stats.totalUsers}
            icon={<Users className="h-8 w-8 text-sky-300" />}
            color="sky"
          />

          <StatCard
            title="Prenotazioni Oggi"
            value={loading ? "..." : stats.todayBookings}
            icon={<TrendingUp className="h-7 w-7 text-indigo-300" />}
            color="indigo"
          />

          <StatCard
            title="In Attesa"
            value={loading ? "..." : stats.pendingBookings}
            icon={<Calendar className="h-8 w-8 text-yellow-300" />}
            color="yellow"
          />

          <StatCard
            title="Tornei Attivi"
            value={loading ? "..." : stats.activeTournaments}
            icon={<Trophy className="h-8 w-8 text-orange-300" />}
            color="orange"
          />

          <StatCard
            title="Corsi Attivi"
            value={loading ? "..." : stats.activeCourses}
            icon={<Users className="h-8 w-8 text-green-300" />}
            color="green"
          />

          <StatCard
            title="Revenue €"
            value={loading ? "..." : Math.round(stats.monthlyRevenue)}
            icon={<TrendingUp className="h-8 w-8 text-emerald-300" />}
            color="green"
          />
        </div>

        {/* Management Sections */}
        <div className="grid gap-4 sm:gap-5 lg:gap-6 sm:grid-cols-2 lg:grid-cols-3">
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

          <DashboardLinkCard
            href="/dashboard/admin/promo-banner"
            icon={<Target className="h-10 w-10" />}
            title="Banner Promozionale"
            description="Gestisci il banner visualizzato nella homepage."
          />
        </div>

        {/* Quick Actions */}
        <div className="rounded-xl sm:rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-500/10 to-transparent backdrop-blur-xl p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-4 sm:mb-6 flex items-center gap-2.5 sm:gap-3">
            <div className="w-1 sm:w-1.5 h-6 sm:h-8 bg-gradient-to-b from-blue-400 to-cyan-400 rounded-full"></div>
            Azioni Rapide
          </h2>
          <div className="flex flex-wrap gap-3 sm:gap-4">
            <Link 
              href="/dashboard/admin/users?action=create"
              className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-5 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-white hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 hover:-translate-y-0.5 min-h-[44px]"
            >
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 group-hover:scale-110 transition-transform" />
              Nuovo Utente
            </Link>
            <Link 
              href="/bookings"
              className="group inline-flex items-center gap-2 rounded-xl border-2 border-blue-400/30 bg-blue-500/10 px-5 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-blue-300 hover:bg-blue-500/20 hover:border-blue-400/50 transition-all duration-300 hover:-translate-y-0.5 min-h-[44px]"
            >
              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 group-hover:scale-110 transition-transform" />
              Nuova Prenotazione
            </Link>
          </div>
        </div>
      </main>
      </div>
    </AuthGuard>
  );
}


