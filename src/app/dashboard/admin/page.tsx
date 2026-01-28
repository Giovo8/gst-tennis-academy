"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import {
  Users,
  Calendar,
  Trophy,
  Video,
  Clock,
  Plus,
  Bell,
  Megaphone,
  Swords,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  XCircle,
  X,
  ExternalLink,
  FileText,
  Info,
  Newspaper,
  Cloud,
  Sun,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Wind,
  Droplets,
  Thermometer,
} from "lucide-react";
import BookingsTimeline from "@/components/admin/BookingsTimeline";

interface Stats {
  totalUsers: number;
  todayBookings: number;
  activeTournaments: number;
  videoLessonsCount: number;
  pendingBookings: number;
  unreadMessages: number;
  pendingArena: number;
  pendingJobApplications: number;
}

interface TodayBooking {
  id: string;
  court: string;
  start_time: string;
  end_time: string;
  type: string;
  status: string;
  manager_confirmed: boolean;
  user_profile?: { full_name: string } | null;
}

interface TimelineBooking {
  id: string;
  court: string;
  user_id: string;
  coach_id: string | null;
  start_time: string;
  end_time: string;
  status: string;
  type: string;
  manager_confirmed: boolean;
  coach_confirmed: boolean;
  notes: string | null;
  user_profile?: { full_name: string; email: string; phone?: string } | null;
  coach_profile?: { full_name: string; email: string; phone?: string } | null;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  announcement_type: string;
  priority: string;
  created_at: string;
  is_pinned: boolean;
  profiles?: {
    full_name: string;
  };
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
}

interface WeatherData {
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  isDay: boolean;
}

const bookingTypeLabels: Record<string, string> = {
  campo: "Campo",
  lezione_privata: "Lezione Privata",
  lezione_gruppo: "Lezione Gruppo",
  arena: "Match Arena",
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    todayBookings: 0,
    activeTournaments: 0,
    videoLessonsCount: 0,
    pendingBookings: 0,
    unreadMessages: 0,
    pendingArena: 0,
    pendingJobApplications: 0,
  });
  const [loading, setLoading] = useState(true);
  const [todayBookings, setTodayBookings] = useState<TodayBooking[]>([]);
  const [timelineBookings, setTimelineBookings] = useState<TimelineBooking[]>([]);
  const [recentAnnouncements, setRecentAnnouncements] = useState<Announcement[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [userName, setUserName] = useState("");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    loadWeatherData();
  }, []);

  async function loadWeatherData() {
    try {
      const response = await fetch(
        "https://api.open-meteo.com/v1/forecast?latitude=42.07631852280004&longitude=12.373061355799356&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day&timezone=Europe%2FRome"
      );
      const data = await response.json();

      if (data.current) {
        setWeather({
          temperature: Math.round(data.current.temperature_2m),
          apparentTemperature: Math.round(data.current.apparent_temperature),
          humidity: data.current.relative_humidity_2m,
          windSpeed: Math.round(data.current.wind_speed_10m),
          weatherCode: data.current.weather_code,
          isDay: data.current.is_day === 1,
        });
      }
    } catch (error) {
      console.error("Error loading weather data:", error);
    }
    setWeatherLoading(false);
  }

  function getWeatherInfo(code: number) {
    const weatherMap: Record<number, { label: string; icon: React.ReactNode }> = {
      0: { label: "Sereno", icon: <Sun className="h-8 w-8" /> },
      1: { label: "Prevalentemente sereno", icon: <Sun className="h-8 w-8" /> },
      2: { label: "Parzialmente nuvoloso", icon: <Cloud className="h-8 w-8" /> },
      3: { label: "Nuvoloso", icon: <Cloud className="h-8 w-8" /> },
      45: { label: "Nebbia", icon: <Cloud className="h-8 w-8" /> },
      48: { label: "Nebbia con brina", icon: <Cloud className="h-8 w-8" /> },
      51: { label: "Pioggerella leggera", icon: <CloudRain className="h-8 w-8" /> },
      53: { label: "Pioggerella", icon: <CloudRain className="h-8 w-8" /> },
      55: { label: "Pioggerella intensa", icon: <CloudRain className="h-8 w-8" /> },
      61: { label: "Pioggia leggera", icon: <CloudRain className="h-8 w-8" /> },
      63: { label: "Pioggia", icon: <CloudRain className="h-8 w-8" /> },
      65: { label: "Pioggia intensa", icon: <CloudRain className="h-8 w-8" /> },
      71: { label: "Neve leggera", icon: <CloudSnow className="h-8 w-8" /> },
      73: { label: "Neve", icon: <CloudSnow className="h-8 w-8" /> },
      75: { label: "Neve intensa", icon: <CloudSnow className="h-8 w-8" /> },
      80: { label: "Rovesci leggeri", icon: <CloudRain className="h-8 w-8" /> },
      81: { label: "Rovesci", icon: <CloudRain className="h-8 w-8" /> },
      82: { label: "Rovesci violenti", icon: <CloudRain className="h-8 w-8" /> },
      95: { label: "Temporale", icon: <CloudLightning className="h-8 w-8" /> },
      96: { label: "Temporale con grandine", icon: <CloudLightning className="h-8 w-8" /> },
      99: { label: "Temporale con grandine", icon: <CloudLightning className="h-8 w-8" /> },
    };
    return weatherMap[code] || { label: "Sconosciuto", icon: <Cloud className="h-8 w-8" /> };
  }

  async function loadDashboardData() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Load profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    if (profile) setUserName(profile.full_name || "Admin");

    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Parallel queries for counts
      const [
        usersResult,
        todayBookingsCount,
        pendingBookingsCount,
        activeTournamentsCount,
        unreadMessagesCount,
        videoLessonsResult,
        pendingArenaResult,
        jobApplicationsResult,
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("bookings").select("*", { count: "exact", head: true }).gte("start_time", `${todayStr}T00:00:00`).lte("start_time", `${todayStr}T23:59:59`),
        supabase.from("bookings").select("*", { count: "exact", head: true }).eq("manager_confirmed", false).neq("status", "cancelled"),
        supabase.from("tournaments").select("*", { count: "exact", head: true }).in("status", ["active", "Aperto", "In Corso"]),
        supabase.from("messages").select("*", { count: "exact", head: true }).eq("read", false),
        supabase.from("video_lessons").select("*", { count: "exact", head: true }),
        supabase.from("arena_challenges").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("recruitment_applications").select("*", { count: "exact", head: true }).eq("status", "pending"),
      ]);

      // Get today's bookings with details
      const { data: todayBookingsData } = await supabase
        .from("bookings")
        .select("id, court, start_time, end_time, type, status, manager_confirmed, user_id")
        .gte("start_time", `${todayStr}T00:00:00`)
        .lte("start_time", `${todayStr}T23:59:59`)
        .order("start_time", { ascending: true })
        .limit(5);

      if (todayBookingsData && todayBookingsData.length > 0) {
        const userIds = [...new Set(todayBookingsData.map((b) => b.user_id).filter(Boolean))];
        const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
        const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

        const enrichedBookings = todayBookingsData.map((booking) => ({
          ...booking,
          user_profile: profileMap.get(booking.user_id) || null,
        }));

        setTodayBookings(enrichedBookings);
      }

      // Get all bookings for timeline (from today onwards)
      const { data: allBookingsData } = await supabase
        .from("bookings")
        .select("*")
        .gte("start_time", `${todayStr}T00:00:00`)
        .order("start_time", { ascending: false })
        .limit(200);

      if (allBookingsData && allBookingsData.length > 0) {
        const allUserIds = [...new Set([
          ...allBookingsData.map((b) => b.user_id),
          ...allBookingsData.map((b) => b.coach_id).filter(Boolean)
        ])];

        const { data: allProfiles } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone")
          .in("id", allUserIds);

        const allProfilesMap = new Map(allProfiles?.map((p) => [p.id, p]) || []);

        const enrichedTimelineBookings = allBookingsData.map((booking) => ({
          ...booking,
          user_profile: allProfilesMap.get(booking.user_id) || null,
          coach_profile: booking.coach_id ? allProfilesMap.get(booking.coach_id) || null : null,
        }));

        setTimelineBookings(enrichedTimelineBookings);
      }

      setStats({
        totalUsers: usersResult.count || 0,
        todayBookings: todayBookingsCount.count || 0,
        activeTournaments: activeTournamentsCount.count || 0,
        videoLessonsCount: videoLessonsResult.count || 0,
        pendingBookings: pendingBookingsCount.count || 0,
        unreadMessages: unreadMessagesCount.count || 0,
        pendingArena: pendingArenaResult.count || 0,
        pendingJobApplications: jobApplicationsResult.count || 0,
      });

      // Load recent announcements
      const { data: announcementsData } = await supabase
        .from("announcements")
        .select("id, title, content, announcement_type, priority, created_at, is_pinned, profiles(full_name)")
        .order("created_at", { ascending: false })
        .limit(3);

      if (announcementsData) {
        setRecentAnnouncements(announcementsData as any);
      }

      // Load notifications
      const { data: notifs } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(6);

      if (notifs) {
        setNotifications(notifs);
        setUnreadNotifications(notifs.filter((n: any) => !n.is_read).length);
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }

    setLoading(false);
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  };

  function handleAnnouncementClick(announcement: Announcement) {
    setSelectedAnnouncement(announcement);
  }

  async function handleNotificationClick(notification: Notification) {
    setSelectedNotification(notification);

    if (!notification.is_read) {
      try {
        const { error } = await supabase
          .from("notifications")
          .update({ is_read: true })
          .eq("id", notification.id);
        if (!error) {
          setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n)));
          setUnreadNotifications((prev) => Math.max(0, prev - 1));
        }
      } catch (e) {
        console.error("Error marking notification read", e);
      }
    }
  }

  async function markAllNotificationsRead() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      if (!error) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadNotifications(0);
      }
    } catch (e) {
      console.error("Error marking all notifications read", e);
    }
  }

  // Count alerts
  const alertsCount = stats.pendingBookings + stats.unreadMessages + stats.pendingArena + stats.pendingJobApplications;

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-24 bg-gray-200 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Modern Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold text-secondary mb-2">Bentornato, {userName}</h1>
          <p className="text-secondary/70 font-medium">Pannello di controllo amministratore</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link href="/dashboard/admin/users" className="bg-secondary rounded-lg p-5 sm:p-4 hover:shadow-md transition-all group flex flex-row items-center gap-4">
          <div className="flex-shrink-0">
            <Users className="h-10 w-10 sm:h-8 sm:w-8 text-white" />
          </div>
          <div className="flex-1 hidden sm:block">
            <p className="text-sm text-white/70">Utenti Totali</p>
            <h3 className="text-2xl font-bold text-white">{stats.totalUsers}</h3>
          </div>
          <div className="flex sm:hidden items-center gap-3 flex-1">
            <h3 className="text-3xl font-bold text-white">{stats.totalUsers}</h3>
            <p className="text-base text-white/70">Utenti Totali</p>
          </div>
        </Link>

        <Link href="/dashboard/admin/bookings" className="bg-secondary rounded-lg p-5 sm:p-4 hover:shadow-md transition-all group flex flex-row items-center gap-4">
          <div className="flex-shrink-0">
            <Calendar className="h-10 w-10 sm:h-8 sm:w-8 text-white" />
          </div>
          <div className="flex-1 hidden sm:block">
            <p className="text-sm text-white/70">Prenotazioni Oggi</p>
            <h3 className="text-2xl font-bold text-white">{stats.todayBookings}</h3>
          </div>
          <div className="flex sm:hidden items-center gap-3 flex-1">
            <h3 className="text-3xl font-bold text-white">{stats.todayBookings}</h3>
            <p className="text-base text-white/70">Prenotazioni Oggi</p>
          </div>
        </Link>

        <Link href="/dashboard/admin/tornei" className="bg-secondary rounded-lg p-5 sm:p-4 hover:shadow-md transition-all group flex flex-row items-center gap-4">
          <div className="flex-shrink-0">
            <Trophy className="h-10 w-10 sm:h-8 sm:w-8 text-white" />
          </div>
          <div className="flex-1 hidden sm:block">
            <p className="text-sm text-white/70">Tornei Attivi</p>
            <h3 className="text-2xl font-bold text-white">{stats.activeTournaments}</h3>
          </div>
          <div className="flex sm:hidden items-center gap-3 flex-1">
            <h3 className="text-3xl font-bold text-white">{stats.activeTournaments}</h3>
            <p className="text-base text-white/70">Tornei Attivi</p>
          </div>
        </Link>

        <Link href="/dashboard/admin/video-lessons" className="bg-secondary rounded-lg p-5 sm:p-4 hover:shadow-md transition-all group flex flex-row items-center gap-4">
          <div className="flex-shrink-0">
            <Video className="h-10 w-10 sm:h-8 sm:w-8 text-white" />
          </div>
          <div className="flex-1 hidden sm:block">
            <p className="text-sm text-white/70">Video Lezioni</p>
            <h3 className="text-2xl font-bold text-white">{stats.videoLessonsCount}</h3>
          </div>
          <div className="flex sm:hidden items-center gap-3 flex-1">
            <h3 className="text-3xl font-bold text-white">{stats.videoLessonsCount}</h3>
            <p className="text-base text-white/70">Video Lezioni</p>
          </div>
        </Link>
      </div>

      {/* Meteo */}
      <div className="bg-secondary rounded-xl p-5 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="font-bold text-lg">Tennis Club GST</h3>
            <p className="text-sm text-white/80">Formello, RM</p>
          </div>

          {weatherLoading ? (
            <div className="flex items-center gap-6 animate-pulse">
              <div className="h-12 w-24 bg-white/20 rounded" />
              <div className="h-8 w-8 bg-white/20 rounded-full" />
            </div>
          ) : weather ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
              {/* Mobile Layout */}
              <div className="sm:hidden flex items-center gap-2">
                <div className="text-white">
                  {getWeatherInfo(weather.weatherCode).icon}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{weather.temperature}°C</div>
                  <p className="text-xs text-white/90">{getWeatherInfo(weather.weatherCode).label}</p>
                </div>
              </div>

              {/* Desktop Layout */}
              <div className="hidden sm:flex items-center gap-4">
                <div className="text-left">
                  <div className="text-4xl font-bold">{weather.temperature}°C</div>
                  <p className="text-sm text-white/90">{getWeatherInfo(weather.weatherCode).label}</p>
                </div>
                <div className="text-white">
                  {getWeatherInfo(weather.weatherCode).icon}
                </div>
              </div>

              {/* Info aggiuntive */}
              <div className="hidden sm:flex items-center gap-4 pl-6 border-l border-white/20">
                <div className="text-center">
                  <Thermometer className="h-5 w-5 mx-auto mb-1 text-white/80" />
                  <p className="text-xs text-white/70">Percepita</p>
                  <p className="text-sm font-semibold">{weather.apparentTemperature}°C</p>
                </div>
                <div className="text-center">
                  <Droplets className="h-5 w-5 mx-auto mb-1 text-white/80" />
                  <p className="text-xs text-white/70">Umidità</p>
                  <p className="text-sm font-semibold">{weather.humidity}%</p>
                </div>
                <div className="text-center">
                  <Wind className="h-5 w-5 mx-auto mb-1 text-white/80" />
                  <p className="text-xs text-white/70">Vento</p>
                  <p className="text-sm font-semibold">{weather.windSpeed} km/h</p>
                </div>
              </div>

              {/* Mobile info */}
              <div className="sm:hidden grid grid-cols-3 gap-3 w-full pt-2 border-t border-white/20">
                <div className="text-center">
                  <Thermometer className="h-5 w-5 mx-auto mb-1 text-white/80" />
                  <p className="text-xs text-white/70">Percepita</p>
                  <p className="text-sm font-semibold">{weather.apparentTemperature}°C</p>
                </div>
                <div className="text-center">
                  <Droplets className="h-5 w-5 mx-auto mb-1 text-white/80" />
                  <p className="text-xs text-white/70">Umidità</p>
                  <p className="text-sm font-semibold">{weather.humidity}%</p>
                </div>
                <div className="text-center">
                  <Wind className="h-5 w-5 mx-auto mb-1 text-white/80" />
                  <p className="text-xs text-white/70">Vento</p>
                  <p className="text-sm font-semibold">{weather.windSpeed} km/h</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-white/80">
              <Cloud className="h-6 w-6" />
              <p className="text-sm">Meteo non disponibile</p>
            </div>
          )}
        </div>
      </div>

      {/* Timeline Prenotazioni */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden w-full">
        <div className="px-6 py-5">
          <h2 className="text-lg font-bold text-gray-900">Timeline Campi</h2>
        </div>
        <div className="px-4 pb-4 w-full overflow-x-auto">
          <BookingsTimeline bookings={timelineBookings} loading={loading} />
        </div>
      </div>

      {/* Bacheca GST - Centro Operativo */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-5">
          <h2 className="text-lg font-bold text-gray-900">Bacheca GST</h2>
        </div>

        <div className="space-y-6 px-6 pb-6">
          {/* Richiede Attenzione - Alert Cards */}
          {alertsCount > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Richiede Attenzione</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.pendingBookings > 0 && (
                  <Link
                    href="/dashboard/admin/bookings?filter=pending"
                    className="bg-secondary rounded-lg p-4 hover:shadow-md transition-all flex flex-row items-center gap-3"
                  >
                    <div className="flex-shrink-0">
                      <Calendar className="h-8 w-8 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <div className="flex-1 hidden sm:block">
                      <p className="text-xs text-white/70">Prenotazioni</p>
                      <h3 className="text-2xl font-bold text-white">{stats.pendingBookings}</h3>
                    </div>
                    <div className="flex sm:hidden items-center gap-2 flex-1">
                      <h3 className="text-2xl font-bold text-white">{stats.pendingBookings}</h3>
                      <p className="text-xs text-white/70">Pren.</p>
                    </div>
                  </Link>
                )}

                {stats.unreadMessages > 0 && (
                  <Link
                    href="/dashboard/admin/chat"
                    className="bg-secondary rounded-lg p-4 hover:shadow-md transition-all flex flex-row items-center gap-3"
                  >
                    <div className="flex-shrink-0">
                      <MessageSquare className="h-8 w-8 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <div className="flex-1 hidden sm:block">
                      <p className="text-xs text-white/70">Messaggi</p>
                      <h3 className="text-2xl font-bold text-white">{stats.unreadMessages}</h3>
                    </div>
                    <div className="flex sm:hidden items-center gap-2 flex-1">
                      <h3 className="text-2xl font-bold text-white">{stats.unreadMessages}</h3>
                      <p className="text-xs text-white/70">Msg</p>
                    </div>
                  </Link>
                )}

                {stats.pendingArena > 0 && (
                  <Link
                    href="/dashboard/admin/arena"
                    className="bg-secondary rounded-lg p-4 hover:shadow-md transition-all flex flex-row items-center gap-3"
                  >
                    <div className="flex-shrink-0">
                      <Swords className="h-8 w-8 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <div className="flex-1 hidden sm:block">
                      <p className="text-xs text-white/70">Arena</p>
                      <h3 className="text-2xl font-bold text-white">{stats.pendingArena}</h3>
                    </div>
                    <div className="flex sm:hidden items-center gap-2 flex-1">
                      <h3 className="text-2xl font-bold text-white">{stats.pendingArena}</h3>
                      <p className="text-xs text-white/70">Arena</p>
                    </div>
                  </Link>
                )}

                {stats.pendingJobApplications > 0 && (
                  <Link
                    href="/dashboard/admin/job-applications"
                    className="bg-secondary rounded-lg p-4 hover:shadow-md transition-all flex flex-row items-center gap-3"
                  >
                    <div className="flex-shrink-0">
                      <FileText className="h-8 w-8 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <div className="flex-1 hidden sm:block">
                      <p className="text-xs text-white/70">Candidature</p>
                      <h3 className="text-2xl font-bold text-white">{stats.pendingJobApplications}</h3>
                    </div>
                    <div className="flex sm:hidden items-center gap-2 flex-1">
                      <h3 className="text-2xl font-bold text-white">{stats.pendingJobApplications}</h3>
                      <p className="text-xs text-white/70">Cand.</p>
                    </div>
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Annunci */}
          <div className="space-y-3 pt-3 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Annunci</h3>
              <Link href="/dashboard/admin/announcements" className="text-xs font-medium text-secondary hover:opacity-80">
                Gestisci
              </Link>
            </div>

            {recentAnnouncements.length === 0 ? (
              <div className="text-center py-6">
                <Megaphone className="h-5 w-5 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Nessun annuncio al momento</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentAnnouncements.slice(0, 3).map((announcement) => (
                  <div
                    key={announcement.id}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-200 border-l-4 border-l-secondary hover:bg-gray-100 transition-all cursor-pointer"
                    onClick={() => handleAnnouncementClick(announcement)}
                  >
                    <div className="flex items-center gap-3">
                      <Megaphone className="h-4 w-4 text-secondary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{announcement.title}</p>
                      </div>
                      {announcement.priority === "urgent" && (
                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-red-50 text-red-700 rounded whitespace-nowrap flex-shrink-0">
                          URGENTE
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Centro Notifiche */}
          <div className="space-y-3 pt-3 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Notifiche</h3>
              {unreadNotifications > 0 && (
                <button onClick={markAllNotificationsRead} className="text-xs font-semibold text-secondary hover:opacity-80">
                  Segna tutte come lette
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="text-center py-6">
                <Bell className="h-5 w-5 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Nessuna notifica</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.slice(0, 3).map((n) => {
                  const icon = (() => {
                    switch (n.type) {
                      case "booking":
                        return <Calendar className="h-4 w-4 text-secondary" />;
                      case "tournament":
                        return <Trophy className="h-4 w-4 text-secondary" />;
                      case "message":
                        return <MessageSquare className="h-4 w-4 text-secondary" />;
                      case "success":
                        return <CheckCircle className="h-4 w-4 text-secondary" />;
                      case "warning":
                        return <AlertCircle className="h-4 w-4 text-secondary" />;
                      case "error":
                        return <XCircle className="h-4 w-4 text-secondary" />;
                      default:
                        return <Info className="h-4 w-4 text-secondary" />;
                    }
                  })();

                  return (
                    <div
                      key={n.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-all cursor-pointer"
                      onClick={() => handleNotificationClick(n)}
                    >
                      <div className="flex-shrink-0">{icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{n.title}</p>
                      </div>
                      {!n.is_read && <span className="w-2 h-2 bg-secondary rounded-full flex-shrink-0" />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Annuncio */}
      {selectedAnnouncement && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedAnnouncement(null);
          }}
        >
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 bg-secondary rounded-t-xl">
              <div className="flex items-center gap-3">
                <Megaphone className="h-6 w-6 text-white" />
                <h3 className="text-lg font-bold text-white">{selectedAnnouncement.title}</h3>
              </div>
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50 space-y-4">
              {/* Date and Priority */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-secondary/70">
                  <Clock className="w-4 h-4" />
                  <span>
                    {new Date(selectedAnnouncement.created_at).toLocaleDateString("it-IT", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
                {selectedAnnouncement.priority === "urgent" && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                    <AlertCircle className="w-3.5 h-3.5" />
                    URGENTE
                  </span>
                )}
              </div>

              {/* Content */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-secondary whitespace-pre-wrap leading-relaxed">{selectedAnnouncement.content}</p>
              </div>

              {/* Author */}
              {selectedAnnouncement.profiles?.full_name && (
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-xs text-secondary/60 uppercase tracking-wider font-semibold mb-1">Pubblicato da</p>
                  <p className="text-sm font-medium text-secondary">{selectedAnnouncement.profiles.full_name}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Notifica */}
      {selectedNotification && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedNotification(null);
          }}
        >
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 bg-secondary rounded-t-xl">
              <div className="flex items-center gap-3">
                <Bell className="h-6 w-6 text-white" />
                <h3 className="text-lg font-bold text-white">{selectedNotification.title}</h3>
              </div>
              <button
                onClick={() => setSelectedNotification(null)}
                className="rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50 space-y-4">
              {/* Date */}
              <div className="flex items-center gap-2 text-sm text-secondary/70">
                <Clock className="w-4 h-4" />
                <span>
                  {new Date(selectedNotification.created_at).toLocaleDateString("it-IT", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>

              {/* Message */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-secondary whitespace-pre-wrap leading-relaxed">{selectedNotification.message}</p>
              </div>

              {/* Action Link */}
              {selectedNotification.action_url && (
                <a
                  href={selectedNotification.action_url}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-secondary text-white rounded-lg hover:opacity-90 transition-colors font-medium text-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  Vai alla pagina
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
