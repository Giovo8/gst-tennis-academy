'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { TimeTracker } from '@/components/dashboard/TimeTracker';
import QuickActions from '@/components/dashboard/QuickActions';
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
    // supabase già importato

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

  const quickActions = [
    {
      label: 'Nuovo Corso',
      description: 'Crea un nuovo corso di tennis',
      icon: <BookOpen className="h-6 w-6" />,
      color: 'green' as const,
      href: '/courses/new',
    },
    {
      label: 'Programma Lezioni',
      description: 'Organizza il calendario lezioni',
      icon: <Calendar className="h-6 w-6" />,
      color: 'blue' as const,
      href: '/dashboard/maestro/schedule',
    },
    {
      label: 'Valuta Studenti',
      description: 'Registra progressi e feedback',
      icon: <ClipboardCheck className="h-6 w-6" />,
      color: 'purple' as const,
      href: '/dashboard/maestro/evaluations',
    },
    {
      label: 'Messaggi',
      description: 'Comunica con studenti e genitori',
      icon: <MessageSquare className="h-6 w-6" />,
      color: 'orange' as const,
      href: '/chat',
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
            icon={Users}
            color="green"
          />
          <StatsCard
            title="Corsi Attivi"
            value={stats.activeCourses}
            icon={BookOpen}
            color="blue"
          />
          <StatsCard
            title="Lezioni Settimana"
            value={stats.lessonsThisWeek}
            icon={Calendar}
            color="purple"
          />
          <StatsCard
            title="Valutazione Media"
            value={stats.averageRating}
            icon={Star}
            color="orange"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Chart Card */}
          <div className="lg:col-span-2">
            <ChartCard
              title="Lezioni Settimanali"
              data={chartData}

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
