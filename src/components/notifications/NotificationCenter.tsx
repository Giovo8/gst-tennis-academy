"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import {
  Bell,
  Mail,
  Trophy,
  Megaphone,
  CalendarClock,
  Users,
  Video,
  Swords,
  Loader2,
  CheckCheck,
  CheckCircle2,
  AlertTriangle,
  Send,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "sonner";
import { getMessageNotificationLink } from "@/lib/notifications/links";

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  is_read: boolean;
  created_at: string;
}

function isVideoNotification(n: Pick<Notification, "type" | "title" | "message">) {
  const text = `${n.title} ${n.message}`.toLowerCase();
  return n.type === "video" || text.includes("video");
}

function getNotificationIcon(n: Notification) {
  const cls = "h-5 w-5 text-white";
  if (isVideoNotification(n)) return <Video className={cls} strokeWidth={2.5} />;

  switch (n.type) {
    case "message":
      return <Mail className={cls} strokeWidth={2.5} />;
    case "tournament":
      return <Trophy className={cls} strokeWidth={2.5} />;
    case "announcement":
      return <Megaphone className={cls} strokeWidth={2.5} />;
    case "booking": {
      const text = `${n.title} ${n.message}`.toLowerCase();
      if (text.includes("lezione")) return <Users className={cls} strokeWidth={2.5} />;
      return <CalendarClock className={cls} strokeWidth={2.5} />;
    }
    case "arena_challenge":
    case "arena_challenge_booked":
      return <Swords className={cls} strokeWidth={2.5} />;
    case "success":
      return <CheckCircle2 className={cls} strokeWidth={2.5} />;
    case "warning":
    case "error":
      return <AlertTriangle className={cls} strokeWidth={2.5} />;
    default:
      return <Bell className={cls} strokeWidth={2.5} />;
  }
}

function getNotificationColor(n: Notification): string {
  const text = `${n.title} ${n.message}`.toLowerCase();
  if (n.type === "booking" && text.includes("lezione")) return "#023047";

  const colorMap: Record<string, string> = {
    booking: "var(--secondary)",
    arena_challenge: "var(--secondary)",
    arena_challenge_booked: "var(--secondary)",
    tournament: "#6d28d9",
    message: "#0369a1",
    success: "#15803d",
    warning: "#b45309",
    error: "#b91c1c",
    announcement: "var(--secondary)",
  };

  return colorMap[n.type] ?? "var(--secondary)";
}

export default function NotificationCenter() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [search, setSearch] = useState("");
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  async function loadNotifications() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    setUserRole(profile?.role ?? null);

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setNotifications(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  async function markAsRead(id: string) {
    const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    if (!error) {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    }
  }

  async function markAllAsRead() {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    const { error } = await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    }
  }

  function resolveLink(n: Notification): string | null {
    if (n.type === "message") return getMessageNotificationLink(userRole);
    return n.link || null;
  }

  const normalizedSearch = search.trim().toLowerCase();
  const hasActiveFilters = filter !== "all" || normalizedSearch !== "";

  const filteredNotifications = notifications.filter((n) => {
    const matchesFilter = filter === "unread" ? !n.is_read : filter === "read" ? n.is_read : true;
    const matchesSearch =
      !normalizedSearch ||
      n.title.toLowerCase().includes(normalizedSearch) ||
      n.message.toLowerCase().includes(normalizedSearch);
    return matchesFilter && matchesSearch;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6 pt-3">
      <div>
        <p className="breadcrumb text-secondary/60">Centro Notifiche</p>
        <h1 className="text-4xl font-bold text-secondary">Centro Notifiche</h1>
      </div>

      <div className="flex gap-3">
        <button
          onClick={markAllAsRead}
          disabled={unreadCount === 0}
          className="flex-1 px-4 py-3 text-sm font-semibold text-white bg-secondary rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:opacity-40"
        >
          <CheckCheck className="h-4 w-4" />
          Segna tutte come lette
        </button>
        {userRole !== "atleta" && (
          <button
            onClick={() => toast.info("Funzionalità in arrivo")}
            className="flex-1 px-4 py-3 text-sm font-semibold text-secondary bg-white border border-black/10 rounded-lg hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
          >
            <Send className="h-4 w-4" />
            Invia Notifica
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 w-full">
        <div className="flex items-center gap-2 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
            <input
              type="text"
              placeholder="Cerca per titolo o messaggio..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 w-full pl-10 pr-4 rounded-lg bg-white border border-black/10 text-secondary placeholder-secondary/40 focus:outline-none focus:ring-0 focus:border-black/10"
            />
          </div>
          <button
            type="button"
            onClick={() => setIsFilterPanelOpen((prev) => !prev)}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-lg border transition-colors ${
              hasActiveFilters || isFilterPanelOpen
                ? "border-secondary bg-secondary text-white hover:opacity-90"
                : "border-black/10 bg-white text-secondary hover:bg-gray-50"
            }`}
            aria-label="Mostra o nascondi filtri"
            title="Filtri"
          >
            <SlidersHorizontal className="h-5 w-5" />
          </button>
        </div>

        {isFilterPanelOpen && (
          <div className="w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex min-w-max items-center gap-2 sm:min-w-0 sm:w-full">
              <div className="flex items-center gap-2 sm:flex-1 sm:min-w-0">
                {(["all", "unread", "read"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    className={`h-11 shrink-0 rounded-lg border px-3 text-sm font-semibold transition-colors sm:flex-1 sm:min-w-0 ${
                      filter === f
                        ? "border-secondary bg-secondary text-white"
                        : "border-black/10 bg-white text-secondary hover:bg-gray-50"
                    }`}
                  >
                    {f === "all" ? "Tutte" : f === "unread" ? "Non lette" : "Lette"}
                    {f === "unread" && unreadCount > 0 && (
                      <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${filter === f ? "bg-white/20" : "bg-secondary/10"}`}>
                        {unreadCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setFilter("all");
                }}
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[#023047] bg-[#023047] text-white hover:opacity-90 transition-colors"
                aria-label="Reset filtri"
                title="Reset filtri"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-secondary" />
          <p className="mt-4 text-secondary/60">Caricamento notifiche...</p>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="text-center py-20 rounded-lg bg-white">
          <Bell className="w-16 h-16 mx-auto text-secondary/20 mb-4" />
          <h3 className="text-xl font-semibold text-secondary mb-2">Nessuna notifica</h3>
          <p className="text-secondary/60">
            {hasActiveFilters
              ? "Nessun risultato per la ricerca o i filtri selezionati"
              : "Non hai ancora ricevuto notifiche"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredNotifications.map((n) => {
            const link = resolveLink(n);
            return (
              <div
                key={n.id}
                className={`rounded-lg overflow-visible transition-opacity ${link ? "cursor-pointer hover:opacity-95" : ""}`}
                style={{ background: getNotificationColor(n) }}
                onClick={() => {
                  if (!n.is_read) markAsRead(n.id);
                  if (link) router.push(link);
                }}
              >
                <div className="flex items-center gap-4 py-3 px-3">
                  <div className="flex items-center justify-center bg-white/10 rounded-lg w-11 h-11 flex-shrink-0">
                    {getNotificationIcon(n)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm truncate ${n.is_read ? "text-white/80" : "text-white"}`}>{n.title}</p>
                    <p className="text-xs text-white/70 mt-0.5 truncate">{n.message}</p>
                  </div>
                  <span className="text-[10px] font-semibold text-white/70 flex-shrink-0 uppercase tracking-wide hidden sm:block">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: it })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
