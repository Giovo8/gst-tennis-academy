"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import {
  Calendar,
  Users,
  Video,
  Clock,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  TrendingUp,
} from "lucide-react";

interface Stats {
  todayLessons: number;
  weekLessons: number;
  studentsCount: number;
  videosShared: number;
}

interface Lesson {
  id: string;
  court: string;
  type: string;
  start_time: string;
  end_time: string;
  status: string;
  athlete?: {
    full_name: string;
  };
}

interface Student {
  id: string;
  full_name: string;
  email: string;
  lastLesson?: string;
}

export default function CoachHomePage() {
  const [stats, setStats] = useState<Stats>({
    todayLessons: 0,
    weekLessons: 0,
    studentsCount: 0,
    videosShared: 0,
  });
  const [todayLessons, setTodayLessons] = useState<Lesson[]>([]);
  const [recentStudents, setRecentStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Load profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    if (profile) setUserName(profile.full_name || "");

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
    const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7).toISOString();

    // Load today's lessons
    const { data: todayData, count: todayCount } = await supabase
      .from("bookings")
      .select("id, court, type, start_time, end_time, status, user_id", { count: "exact" })
      .eq("coach_id", user.id)
      .neq("status", "cancelled")
      .gte("start_time", todayStart)
      .lt("start_time", todayEnd)
      .order("start_time", { ascending: true });

    // Load week lessons count
    const { count: weekCount } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("coach_id", user.id)
      .neq("status", "cancelled")
      .gte("start_time", todayStart)
      .lt("start_time", weekEnd);

    // Load athlete names for today's lessons
    let lessonsWithAthletes: Lesson[] = [];
    if (todayData && todayData.length > 0) {
      const athleteIds = todayData.map(l => l.user_id);
      const { data: athletes } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", athleteIds);

      const athleteMap = new Map(athletes?.map(a => [a.id, a.full_name]) || []);
      
      lessonsWithAthletes = todayData.map(lesson => ({
        ...lesson,
        athlete: { full_name: athleteMap.get(lesson.user_id) || "Atleta" }
      }));
    }

    // Get unique students who have had lessons with this coach
    const { data: allBookings } = await supabase
      .from("bookings")
      .select("user_id")
      .eq("coach_id", user.id)
      .neq("status", "cancelled");

    const uniqueStudentIds = [...new Set(allBookings?.map(b => b.user_id) || [])];
    
    let students: Student[] = [];
    if (uniqueStudentIds.length > 0) {
      const { data: studentProfiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", uniqueStudentIds)
        .limit(5);
      
      students = studentProfiles || [];
    }

    // Count shared videos
    const { count: videosCount } = await supabase
      .from("video_lessons")
      .select("*", { count: "exact", head: true })
      .eq("created_by", user.id);

    setStats({
      todayLessons: todayCount || 0,
      weekLessons: weekCount || 0,
      studentsCount: uniqueStudentIds.length,
      videosShared: videosCount || 0,
    });

    setTodayLessons(lessonsWithAthletes);
    setRecentStudents(students);
    setLoading(false);
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buongiorno";
    if (hour < 18) return "Buon pomeriggio";
    return "Buonasera";
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 skeleton rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 skeleton rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-cyan-600 to-teal-500 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-1">
          {getGreeting()}, Coach {userName}! 🎾
        </h1>
        <p className="text-white/80">
          Gestisci le tue lezioni e i tuoi allievi
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[var(--surface)] rounded-xl p-5 border border-[var(--border)]">
          <div className="flex items-center justify-between mb-3">
            <Calendar className="h-5 w-5 text-[var(--primary)]" />
            <span className="text-xs text-[var(--foreground-subtle)]">Oggi</span>
          </div>
          <p className="text-3xl font-bold text-[var(--foreground)]">{stats.todayLessons}</p>
          <p className="text-sm text-[var(--foreground-subtle)] mt-1">lezioni</p>
        </div>

        <div className="bg-[var(--surface)] rounded-xl p-5 border border-[var(--border)]">
          <div className="flex items-center justify-between mb-3">
            <TrendingUp className="h-5 w-5 text-green-500" />
            <span className="text-xs text-[var(--foreground-subtle)]">Settimana</span>
          </div>
          <p className="text-3xl font-bold text-[var(--foreground)]">{stats.weekLessons}</p>
          <p className="text-sm text-[var(--foreground-subtle)] mt-1">lezioni programmate</p>
        </div>

        <div className="bg-[var(--surface)] rounded-xl p-5 border border-[var(--border)]">
          <div className="flex items-center justify-between mb-3">
            <Users className="h-5 w-5 text-purple-500" />
            <span className="text-xs text-[var(--foreground-subtle)]">Allievi</span>
          </div>
          <p className="text-3xl font-bold text-[var(--foreground)]">{stats.studentsCount}</p>
          <p className="text-sm text-[var(--foreground-subtle)] mt-1">totali</p>
        </div>

        <div className="bg-[var(--surface)] rounded-xl p-5 border border-[var(--border)]">
          <div className="flex items-center justify-between mb-3">
            <Video className="h-5 w-5 text-red-500" />
            <span className="text-xs text-[var(--foreground-subtle)]">Video</span>
          </div>
          <p className="text-3xl font-bold text-[var(--foreground)]">{stats.videosShared}</p>
          <p className="text-sm text-[var(--foreground-subtle)] mt-1">condivisi</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-4">
        <Link
          href="/dashboard/maestro/video-lab"
          className="flex items-center justify-between p-5 bg-[var(--surface)] rounded-xl border border-[var(--border)] hover:border-[var(--primary)] hover:shadow-lg transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
              <Video className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <h3 className="font-semibold text-[var(--foreground)]">Video Lab</h3>
              <p className="text-sm text-[var(--foreground-muted)]">
                Carica e assegna video ai tuoi allievi
              </p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-[var(--foreground-subtle)] group-hover:text-red-500 transition-colors" />
        </Link>

        <Link
          href="/dashboard/maestro/students"
          className="flex items-center justify-between p-5 bg-[var(--surface)] rounded-xl border border-[var(--border)] hover:border-[var(--primary)] hover:shadow-lg transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <h3 className="font-semibold text-[var(--foreground)]">I Miei Allievi</h3>
              <p className="text-sm text-[var(--foreground-muted)]">
                Gestisci i tuoi allievi e le note
              </p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-[var(--foreground-subtle)] group-hover:text-purple-500 transition-colors" />
        </Link>
      </div>

      {/* Today's Schedule */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)]">
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
          <h2 className="font-semibold text-[var(--foreground)]">Lezioni di Oggi</h2>
          <Link
            href="/dashboard/maestro/agenda"
            className="text-sm text-[var(--primary)] hover:underline"
          >
            Vedi agenda
          </Link>
        </div>
        
        {todayLessons.length === 0 ? (
          <div className="p-8 text-center">
            <Calendar className="h-12 w-12 text-[var(--foreground-subtle)] mx-auto mb-3" />
            <p className="text-[var(--foreground-muted)]">Nessuna lezione oggi</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {todayLessons.map((lesson) => (
              <div key={lesson.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-[var(--background-subtle)] flex flex-col items-center justify-center">
                    <Clock className="h-5 w-5 text-[var(--primary)]" />
                  </div>
                  <div>
                    <p className="font-medium text-[var(--foreground)]">
                      {lesson.athlete?.full_name || "Atleta"}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-[var(--foreground-muted)]">
                      <span>{lesson.court}</span>
                      <span>•</span>
                      <span>{formatTime(lesson.start_time)} - {formatTime(lesson.end_time)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {lesson.status === "confirmed" ? (
                    <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                      <CheckCircle className="h-4 w-4" />
                      Confermata
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-sm text-yellow-600 dark:text-yellow-400">
                      <AlertCircle className="h-4 w-4" />
                      In attesa
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Students */}
      {recentStudents.length > 0 && (
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)]">
          <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
            <h2 className="font-semibold text-[var(--foreground)]">I Tuoi Allievi</h2>
            <Link
              href="/dashboard/maestro/students"
              className="text-sm text-[var(--primary)] hover:underline"
            >
              Vedi tutti
            </Link>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {recentStudents.map((student) => (
              <Link
                key={student.id}
                href={`/dashboard/maestro/students/${student.id}`}
                className="p-4 flex items-center justify-between hover:bg-[var(--surface-hover)] transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-white font-semibold">
                    {student.full_name?.charAt(0)?.toUpperCase() || "A"}
                  </div>
                  <div>
                    <p className="font-medium text-[var(--foreground)]">{student.full_name}</p>
                    <p className="text-sm text-[var(--foreground-muted)]">{student.email}</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-[var(--foreground-subtle)]" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
