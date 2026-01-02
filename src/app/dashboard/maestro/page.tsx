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
  Trophy, 
  Star,
  BookOpen,
  MessageSquare,
  ClipboardCheck,
  TrendingUp
} from 'lucide-react';

interface DashboardStats {
  totalStudents: number;
  activeCourses: number;
  lessonsThisWeek: number;
  averageRating: number;
  studentsChange: number;
  coursesChange: number;
  lessonsChange: number;
  ratingChange: number;
}

export default function MaestroDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    activeCourses: 0,
    lessonsThisWeek: 0,
    averageRating: 0,
    studentsChange: 0,
    coursesChange: 0,
    lessonsChange: 0,
    ratingChange: 0,
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
        const [studentsResult, coursesResult, lessonsResult] = await Promise.all([
          supabase
            .from('course_enrollments')
            .select('id', { count: 'exact' })
            .eq('instructor_id', currentUser.id),
          supabase
            .from('courses')
            .select('id', { count: 'exact' })
            .eq('instructor_id', currentUser.id)
            .eq('is_active', true),
          supabase
            .from('bookings')
            .select('id', { count: 'exact' })
            .eq('user_id', currentUser.id)
            .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        ]);

        setStats({
          totalStudents: studentsResult.count || 0,
          activeCourses: coursesResult.count || 0,
          lessonsThisWeek: lessonsResult.count || 0,
          averageRating: 4.8,
          studentsChange: 8,
          coursesChange: 2,
          lessonsChange: 12,
          ratingChange: 3,
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
    { day: 'L', value: 10 },
    { day: 'M', value: 15 },
    { day: 'M', value: 12 },
    { day: 'G', value: 18 },
    { day: 'V', value: 14 },
    { day: 'S', value: 20 },
    { day: 'D', value: 8 },
  ];

  const recentActivities = [
    {
      id: '1',
      title: 'Corso Principianti Completato',
      description: 'Gruppo A - 8 studenti diplomati',
      time: '1 ora fa',
      status: 'completed' as const,
    },
    {
      id: '2',
      title: 'Nuova Valutazione',
      description: '5 stelle da Alessandro Neri',
      time: '3 ore fa',
      status: 'completed' as const,
    },
    {
      id: '3',
      title: 'Lezione di Gruppo',
      description: 'Tecnica avanzata - In corso',
      time: '5 ore fa',
      status: 'in-progress' as const,
    },
  ];

  const quickActions = [
    {
      title: 'Nuovo Corso',
      description: 'Crea un nuovo corso di tennis',
      icon: BookOpen,
      color: 'green' as const,
      href: '/courses/new',
    },
    {
      title: 'Programma Lezioni',
      description: 'Organizza il calendario lezioni',
      icon: Calendar,
      color: 'blue' as const,
      href: '/dashboard/maestro/schedule',
    },
    {
      title: 'Valuta Studenti',
      description: 'Registra progressi e feedback',
      icon: ClipboardCheck,
      color: 'purple' as const,
      href: '/dashboard/maestro/evaluations',
    },
    {
      title: 'Messaggi',
      description: 'Comunica con studenti e genitori',
      icon: MessageSquare,
      color: 'orange' as const,
      href: '/chat',
    },
  ];

  const activeCourses = [
    {
      id: '1',
      title: 'Corso Intermedio Estate',
      description: '12 studenti iscritti',
      progress: 70,
      status: 'In Progress' as const,
      dueDate: 'Gen 15, 2026',
      color: 'green' as const,
    },
    {
      id: '2',
      title: 'Preparazione Agonistica',
      description: '6 atleti professionisti',
      progress: 45,
      status: 'In Progress' as const,
      dueDate: 'Gen 30, 2026',
      color: 'blue' as const,
    },
    {
      id: '3',
      title: 'Corso Bambini 6-10 anni',
      description: '15 bambini iscritti',
      progress: 55,
      status: 'In Progress' as const,
      dueDate: 'Feb 10, 2026',
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
            Dashboard Maestro
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gestisci i tuoi corsi e monitora i progressi degli studenti.
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
            title="Corsi Attivi"
            value={stats.activeCourses}
            change={stats.coursesChange}
            icon={BookOpen}
            trend="up"
            color="blue"
          />
          <StatsCard
            title="Lezioni Settimana"
            value={stats.lessonsThisWeek}
            change={stats.lessonsChange}
            icon={Calendar}
            trend="up"
            color="purple"
          />
          <StatsCard
            title="Valutazione Media"
            value={stats.averageRating}
            change={stats.ratingChange}
            icon={Star}
            trend="up"
            color="orange"
            suffix="/5"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Chart Card */}
          <div className="lg:col-span-2">
            <ChartCard
              title="Lezioni Settimanali"
              data={chartData}
              color="green"
            />
          </div>

          {/* Time Tracker */}
          <TimeTracker
            time="06:15:32"
            project="Corso Intermedio Estate"
            isRunning={true}
          />
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <QuickActions actions={quickActions} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Courses */}
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Corsi Attivi
              </h2>
              <button className="px-4 py-2 text-sm font-medium text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors">
                + Nuovo
              </button>
            </div>
            <div className="space-y-4">
              {activeCourses.map((course) => (
                <ProjectCard key={course.id} {...course} />
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
