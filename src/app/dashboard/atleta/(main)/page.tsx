"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import {
  Calendar,
  Trophy,
  Video,
  TrendingUp,
  Clock,
  Plus,
  ArrowRight,
  Target,
  Award,
  BookOpen,
  CheckCircle2,
  Zap,
  Megaphone,
  Bell,
  Swords,
  MessageSquare,
  Users,
  CheckCircle,
  Info,
  AlertCircle,
  XCircle,
  X,
  ExternalLink,
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


interface Stats {
  upcomingBookings: number;
  activeTournaments: number;
  completedLessons: number;
  arenaActivities: number;
}

interface Booking {
  id: string;
  court: string;
  type: string;
  start_time: string;
  end_time: string;
  status: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  announcement_type: string;
  priority: string;
  created_at: string;
  is_pinned: boolean;
  has_viewed?: boolean;
  link_url?: string | null;
  link_text?: string | null;
  expiry_date?: string | null;
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

export default function AtletaDashboard() {
  const [stats, setStats] = useState<Stats>({
    upcomingBookings: 0,
    activeTournaments: 0,
    completedLessons: 0,
    arenaActivities: 0,
  });
  const [nextBookings, setNextBookings] = useState<Booking[]>([]);
  const [recentAnnouncements, setRecentAnnouncements] = useState<Announcement[]>([]);
  const [nextEvents, setNextEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState<string>("");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    // Load profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    if (profile) setUserName(profile.full_name || "Atleta");

    // Load upcoming bookings
    const now = new Date().toISOString();
    const { data: bookings, count: bookingsCount } = await supabase
      .from("bookings")
      .select("id, court, type, start_time, end_time, status", { count: "exact" })
      .eq("user_id", user.id)
      .neq("status", "cancelled")
      .gte("start_time", now)
      .order("start_time", { ascending: true })
      .limit(3);

    // Load tournament participations
    const { data: participations } = await supabase
      .from("tournament_participants")
      .select("tournament_id")
      .eq("user_id", user.id);
    // Load upcoming tournaments
    const { data: tournaments } = await supabase
      .from("tournaments")
      .select("id, title, start_date, category, tournament_type")
      .in("status", ["Aperto", "Aperte le Iscrizioni", "In Corso"])
      .gte("start_date", now)
      .order("start_date", { ascending: true })
      .limit(10);


    // Load completed video lessons count (total assignments)
    const { count: videoCount } = await supabase
      .from("video_assignments")
      .select("id", { count: "exact" })
      .eq("user_id", user.id);

    // Load arena activities (active challenges)
    const { count: arenaCount } = await supabase
      .from("arena_challenges")
      .select("id", { count: "exact" })
      .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
      .in("status", ["pending", "accepted"]);

    setStats({
      upcomingBookings: bookingsCount || 0,
      activeTournaments: participations?.length || 0,
      completedLessons: videoCount || 0,
      arenaActivities: arenaCount || 0,
    });

    // Combine bookings and tournaments into events
    const events: Event[] = [];
    
    // Add bookings as events
    if (bookings) {
      bookings.forEach(booking => {
        events.push({
          id: booking.id,
          title: booking.court,
          start_time: booking.start_time,
          end_time: booking.end_time,
          court: booking.court,
          type: booking.type,
          eventType: 'booking'
        });
      });
    }

    // Add tournaments as events
    if (tournaments) {
      tournaments.forEach(tournament => {
        events.push({
          id: tournament.id,
          title: tournament.title,
          start_time: tournament.start_date,
          eventType: 'tournament',
          type: tournament.category || tournament.tournament_type
        });
      });
    }

    // Sort by start_time and limit to 5
    events.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    setNextEvents(events.slice(0, 5));

    // Load recent announcements
    const { data: { session } } = await supabase.auth.getSession();
    const headers: HeadersInit = {};
    if (session) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }

    try {
      const response = await fetch("/api/announcements", { headers });
      if (response.ok) {
        const data = await response.json();
        // Get only the first 3 announcements
        setRecentAnnouncements((data.announcements || []).slice(0, 3));
      }
    } catch (error) {
      console.error("Error loading announcements:", error);
    }

    // Load notifications center
    try {
      const { data: notifs, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(6);
      if (!error) {
        setNotifications(notifs || []);
        setUnreadNotifications((notifs || []).filter((n: any) => !n.is_read).length);
      }
    } catch (error) {
      console.error("Error loading notifications:", error);
    }

    setLoading(false);
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("it-IT", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  };

  async function handleAnnouncementClick(announcement: Announcement) {
    setSelectedAnnouncement(announcement);

    if (!announcement.has_viewed) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: HeadersInit = {};
        if (session) headers["Authorization"] = `Bearer ${session.access_token}`;
        await fetch(`/api/announcements/${announcement.id}`, {
          method: "PATCH",
          headers,
        });
        setRecentAnnouncements(prev => prev.map(a => a.id === announcement.id ? { ...a, has_viewed: true } : a));
      } catch (e) {
        console.error("Error marking announcement viewed", e);
      }
    }
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
          setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n));
          setUnreadNotifications(prev => Math.max(0, prev - 1));
        }
      } catch (e) {
        console.error("Error marking notification read", e);
      }
    }
  }

  async function markAllNotificationsRead() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      if (!error) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadNotifications(0);
      }
    } catch (e) {
      console.error("Error marking all notifications read", e);
    }
  }

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
      <div className="flex flex-col gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-secondary mb-1">
            Bentornato, {userName}
          </h1>
          <p className="text-secondary/70 font-medium text-sm sm:text-base">
            Ecco il riepilogo della tua attività
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <Link href="/dashboard/atleta/bookings" className="bg-secondary rounded-lg p-4 hover:shadow-md transition-all group flex items-center gap-4">
          <div className="flex-shrink-0">
            <Calendar className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-white/70">Prenotazioni</p>
            <h3 className="text-2xl font-bold text-white">{stats.upcomingBookings}</h3>
          </div>
        </Link>

        <Link href="/dashboard/atleta/tornei" className="bg-secondary rounded-lg p-4 hover:shadow-md transition-all group flex items-center gap-4">
          <div className="flex-shrink-0">
            <Trophy className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-white/70">Tornei Attivi</p>
            <h3 className="text-2xl font-bold text-white">{stats.activeTournaments}</h3>
          </div>
        </Link>

        <Link href="/dashboard/atleta/videos" className="bg-secondary rounded-lg p-4 hover:shadow-md transition-all group flex items-center gap-4">
          <div className="flex-shrink-0">
            <Video className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-white/70">Video Completati</p>
            <h3 className="text-2xl font-bold text-white">{stats.completedLessons}</h3>
          </div>
        </Link>

        <Link href="/dashboard/atleta/arena" className="bg-secondary rounded-lg p-4 hover:shadow-md transition-all group flex items-center gap-4">
          <div className="flex-shrink-0">
            <Swords className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-white/70">Arena</p>
            <h3 className="text-xl font-bold text-white">{stats.arenaActivities}</h3>
          </div>
        </Link>
      </div>

      {/* Meteo */}
      <div className="bg-secondary rounded-xl p-5 text-white">
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


      {/* Bacheca */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Annunci */}
        <div className="px-4 sm:px-6 pt-5 pb-4">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Annunci</h2>
          {recentAnnouncements.length === 0 ? (
            <p className="text-sm text-gray-500">Nessun annuncio al momento</p>
          ) : (
            <div className="space-y-3">
              {recentAnnouncements.map((announcement) => (
                <div
                  key={announcement.id}
                  className="relative p-3 sm:p-4 bg-white rounded-lg border border-gray-200 border-l-4 border-l-secondary hover:border-secondary/30 hover:bg-blue-50/30 transition-all group cursor-pointer"
                  onClick={() => handleAnnouncementClick(announcement)}
                >
                  <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                    <div className="flex-shrink-0 mt-0.5 sm:mt-0">
                      <Megaphone className="h-5 w-5 text-secondary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-gray-900 text-sm sm:text-base">{announcement.title}</h3>
                        {announcement.priority === "urgent" && (
                          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-red-50 text-red-700 rounded-md whitespace-nowrap">
                            URGENTE
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
                        <Clock className="h-3.5 w-3.5" />
                        <span>
                          {new Date(announcement.created_at).toLocaleDateString("it-IT", {
                            weekday: "short",
                            day: "numeric",
                            month: "short"
                          })}
                        </span>
                        <span className="text-gray-300">&bull;</span>
                        <span>
                          {new Date(announcement.created_at).toLocaleTimeString("it-IT", {
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <hr className="border-gray-200" />

        {/* Centro Notifiche */}
        <div className="px-4 sm:px-6 pt-5 pb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Centro Notifiche</h2>
            {unreadNotifications > 0 && (
              <button
                onClick={markAllNotificationsRead}
                className="text-xs font-semibold text-secondary hover:opacity-80 flex items-center gap-1"
              >
                <CheckCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Segna tutte come lette</span> ({unreadNotifications})
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <p className="text-sm text-gray-500">Nessuna notifica al momento</p>
          ) : (
            <div className="space-y-2">
              {notifications.map((n) => {
                const icon = (() => {
                  switch (n.type) {
                    case "booking": return <Calendar className="h-5 w-5" style={{ color: '#056c94' }} />;
                    case "tournament": return <Trophy className="h-5 w-5" style={{ color: '#39c3f9' }} />;
                    case "message": return <MessageSquare className="h-5 w-5" style={{ color: '#08b3f7' }} />;
                    case "course": return <Users className="h-5 w-5" style={{ color: '#0690c6' }} />;
                    case "success": return <CheckCircle className="h-5 w-5" style={{ color: '#6bd2fa' }} />;
                    case "warning": return <AlertCircle className="h-5 w-5" style={{ color: '#9ce1fc' }} />;
                    case "error": return <XCircle className="h-5 w-5" style={{ color: '#056c94' }} />;
                    default: return <Info className="h-5 w-5" style={{ color: '#034863' }} />;
                  }
                })();
                return (
                  <div
                    key={n.id}
                    className="flex items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border border-l-4 border-l-secondary transition-all cursor-pointer bg-white border-gray-200 hover:border-secondary/30 hover:bg-blue-50/30"
                    onClick={() => handleNotificationClick(n)}
                  >
                    <div className="flex-shrink-0 mt-0.5 sm:mt-0">{icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{n.title}</p>
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500 sm:hidden">
                        <Clock className="h-3.5 w-3.5" />
                        <span>
                          {new Date(n.created_at).toLocaleString("it-IT", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}
                        </span>
                      </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500 flex-shrink-0">
                      <Clock className="h-3.5 w-3.5" />
                      <span>
                        {new Date(n.created_at).toLocaleString("it-IT", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}
                      </span>
                    </div>
                    {!n.is_read && <span className="w-2 h-2 bg-secondary rounded-full flex-shrink-0" />}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <hr className="border-gray-200" />

        {/* Prossimi Eventi */}
        <div className="px-4 sm:px-6 pt-5 pb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Prossimi Eventi</h2>
          {nextEvents.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-gray-500 mb-4">Non hai prossimi appuntamenti</p>
              <Link
                href="/dashboard/atleta/bookings/new"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-secondary rounded-md hover:opacity-90 transition-all"
              >
                <Plus className="h-4 w-4" />
                Prenota Ora
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {nextEvents.map((event) => (
                <Link
                  key={event.id}
                  href={event.eventType === 'booking' ? `/dashboard/atleta/bookings/${event.id}` : `/dashboard/atleta/tornei/${event.id}`}
                  className="flex items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white rounded-lg border border-gray-200 border-l-4 border-l-secondary hover:border-secondary/30 hover:bg-blue-50/30 transition-all cursor-pointer"
                >
                  <div className="flex-shrink-0 mt-0.5 sm:mt-0">
                    {event.eventType === 'booking' ? (
                      <Calendar className="h-5 w-5 text-secondary" />
                    ) : (
                      <Trophy className="h-5 w-5 text-secondary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-900">{event.title}</p>
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-secondary/10 text-secondary rounded-md whitespace-nowrap">
                        {event.eventType === 'booking' ? event.type : 'Torneo'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{formatDate(event.start_time)}</span>
                      <span className="text-gray-300">&bull;</span>
                      <span className="font-medium">{formatTime(event.start_time)}</span>
                    </div>
                  </div>
                </Link>
              ))}
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
            <div className="flex items-center justify-between p-4 sm:p-6 bg-secondary rounded-t-xl">
              <div className="flex items-center gap-3 min-w-0">
                <Megaphone className="h-6 w-6 text-white flex-shrink-0" />
                <h3 className="text-base sm:text-lg font-bold text-white truncate">{selectedAnnouncement.title}</h3>
              </div>
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50 space-y-4">
              {/* Date and Priority */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm text-secondary/70">
                  <Clock className="w-4 h-4" />
                  <span>
                    {new Date(selectedAnnouncement.created_at).toLocaleDateString("it-IT", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric"
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
                <p className="text-secondary whitespace-pre-wrap leading-relaxed">
                  {selectedAnnouncement.content}
                </p>
              </div>

              {/* Link */}
              {selectedAnnouncement.link_url && (
                <a
                  href={selectedAnnouncement.link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-secondary text-white rounded-lg hover:opacity-90 transition-colors font-medium text-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  {selectedAnnouncement.link_text || "Apri link"}
                </a>
              )}

              {/* Author */}
              {selectedAnnouncement.profiles?.full_name && (
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-xs text-secondary/60 uppercase tracking-wider font-semibold mb-1">Pubblicato da</p>
                  <p className="text-sm font-medium text-secondary">
                    {selectedAnnouncement.profiles.full_name}
                  </p>
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
            <div className="flex items-center justify-between p-4 sm:p-6 bg-secondary rounded-t-xl">
              <div className="flex items-center gap-3 min-w-0">
                <Bell className="h-6 w-6 text-white flex-shrink-0" />
                <h3 className="text-base sm:text-lg font-bold text-white truncate">{selectedNotification.title}</h3>
              </div>
              <button
                onClick={() => setSelectedNotification(null)}
                className="rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50 space-y-4">
              {/* Date */}
              <div className="flex items-center gap-2 text-sm text-secondary/70">
                <Clock className="w-4 h-4 flex-shrink-0" />
                <span>
                  {new Date(selectedNotification.created_at).toLocaleDateString("it-IT", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                  })}
                </span>
              </div>

              {/* Message */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-secondary whitespace-pre-wrap leading-relaxed">
                  {selectedNotification.message}
                </p>
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
interface Tournament {
  id: string;
  name: string;
  start_date: string;
  category?: string;
  type?: string;
}

interface Event {
  id: string;
  title: string;
  start_time: string;
  end_time?: string;
  court?: string;
  type?: string;
  eventType: 'booking' | 'tournament';
}
