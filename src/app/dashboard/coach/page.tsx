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
  Users, 
  Calendar, 
  TrendingUp, 
  Award,
  Clock,
  BookOpen,
  MessageSquare,
  Settings
} from 'lucide-react';

interface DashboardStats {
  totalStudents: number;
  activeLessons: number;
  upcomingLessons: number;
  completionRate: number;
  studentsChange: number;
  lessonsChange: number;
  upcomingChange: number;
  completionChange: number;
}

export default function CoachDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    activeLessons: 0,
    upcomingLessons: 0,
    completionRate: 0,
    studentsChange: 0,
    lessonsChange: 0,
    upcomingChange: 0,
    completionChange: 0,
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
        const [studentsResult, lessonsResult, upcomingResult] = await Promise.all([
          supabase
            .from('course_enrollments')
            .select('id', { count: 'exact' })
            .eq('instructor_id', currentUser.id),
          supabase
            .from('bookings')
            .select('id', { count: 'exact' })
            .eq('user_id', currentUser.id)
            .eq('status', 'confirmed')
            .gte('date', new Date().toISOString()),
          supabase
            .from('bookings')
            .select('id', { count: 'exact' })
            .eq('user_id', currentUser.id)
            .gte('date', new Date().toISOString())
        ]);

        setStats({
          totalStudents: studentsResult.count || 0,
          activeLessons: lessonsResult.count || 0,
          upcomingLessons: upcomingResult.count || 0,
          completionRate: 87,
          studentsChange: 12,
          lessonsChange: 8,
          upcomingChange: 15,
          completionChange: 5,
        });
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const chartData = [
    { day: 'L', value: 8 },
    { day: 'M', value: 12 },
    { day: 'M', value: 10 },
    { day: 'G', value: 15 },
    { day: 'V', value: 9 },
    { day: 'S', value: 14 },
    { day: 'D', value: 6 },
  ];

  const recentActivities = [
    {
      id: '1',
      title: 'Lezione con Marco Rossi',
      description: 'Dritto e rovescio - Completata',
      time: '2 ore fa',
      status: 'completed' as const,
    },
    {
      id: '2',
      title: 'Nuovo studente iscritto',
      description: 'Laura Bianchi - Corso principianti',
      time: '4 ore fa',
      status: 'in-progress' as const,
    },
    {
      id: '3',
      title: 'Feedback ricevuto',
      description: 'Valutazione 5 stelle da Paolo Verdi',
      time: '1 giorno fa',
      status: 'completed' as const,
    },
  ];

  const quickActions = [
    {
      title: 'Nuova Lezione',
      description: 'Programma una nuova lezione',
      icon: Calendar,
      color: 'blue' as const,
      href: '/dashboard/coach/lessons/new',
    },
    {
      title: 'Gestisci Studenti',
      description: 'Visualizza e gestisci i tuoi studenti',
      icon: Users,
      color: 'green' as const,
      href: '/dashboard/coach/students',
    },
    {
      title: 'Report Prestazioni',
      description: 'Visualizza report dettagliati',
      icon: TrendingUp,
      color: 'purple' as const,
      href: '/dashboard/coach/reports',
    },
    {
      title: 'Messaggi',
      description: 'Comunica con gli studenti',
      icon: MessageSquare,
      color: 'orange' as const,
      href: '/chat',
    },
  ];

  const upcomingProjects = [
    {
      id: '1',
      title: 'Corso Avanzato Servizio',
      description: 'Miglioramento tecnica servizio',
      progress: 65,
      status: 'In Progress' as const,
      dueDate: 'Dec 15, 2024',
      color: 'blue' as const,
    },
    {
      id: '2',
      title: 'Preparazione Torneo',
      description: 'Allenamento intensivo pre-torneo',
      progress: 40,
      status: 'In Progress' as const,
      dueDate: 'Dec 20, 2024',
      color: 'green' as const,
    },
    {
      id: '3',
      title: 'Valutazioni Mensili',
      description: 'Valutazione progressi studenti',
      progress: 85,
      status: 'Pending' as const,
      dueDate: 'Dec 10, 2024',
      color: 'orange' as const,
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
            Dashboard Coach
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gestisci le tue lezioni e monitora i progressi degli studenti.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Studenti Totali"
            value={stats.totalStudents}
            change={stats.studentsChange}
            icon={Users}
            trend="up"
            color="green"
          />
          <StatsCard
            title="Lezioni Attive"
            value={stats.activeLessons}
            change={stats.lessonsChange}
            icon={BookOpen}
            trend="up"
            color="blue"
          />
          <StatsCard
            title="Prossime Lezioni"
            value={stats.upcomingLessons}
            change={stats.upcomingChange}
            icon={Calendar}
            trend="up"
            color="purple"
          />
          <StatsCard
            title="Tasso Completamento"
            value={stats.completionRate}
            change={stats.completionChange}
            icon={Award}
            trend="up"
            color="orange"
            suffix="%"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Chart Card */}
          <div className="lg:col-span-2">
            <ChartCard
              title="Attività Settimanale"
              data={chartData}
              color="green"
            />
          </div>

          {/* Time Tracker */}
          <TimeTracker
            time="04:32:15"
            project="Lezione con Marco Rossi"
            isRunning={true}
          />
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <QuickActions actions={quickActions} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Projects/Courses */}
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Corsi in Corso
              </h2>
              <button className="px-4 py-2 text-sm font-medium text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors">
                + Nuovo
              </button>
            </div>
            <div className="space-y-4">
              {upcomingProjects.map((project) => (
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
