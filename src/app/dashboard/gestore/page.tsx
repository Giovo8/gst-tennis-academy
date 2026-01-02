'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import StatsCard from '@/components/dashboard/StatsCard';
import ChartCard from '@/components/dashboard/ChartCard';
import RecentActivity from '@/components/dashboard/RecentActivity';
import QuickActions from '@/components/dashboard/QuickActions';
import TimeTracker from '@/components/dashboard/TimeTracker';
import ProjectCard from '@/components/dashboard/ProjectCard';
import { 
  DollarSign, 
  Users, 
  Calendar, 
  TrendingUp,
  Activity,
  FileText,
  Settings,
  AlertCircle
} from 'lucide-react';

interface DashboardStats {
  monthlyRevenue: number;
  totalBookings: number;
  activeMembers: number;
  occupancyRate: number;
  revenueChange: number;
  bookingsChange: number;
  membersChange: number;
  occupancyChange: number;
}

export default function GestoreDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    monthlyRevenue: 0,
    totalBookings: 0,
    activeMembers: 0,
    occupancyRate: 0,
    revenueChange: 0,
    bookingsChange: 0,
    membersChange: 0,
    occupancyChange: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    const loadData = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) return;

        setUser(currentUser);

        // Carica statistiche
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [bookingsResult, membersResult] = await Promise.all([
          supabase
            .from('bookings')
            .select('id', { count: 'exact' })
            .gte('created_at', firstDayOfMonth.toISOString()),
          supabase
            .from('profiles')
            .select('id', { count: 'exact' })
            .eq('role', 'atleta')
        ]);

        setStats({
          monthlyRevenue: 45250,
          totalBookings: bookingsResult.count || 0,
          activeMembers: membersResult.count || 0,
          occupancyRate: 78,
          revenueChange: 12.5,
          bookingsChange: 8,
          membersChange: 15,
          occupancyChange: 5,
        });
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const revenueData = [
    { day: 'L', value: 5200 },
    { day: 'M', value: 6800 },
    { day: 'M', value: 6200 },
    { day: 'G', value: 7500 },
    { day: 'V', value: 7000 },
    { day: 'S', value: 8500 },
    { day: 'D', value: 4000 },
  ];

  const recentActivities = [
    {
      id: '1',
      title: 'Nuovo Abbonamento',
      description: 'Marco Rossi - Abbonamento Annuale Premium',
      time: '30 minuti fa',
      status: 'completed' as const,
    },
    {
      id: '2',
      title: 'Manutenzione Campo 3',
      description: 'Riparazione rete e superficie - In corso',
      time: '2 ore fa',
      status: 'in-progress' as const,
    },
    {
      id: '3',
      title: 'Pagamento Ricevuto',
      description: '€850 - Lezioni di gruppo Gennaio',
      time: '4 ore fa',
      status: 'completed' as const,
    },
    {
      id: '4',
      title: 'Alert Manutenzione',
      description: 'Campo 2 - Controllo illuminazione richiesto',
      time: '1 giorno fa',
      status: 'pending' as const,
    },
  ];

  const quickActions = [
    {
      title: 'Gestisci Campi',
      description: 'Visualizza disponibilità e stato campi',
      icon: Activity,
      color: 'green' as const,
      href: '/dashboard/gestore/courts',
    },
    {
      title: 'Report Finanziari',
      description: 'Analizza entrate e uscite',
      icon: FileText,
      color: 'blue' as const,
      href: '/dashboard/gestore/reports',
    },
    {
      title: 'Gestisci Membri',
      description: 'Visualizza e gestisci iscrizioni',
      icon: Users,
      color: 'purple' as const,
      href: '/dashboard/gestore/members',
    },
    {
      title: 'Impostazioni',
      description: 'Configura tariffe e orari',
      icon: Settings,
      color: 'orange' as const,
      href: '/dashboard/gestore/settings',
    },
  ];

  const ongoingProjects = [
    {
      id: '1',
      title: 'Ristrutturazione Campo 1',
      description: 'Sostituzione superficie e illuminazione',
      progress: 65,
      status: 'In Progress' as const,
      dueDate: 'Gen 20, 2026',
      color: 'blue' as const,
    },
    {
      id: '2',
      title: 'Campagna Marketing Estate',
      description: 'Promozione corsi estivi e tornei',
      progress: 30,
      status: 'In Progress' as const,
      dueDate: 'Feb 1, 2026',
      color: 'green' as const,
    },
    {
      id: '3',
      title: 'Aggiornamento Sistema Prenotazioni',
      description: 'Implementazione nuove funzionalità',
      progress: 80,
      status: 'Pending' as const,
      dueDate: 'Gen 10, 2026',
      color: 'purple' as const,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Dashboard Gestore
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Monitora le performance e gestisci la tua struttura sportiva.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Entrate Mensili"
            value={stats.monthlyRevenue}
            change={stats.revenueChange}
            icon={DollarSign}
            trend="up"
            color="green"
            prefix="€"
          />
          <StatsCard
            title="Prenotazioni Mese"
            value={stats.totalBookings}
            change={stats.bookingsChange}
            icon={Calendar}
            trend="up"
            color="blue"
          />
          <StatsCard
            title="Membri Attivi"
            value={stats.activeMembers}
            change={stats.membersChange}
            icon={Users}
            trend="up"
            color="purple"
          />
          <StatsCard
            title="Occupazione Campi"
            value={stats.occupancyRate}
            change={stats.occupancyChange}
            icon={TrendingUp}
            trend="up"
            color="orange"
            suffix="%"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Revenue Chart */}
          <div className="lg:col-span-2">
            <ChartCard
              title="Entrate Settimanali"
              data={revenueData}
              color="green"
              valuePrefix="€"
            />
          </div>

          {/* Time Tracker */}
          <TimeTracker
            time="08:45:20"
            project="Gestione Struttura"
            isRunning={false}
          />
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <QuickActions actions={quickActions} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ongoing Projects */}
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Progetti in Corso
              </h2>
              <button className="px-4 py-2 text-sm font-medium text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors">
                + Nuovo
              </button>
            </div>
            <div className="space-y-4">
              {ongoingProjects.map((project) => (
                <ProjectCard key={project.id} {...project} />
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <RecentActivity activities={recentActivities} />
        </div>
      </div>
    </div>
  );
}
