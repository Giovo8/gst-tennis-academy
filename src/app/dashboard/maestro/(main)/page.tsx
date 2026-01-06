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
  Sparkles,
  Zap,
  Swords,
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

export default function CoachHomePage() {
  const [stats, setStats] = useState<Stats>({
    todayLessons: 0,
    weekLessons: 0,
    studentsCount: 0,
    videosShared: 0,
  });
  const [todayLessons, setTodayLessons] = useState<Lesson[]>([]);
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

    // Count shared videos
    const { count: videosCount } = await supabase
      .from("video_lessons")
      .select("*", { count: "exact", head: true })
      .eq("coach_id", user.id);

    setStats({
      todayLessons: todayCount || 0,
      weekLessons: weekCount || 0,
      studentsCount: 0,
      videosShared: videosCount || 0,
    });

    setTodayLessons(lessonsWithAthletes);
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
        <div className="h-24 bg-gray-200 rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-2xl border border-frozen-200 bg-frozen-50 p-6 sm:p-8">
        <div className="pointer-events-none absolute left-10 top-5 h-32 w-32 rounded-full blur-3xl bg-frozen-200/40 animate-pulse" />
        <div className="pointer-events-none absolute right-10 bottom-5 h-24 w-24 rounded-full blur-3xl bg-frozen-200/30 animate-pulse" style={{animationDelay: '1s'}} />
        
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-frozen-300 bg-frozen-100 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-frozen-700 mb-3">
            <Sparkles className="h-3.5 w-3.5" />
            Area Maestro
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            {getGreeting()}, Coach {userName}! 🎾
          </h1>
          <p className="text-gray-600">
            Gestisci le tue lezioni e i tuoi allievi
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 hover:border-frozen-300 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <div className="absolute inset-0 bg-frozen-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-frozen-100 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-frozen-600" />
              </div>
              <span className="text-xs text-gray-500">Oggi</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.todayLessons}</p>
            <p className="text-sm text-gray-600 mt-1">lezioni</p>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 hover:border-frozen-300 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <div className="absolute inset-0 bg-frozen-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-frozen-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-frozen-600" />
              </div>
              <span className="text-xs text-gray-500">Settimana</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.weekLessons}</p>
            <p className="text-sm text-gray-600 mt-1">lezioni programmate</p>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 hover:border-frozen-300 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <div className="absolute inset-0 bg-frozen-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-frozen-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-frozen-600" />
              </div>
              <span className="text-xs text-gray-500">Allievi</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.studentsCount}</p>
            <p className="text-sm text-gray-600 mt-1">totali</p>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 hover:border-frozen-300 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <div className="absolute inset-0 bg-frozen-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-frozen-100 flex items-center justify-center">
                <Video className="h-5 w-5 text-frozen-600" />
              </div>
              <span className="text-xs text-gray-500">Video</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.videosShared}</p>
            <p className="text-sm text-gray-600 mt-1">condivisi</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-4">
        <Link
          href="/dashboard/maestro/arena"
          className="group relative overflow-hidden flex items-center justify-between p-5 rounded-2xl border border-gray-200 bg-white hover:border-orange-300 hover:shadow-lg transition-all duration-300"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-orange-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center group-hover:shadow-lg group-hover:shadow-orange-200 transition-all">
              <Swords className="h-7 w-7 text-orange-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">Arena</h3>
              <p className="text-sm text-gray-600">Sfida altri giocatori e scala la classifica</p>
            </div>
          </div>
          <ArrowRight className="relative h-5 w-5 text-gray-400 group-hover:text-orange-600 group-hover:translate-x-1 transition-all" />
        </Link>

        <Link
          href="/dashboard/maestro/video-lab"
          className="group relative overflow-hidden flex items-center justify-between p-5 rounded-2xl border border-gray-200 bg-white hover:border-red-300 hover:shadow-lg transition-all duration-300"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-red-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-100 to-rose-100 flex items-center justify-center group-hover:shadow-lg group-hover:shadow-red-200 transition-all">
              <Video className="h-7 w-7 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">Video Lab</h3>
              <p className="text-sm text-gray-600">Carica e assegna video ai tuoi allievi</p>
            </div>
          </div>
          <ArrowRight className="relative h-5 w-5 text-gray-400 group-hover:text-red-600 group-hover:translate-x-1 transition-all" />
        </Link>

        <Link
          href="/dashboard/maestro/students"
          className="group relative overflow-hidden flex items-center justify-between p-5 rounded-2xl border border-gray-200 bg-white hover:border-purple-300 hover:shadow-lg transition-all duration-300"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center group-hover:shadow-lg group-hover:shadow-purple-200 transition-all">
              <Users className="h-7 w-7 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">I Miei Allievi</h3>
              <p className="text-sm text-gray-600">Gestisci i tuoi allievi e le note</p>
            </div>
          </div>
          <ArrowRight className="relative h-5 w-5 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
        </Link>
      </div>

      {/* Today's Schedule */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-frozen-100 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-frozen-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Lezioni di Oggi</h2>
              <p className="text-xs text-gray-600">Il tuo programma giornaliero</p>
            </div>
          </div>
          <Link
            href="/dashboard/maestro/agenda"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-frozen-600 bg-frozen-50 border border-frozen-200 hover:bg-frozen-100 transition-all"
          >
            Agenda
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        
        {todayLessons.length === 0 ? (
          <div className="p-8 text-center">
            <Calendar className="h-14 w-14 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nessuna lezione oggi</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {todayLessons.map((lesson) => (
              <div key={lesson.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gray-100 border border-gray-200 flex flex-col items-center justify-center">
                    <Clock className="h-5 w-5 text-cyan-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {lesson.athlete?.full_name || "Atleta"}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span>{lesson.court}</span>
                      <span className="text-gray-300">•</span>
                      <span>{formatTime(lesson.start_time)} - {formatTime(lesson.end_time)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {lesson.status === "confirmed" ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-frozen-100 text-frozen-700 border border-frozen-300">
                      <CheckCircle className="h-3.5 w-3.5" />
                      Confermata
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-frozen-100 text-frozen-700 border border-frozen-300">
                      <AlertCircle className="h-3.5 w-3.5" />
                      In attesa
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
