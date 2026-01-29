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
  ChevronRight,
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

interface ForecastDay {
  date: string;
  tempMax: number;
  tempMin: number;
  weatherCode: number;
  sunrise: string;
  sunset: string;
  uvIndexMax: number;
  precipitationSum: number;
  hourly: { time: string; temp: number; weatherCode: number }[];
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
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [showWeatherModal, setShowWeatherModal] = useState(false);
  const [selectedForecastDay, setSelectedForecastDay] = useState(0);

  useEffect(() => {
    loadDashboardData();
    loadWeatherData();
  }, []);

  async function loadWeatherData() {
    try {
      const response = await fetch(
        "https://api.open-meteo.com/v1/forecast?latitude=42.07631852280004&longitude=12.373061355799356&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day&daily=temperature_2m_max,temperature_2m_min,weather_code,sunrise,sunset,uv_index_max,precipitation_sum&hourly=temperature_2m,weather_code&timezone=Europe%2FRome&forecast_days=7"
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

      if (data.daily && data.hourly) {
        const days: ForecastDay[] = data.daily.time.map((date: string, i: number) => {
          const dayHourly = data.hourly.time
            .map((t: string, hi: number) => ({ time: t, temp: Math.round(data.hourly.temperature_2m[hi]), weatherCode: data.hourly.weather_code[hi] }))
            .filter((h: { time: string }) => h.time.startsWith(date));
          return {
            date,
            tempMax: Math.round(data.daily.temperature_2m_max[i]),
            tempMin: Math.round(data.daily.temperature_2m_min[i]),
            weatherCode: data.daily.weather_code[i],
            sunrise: data.daily.sunrise[i],
            sunset: data.daily.sunset[i],
            uvIndexMax: Math.round(data.daily.uv_index_max[i]),
            precipitationSum: data.daily.precipitation_sum[i],
            hourly: dayHourly,
          };
        });
        setForecast(days);
      }
    } catch (error) {
      console.error("Error loading weather data:", error);
    }
    setWeatherLoading(false);
  }

  function getWeatherInfo(code: number, iconClass = "h-12 w-12 sm:h-8 sm:w-8") {
    const weatherLabels: Record<number, string> = {
      0: "Sereno", 1: "Prevalentemente sereno",
      2: "Parzialmente nuvoloso", 3: "Nuvoloso",
      45: "Nebbia", 48: "Nebbia con brina",
      51: "Pioggerella leggera", 53: "Pioggerella", 55: "Pioggerella intensa",
      61: "Pioggia leggera", 63: "Pioggia", 65: "Pioggia intensa",
      71: "Neve leggera", 73: "Neve", 75: "Neve intensa",
      80: "Rovesci leggeri", 81: "Rovesci", 82: "Rovesci violenti",
      95: "Temporale", 96: "Temporale con grandine", 99: "Temporale con grandine",
    };
    const label = weatherLabels[code] || "Sconosciuto";

    const getIcon = (c: number) => {
      if (c <= 1) return <Sun className={iconClass} />;
      if (c <= 48) return <Cloud className={iconClass} />;
      if (c <= 67 || (c >= 80 && c <= 82)) return <CloudRain className={iconClass} />;
      if (c <= 77) return <CloudSnow className={iconClass} />;
      return <CloudLightning className={iconClass} />;
    };

    return { label, icon: getIcon(code) };
  }

  function formatForecastDate(dateStr: string) {
    const date = new Date(dateStr + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.getTime() === today.getTime()) return "Oggi";
    if (date.getTime() === tomorrow.getTime()) return "Domani";
    return date.toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" });
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
      <div className="bg-secondary rounded-xl p-5 text-white cursor-pointer hover:bg-secondary/90 transition-all" onClick={() => setShowWeatherModal(true)}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg sm:text-lg">Tennis Club GST</h3>
            <p className="text-xs sm:text-sm text-white/80">Formello, RM</p>
          </div>

          {weatherLoading ? (
            <div className="flex items-center gap-6 animate-pulse">
              <div className="h-12 w-24 bg-white/20 rounded" />
              <div className="h-8 w-8 bg-white/20 rounded-full" />
            </div>
          ) : weather ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 flex-shrink-0">
              {/* Mobile Layout */}
              <div className="sm:hidden flex items-center justify-between gap-4 w-full">
                <div className="text-left">
                  <div className="text-4xl font-bold leading-none mb-1">{weather.temperature}°C</div>
                  <p className="text-sm text-white/90">{getWeatherInfo(weather.weatherCode).label}</p>
                </div>
                <div className="text-white flex-shrink-0">
                  {getWeatherInfo(weather.weatherCode).icon}
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

      {/* Weather Modal - iPhone Style */}
      {showWeatherModal && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={() => setShowWeatherModal(false)}>
          <div className="w-full sm:max-w-md max-h-[90vh] overflow-hidden rounded-t-3xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-b from-[#034a6e] via-[#045a84] to-[#067ab5] text-white overflow-y-auto [&::-webkit-scrollbar]:hidden" style={{ maxHeight: "90vh", scrollbarWidth: "none" }}>
              {/* Drag handle (mobile) */}
              <div className="sm:hidden flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-white/30" />
              </div>

              {/* Top: Location + Current Temp */}
              <div className="text-center px-6 pt-4 pb-6">
                <p className="text-base font-medium text-white/90 mb-0.5">Formello</p>
                <div className="text-7xl font-thin tracking-tighter mb-1">
                  {weather?.temperature ?? "--"}°
                </div>
                {forecast.length > 0 && (
                  <>
                    <p className="text-base text-white/90 mb-1">{getWeatherInfo(weather?.weatherCode ?? 0, "h-0 w-0").label}</p>
                    <p className="text-base text-white/80">
                      Max {forecast[0]?.tempMax}°  Min {forecast[0]?.tempMin}°
                    </p>
                  </>
                )}
              </div>

              {/* Hourly Forecast */}
              {forecast.length > 0 && (
                <div className="mx-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 p-4 mb-3">
                  <div className="flex overflow-x-auto gap-4 pb-1 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none" }}>
                    {forecast[0].hourly
                      .filter((h) => {
                        const hourTime = new Date(h.time);
                        const now = new Date();
                        return hourTime >= now || hourTime.getHours() % 3 === 0;
                      })
                      .slice(0, 12)
                      .map((h, i) => {
                        const hourTime = new Date(h.time);
                        const now = new Date();
                        const isNow = i === 0 && hourTime.getHours() === now.getHours();
                        const label = isNow ? "Ora" : h.time.split("T")[1]?.slice(0, 5) || "";
                        return (
                          <div key={h.time} className="flex flex-col items-center gap-1.5 flex-shrink-0 min-w-[44px]">
                            <p className="text-xs font-medium text-white/80">{label}</p>
                            <div className="text-white">{getWeatherInfo(h.weatherCode, "h-5 w-5").icon}</div>
                            <p className="text-sm font-semibold">{h.temp}°</p>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* 7-Day Forecast */}
              {forecast.length > 0 && (() => {
                const allMin = Math.min(...forecast.map(d => d.tempMin));
                const allMax = Math.max(...forecast.map(d => d.tempMax));
                const range = allMax - allMin || 1;
                return (
                  <div className="mx-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 p-4 mb-3">
                    <div className="flex items-center gap-1.5 mb-3 text-white/60">
                      <Calendar className="h-3.5 w-3.5" />
                      <p className="text-xs font-semibold uppercase tracking-wider">Previsioni 7 giorni</p>
                    </div>
                    <div className="space-y-2.5">
                      {forecast.map((day, i) => {
                        const leftPct = ((day.tempMin - allMin) / range) * 100;
                        const widthPct = ((day.tempMax - day.tempMin) / range) * 100;
                        return (
                          <div key={day.date} className="flex items-center gap-2">
                            <div className="w-10 text-sm font-medium text-white/90 flex-shrink-0">
                              {i === 0 ? "Oggi" : new Date(day.date + "T00:00:00").toLocaleDateString("it-IT", { weekday: "short" }).replace(/^\w/, c => c.toUpperCase())}
                            </div>
                            <div className="flex-shrink-0 w-5 text-white">{getWeatherInfo(day.weatherCode, "h-5 w-5").icon}</div>
                            <span className="text-sm text-white/50 w-7 text-right flex-shrink-0">{day.tempMin}°</span>
                            <div className="flex-1 h-1 rounded-full bg-white/15 relative mx-1">
                              <div
                                className="absolute h-full rounded-full bg-gradient-to-r from-[#5ac8fa] to-[#ffd60a]"
                                style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 8)}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-white w-7 flex-shrink-0">{day.tempMax}°</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Detail Cards Grid */}
              {weather && forecast.length > 0 && (
                <div className="grid grid-cols-2 gap-3 mx-4 mb-4">
                  {/* UV Index */}
                  <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 p-4">
                    <div className="flex items-center gap-1.5 mb-2 text-white/60">
                      <Sun className="h-3.5 w-3.5" />
                      <p className="text-xs font-semibold uppercase tracking-wider">Indice UV</p>
                    </div>
                    <div className="text-3xl font-bold mb-1">{forecast[0]?.uvIndexMax}</div>
                    <p className="text-sm text-white/70">
                      {forecast[0]?.uvIndexMax <= 2 ? "Basso" : forecast[0]?.uvIndexMax <= 5 ? "Moderato" : forecast[0]?.uvIndexMax <= 7 ? "Alto" : "Molto alto"}
                    </p>
                  </div>

                  {/* Sunrise/Sunset */}
                  <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 p-4">
                    <div className="flex items-center gap-1.5 mb-2 text-white/60">
                      <Sun className="h-3.5 w-3.5" />
                      <p className="text-xs font-semibold uppercase tracking-wider">Alba / Tramonto</p>
                    </div>
                    <div className="text-lg font-bold">{forecast[0]?.sunrise?.split("T")[1]?.slice(0, 5)}</div>
                    <div className="text-lg font-bold text-white/70">{forecast[0]?.sunset?.split("T")[1]?.slice(0, 5)}</div>
                  </div>

                  {/* Wind */}
                  <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 p-4">
                    <div className="flex items-center gap-1.5 mb-2 text-white/60">
                      <Wind className="h-3.5 w-3.5" />
                      <p className="text-xs font-semibold uppercase tracking-wider">Vento</p>
                    </div>
                    <div className="text-3xl font-bold mb-1">{weather.windSpeed}</div>
                    <p className="text-sm text-white/70">km/h</p>
                  </div>

                  {/* Precipitation */}
                  <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 p-4">
                    <div className="flex items-center gap-1.5 mb-2 text-white/60">
                      <Droplets className="h-3.5 w-3.5" />
                      <p className="text-xs font-semibold uppercase tracking-wider">Precipitazioni</p>
                    </div>
                    <div className="text-3xl font-bold mb-1">{forecast[0]?.precipitationSum ?? 0}</div>
                    <p className="text-sm text-white/70">mm oggi</p>
                  </div>

                  {/* Feels Like */}
                  <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 p-4">
                    <div className="flex items-center gap-1.5 mb-2 text-white/60">
                      <Thermometer className="h-3.5 w-3.5" />
                      <p className="text-xs font-semibold uppercase tracking-wider">Percepita</p>
                    </div>
                    <div className="text-3xl font-bold">{weather.apparentTemperature}°</div>
                  </div>

                  {/* Humidity */}
                  <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 p-4">
                    <div className="flex items-center gap-1.5 mb-2 text-white/60">
                      <Droplets className="h-3.5 w-3.5" />
                      <p className="text-xs font-semibold uppercase tracking-wider">Umidita</p>
                    </div>
                    <div className="text-3xl font-bold">{weather.humidity}%</div>
                  </div>
                </div>
              )}

              {/* Close button bottom */}
              <div className="px-4 pb-6 pt-1">
                <button
                  onClick={() => setShowWeatherModal(false)}
                  className="w-full py-3 rounded-2xl bg-white/15 text-white font-semibold text-sm hover:bg-white/25 transition-all"
                >
                  Chiudi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Timeline Prenotazioni */}
      <div className="w-full">
        <BookingsTimeline bookings={timelineBookings} loading={loading} />
      </div>

      {/* Bacheca GST - Centro Operativo */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="space-y-6 px-6 py-6">
          {/* Annunci */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-secondary">Annunci</h3>

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
            <h3 className="text-lg font-semibold text-secondary">Notifiche</h3>
            {unreadNotifications > 0 && (
              <button onClick={markAllNotificationsRead} className="text-xs font-semibold text-secondary hover:opacity-80">
                Segna tutte come lette
              </button>
            )}

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

          {/* Richiede Attenzione - Alert Cards */}
          {alertsCount > 0 && (
            <div className="space-y-3 pt-3 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-secondary">Richiede Attenzione</h3>
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
