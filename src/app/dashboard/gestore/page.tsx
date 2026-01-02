'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { TimeTracker } from '@/components/dashboard/TimeTracker';
import QuickActions from '@/components/dashboard/QuickActions';
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
    // supabase già importato

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

  const quickActions = [
    {
      label: 'Gestisci Campi',
      description: 'Visualizza disponibilità e stato campi',
      icon: <Activity className="h-6 w-6" />,
      color: 'green' as const,
      href: '/dashboard/gestore/courts',
    },
    {
      label: 'Report Finanziari',
      description: 'Analizza entrate e uscite',
      icon: <FileText className="h-6 w-6" />,
      color: 'blue' as const,
      href: '/dashboard/gestore/reports',
    },
    {
      label: 'Gestisci Membri',
      description: 'Visualizza e gestisci iscrizioni',
      icon: <Users className="h-6 w-6" />,
      color: 'purple' as const,
      href: '/dashboard/gestore/members',
    },
    {
      label: 'Impostazioni',
      description: 'Configura tariffe e orari',
      icon: <Settings className="h-6 w-6" />,
      color: 'orange' as const,
      href: '/dashboard/gestore/settings',
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
            icon={DollarSign}
            color="green"
          />
          <StatsCard
            title="Prenotazioni Mese"
            value={stats.totalBookings}
            icon={Calendar}
            color="blue"
          />
          <StatsCard
            title="Membri Attivi"
            value={stats.activeMembers}
            icon={Users}
            color="purple"
          />
          <StatsCard
            title="Occupazione Campi"
            value={stats.occupancyRate}
            icon={TrendingUp}
            color="orange"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Revenue Chart */}
          <div className="lg:col-span-2">
            <ChartCard
              title="Entrate Settimanali"
              data={revenueData}
            />
          </div>

          {/* Time Tracker */}
          <TimeTracker />
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <QuickActions actions={quickActions} />
        </div>
      </div>
    </div>
  );
}
