"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  AlertCircle,
  Bell,
  Calendar,
  CalendarClock,
  CheckCircle,
  Info,
  MessageSquare,
  Search,
  SlidersHorizontal,
  Trophy,
  User,
  Users,
  Video,
  XCircle,
} from "lucide-react";
import {
  formatLongItalianDate,
  formatShortItalianDate,
} from "@/lib/utils/formatItalianDate";
import {
  useNotifications,
  type DashboardNotification,
} from "@/lib/hooks/useNotifications";
import {
  getMessageNotificationLink,
  resolveDashboardLinkForRole,
} from "@/lib/notifications/links";
import { supabase } from "@/lib/supabase/client";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui";

const NOTIFICATION_MODAL_TYPE_LABELS: Record<string, string> = {
  booking: "Prenotazione",
  tournament: "Torneo",
  message: "Messaggio",
  course: "Corso",
  success: "Successo",
  warning: "Avviso",
  error: "Errore",
};

const USER_NAME_STOPWORDS = new Set([
  "il",
  "lo",
  "la",
  "i",
  "gli",
  "le",
  "un",
  "una",
  "nuovo",
  "nuova",
  "nuove",
  "notifica",
  "prenotazione",
  "torneo",
  "messaggio",
  "corso",
  "successo",
  "avviso",
  "errore",
  "campo",
]);

interface NotificationsListProps {
  limit?: number;
  showHeader?: boolean;
  showSearch?: boolean;
  showTableHeader?: boolean;
  maxVisibleRows?: number;
}

function getNotificationIcon(type: string, title?: string, message?: string, white?: boolean) {
  const cls = white ? "h-6 w-6 text-white" : "h-5 w-5 text-secondary/60";
  const sw = white ? 2.5 : 2;
  const text = `${title || ""} ${message || ""}`.toLowerCase();
  if (type === "video" || text.includes("video")) {
    return <Video className={cls} strokeWidth={sw} />;
  }

  switch (type) {
    case "booking": {
      if (text.includes("lezione")) return <Users className={cls} strokeWidth={sw} />;
      return <CalendarClock className={cls} strokeWidth={sw} />;
    }
    case "tournament":
      return <Trophy className={cls} strokeWidth={sw} />;
    case "message":
      return <MessageSquare className={cls} strokeWidth={sw} />;
    case "course":
      return <Users className={cls} strokeWidth={sw} />;
    case "success":
      return <CheckCircle className={cls} strokeWidth={sw} />;
    case "warning":
      return <AlertCircle className={cls} strokeWidth={sw} />;
    case "error":
      return <XCircle className={cls} strokeWidth={sw} />;
    default:
      return <Info className={cls} strokeWidth={sw} />;
  }
}

export default function NotificationsList({
  limit = 6,
  showHeader = true,
  showSearch = false,
  showTableHeader = false,
  maxVisibleRows,
}: NotificationsListProps) {
  const router = useRouter();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications(limit);
  const [selected, setSelected] = useState<DashboardNotification | null>(null);
  const [search, setSearch] = useState("");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [readFilter, setReadFilter] = useState<"all" | "unread" | "read">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  const notificationTypes = Array.from(new Set(notifications.map((n) => n.type))).sort();
  const hasActiveFilters = readFilter !== "all" || typeFilter !== "all" || userFilter.trim().length > 0;

  useEffect(() => {
    async function loadRole() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role) {
        setCurrentUserRole(profile.role);
      }
    }

    void loadRole();
  }, []);

  const filteredNotifications = notifications.filter((n) => {
    const query = search.trim().toLowerCase();
    const userQuery = userFilter.trim().toLowerCase();
    const searchableText = `${n.title} ${n.message} ${formatShortItalianDate(n.created_at)}`.toLowerCase();
    if (query && !searchableText.includes(query)) return false;
    if (userQuery) {
      const userText = `${n.title} ${n.message}`.toLowerCase();
      if (!userText.includes(userQuery)) return false;
    }
    if (readFilter === "unread" && n.is_read) return false;
    if (readFilter === "read" && !n.is_read) return false;
    if (typeFilter !== "all" && n.type !== typeFilter) return false;
    return true;
  });
  const sortedNotifications = [...filteredNotifications].sort((a, b) => {
    const aTs = new Date(a.created_at).getTime();
    const bTs = new Date(b.created_at).getTime();
    return bTs - aTs;
  });

  function handleClick(n: DashboardNotification) {
    setSelected(n);
    if (!n.is_read) void markRead(n.id);
  }

  function buildBookingSearchLink(message: string): string | null {
    const bookingPattern = /campo\s+(.+?)\s+per\s+il\s+(\d{2}\/\d{2}\/\d{4})\s+alle\s+(\d{2}:\d{2})/i;
    const batchBookingPattern = /sul\s+(.+?)\s+a partire dal\s+(\d{2}\/\d{2}\/\d{4})\s+alle\s+(\d{2}:\d{2})/i;

    const bookingMatch = message.match(bookingPattern) || message.match(batchBookingPattern);
    if (!bookingMatch) {
      return null;
    }

    const [, court, date, time] = bookingMatch;
    const params = new URLSearchParams({
      search: `${court} ${date} ${time}`,
    });

    return `/dashboard/admin/bookings?${params.toString()}`;
  }

  function getFallbackSectionLink(notification: DashboardNotification): string {
    const normalizedRole = String(currentUserRole || "").toLowerCase();

    if (notification.type === "message") {
      return getMessageNotificationLink(currentUserRole);
    }

    if (notification.type === "booking") {
      if (normalizedRole === "atleta") return "/dashboard/atleta/bookings";
      if (normalizedRole === "maestro") return "/dashboard/maestro/bookings";
      return "/dashboard/admin/bookings";
    }

    if (notification.type === "tournament") {
      if (normalizedRole === "atleta") return "/dashboard/atleta/tornei";
      if (normalizedRole === "maestro") return "/dashboard/maestro/tornei";
      return "/dashboard/admin/tornei";
    }

    if (normalizedRole === "atleta") return "/dashboard/atleta";
    if (normalizedRole === "maestro") return "/dashboard/maestro";
    return "/dashboard/admin";
  }

  function resolveNotificationTarget(notification: DashboardNotification): string {
    if (notification.type === "message" && currentUserRole) {
      return getMessageNotificationLink(currentUserRole);
    }

    let targetLink = notification.action_url || notification.link || null;

    if (notification.type === "booking" && targetLink === "/dashboard/admin/bookings") {
      const bookingSearchLink = buildBookingSearchLink(notification.message);
      if (bookingSearchLink) {
        targetLink = bookingSearchLink;
      }
    }

    const resolved = resolveDashboardLinkForRole(targetLink, currentUserRole);
    return resolved || getFallbackSectionLink(notification);
  }

  function goToNotificationSection() {
    if (!selected) return;
    const target = resolveNotificationTarget(selected);
    setSelected(null);
    router.push(target);
  }

  function extractInterestedUsers(notification: DashboardNotification): string {
    const text = `${notification.title} ${notification.message}`;
    const namePattern = /\b([A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ']+(?:\s+[A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ']+)+)\b/g;
    const names = new Set<string>();

    let match: RegExpExecArray | null;
    while ((match = namePattern.exec(text)) !== null) {
      const candidate = match[1].trim();
      const firstWord = candidate.split(/\s+/)[0]?.toLowerCase() || "";
      if (USER_NAME_STOPWORDS.has(firstWord)) continue;
      names.add(candidate);
    }

    if (names.size === 0) {
      return "Sistema";
    }

    return Array.from(names).slice(0, 3).join(", ");
  }

  return (
    <div className="space-y-3">
      {showHeader && (
        <div className="flex items-center justify-between px-1">
          <h3 className="text-2xl sm:text-3xl font-bold text-secondary">Centro Notifiche</h3>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs font-semibold text-secondary hover:opacity-80 flex items-center gap-1"
            >
              <CheckCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Segna tutte come lette</span> ({unreadCount})
            </button>
          )}
        </div>
      )}

      {showSearch && (
        <div className="flex items-center gap-2 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
            <input
              type="text"
              placeholder="Cerca per titolo, messaggio o data..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-md bg-white border border-gray-200 text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20"
            />
          </div>
          <button
            type="button"
            onClick={() => setIsFilterModalOpen(true)}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-md border transition-colors ${
              hasActiveFilters
                ? "border-secondary bg-secondary text-white hover:opacity-90"
                : "border-gray-200 bg-white text-secondary hover:border-gray-300 hover:bg-gray-50"
            }`}
            aria-label="Apri filtri notifiche"
            title="Filtri"
          >
            <SlidersHorizontal className="h-5 w-5" />
          </button>
        </div>
      )}

      {notifications.length === 0 ? (
        <div className="text-center py-6">
          <Bell className="h-5 w-5 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Nessuna notifica</p>
        </div>
      ) : sortedNotifications.length === 0 ? (
        <div className="text-center py-6">
          <Bell className="h-5 w-5 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Nessuna notifica trovata</p>
        </div>
      ) : (
        <div>
          <ul
            className={maxVisibleRows ? "overflow-y-auto scrollbar-hide space-y-2" : "space-y-2"}
            style={maxVisibleRows ? { maxHeight: `${maxVisibleRows * 78}px`, scrollbarWidth: "none", msOverflowStyle: "none" } : undefined}
          >
            {sortedNotifications.map((n) => {
              const typeColorMap: Record<string, string> = {
                booking: "var(--secondary)",
                tournament: "#6d28d9",
                message: "#0369a1",
                success: "#15803d",
                warning: "#b45309",
                error: "#b91c1c",
              };
              const typeLabelMap: Record<string, string> = {
                booking: "Prenotazione",
                tournament: "Torneo",
                message: "Messaggio",
                success: "Successo",
                warning: "Avviso",
                error: "Errore",
              };
              const isLezione = n.type === "booking" && `${n.title || ""} ${n.message || ""}`.toLowerCase().includes("lezione");
              const bg = isLezione ? "#023047" : (typeColorMap[n.type] ?? "var(--secondary)");
              const typeLabel = typeLabelMap[n.type] ?? n.type;
              const notifDate = new Date(n.created_at);
              const users = extractInterestedUsers(n);
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    className="w-full text-left rounded-lg bg-white border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all"
                    style={{}}
                    onClick={() => handleClick(n)}
                  >
                    <div className="flex items-center gap-4 py-3 px-3">
                      <div className="flex items-center justify-center rounded-lg w-11 h-11 flex-shrink-0" style={{ background: bg }}>
                        {getNotificationIcon(n.type, n.title, n.message, true)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-secondary text-sm truncate">{n.title}</p>
                          {!n.is_read && (
                            <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold flex-shrink-0 text-white" style={{ background: bg }}>
                              Nuova
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-secondary/60 mt-0.5 truncate">
                          {notifDate.toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" }).replace(".", "").replace(/([a-z])/i, (c) => c.toUpperCase())}
                          {users !== "Sistema" ? ` · ${users}` : ""}
                        </p>
                      </div>
                                          </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <Modal open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <ModalContent size="md" className="overflow-hidden rounded-lg !border-gray-200 shadow-xl !bg-white dark:!bg-white dark:!border-gray-200 [&>button]:text-white/80 [&>button:hover]:text-white [&>button:hover]:bg-white/10">
          <ModalHeader className="px-4 py-3 bg-secondary border-b border-gray-200 dark:!border-gray-200">
            <ModalTitle className="text-white text-lg">Dettaglio Notifica</ModalTitle>
            <ModalDescription className="text-white/80 text-xs">
              Informazioni complete della notifica selezionata.
            </ModalDescription>
          </ModalHeader>

          <ModalBody className="px-0 py-0 bg-white dark:!bg-white">
            {selected && (
              <div className="text-sm bg-white dark:!bg-white divide-y divide-gray-200">
                <div className="px-4 py-3 bg-white">
                  <div className="flex gap-3 items-center">
                    {getNotificationIcon(selected.type, selected.title, selected.message)}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{selected.title}</p>
                    </div>
                  </div>
                </div>

                <div className="px-4 py-3 grid grid-cols-[95px_1fr] gap-2 bg-white">
                  <span className="text-xs font-semibold text-gray-900">Data</span>
                  <span className="text-xs text-gray-600">{formatLongItalianDate(selected.created_at)}</span>
                </div>
                <div className="px-4 py-3 grid grid-cols-[95px_1fr] gap-2 bg-white">
                  <span className="text-xs font-semibold text-gray-900">Tipo</span>
                  <span className="text-xs text-gray-600">{NOTIFICATION_MODAL_TYPE_LABELS[selected.type] || selected.type}</span>
                </div>
                <div className="px-4 py-3 grid grid-cols-[95px_1fr] gap-2 bg-white">
                  <span className="text-xs font-semibold text-gray-900">Messaggio</span>
                  <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">{selected.message}</p>
                </div>
              </div>
            )}
          </ModalBody>

          <ModalFooter className="p-0 border-t border-gray-200 bg-white dark:!bg-white dark:!border-gray-200">
            <button
              type="button"
              onClick={goToNotificationSection}
              className="w-full py-3 bg-secondary text-white font-semibold hover:opacity-90 transition-opacity rounded-b-lg"
            >
              Dettagli
            </button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
        <ModalContent
          size="md"
          className="overflow-hidden rounded-lg !border-gray-200 shadow-xl !bg-white dark:!bg-white dark:!border-gray-200"
        >
          <ModalHeader className="px-4 py-3 bg-secondary border-b border-gray-200 dark:!border-gray-200">
            <ModalTitle className="text-white text-lg">Filtra Notifiche</ModalTitle>
            <ModalDescription className="text-white/80 text-xs">
              Seleziona i criteri per visualizzare le notifiche.
            </ModalDescription>
          </ModalHeader>

          <ModalBody className="px-4 py-4 bg-white dark:!bg-white space-y-4">
            <div className="space-y-1">
              <label htmlFor="notifications-user-filter" className="text-xs font-semibold uppercase tracking-wide text-secondary/70">
                Utente
              </label>
              <input
                id="notifications-user-filter"
                type="text"
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                placeholder="Es. Mario Rossi"
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="notifications-read-filter" className="text-xs font-semibold uppercase tracking-wide text-secondary/70">
                Stato
              </label>
              <select
                id="notifications-read-filter"
                value={readFilter}
                onChange={(e) => setReadFilter(e.target.value as "all" | "unread" | "read")}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
              >
                <option value="all">Tutte</option>
                <option value="unread">Solo non lette</option>
                <option value="read">Solo lette</option>
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="notifications-type-filter" className="text-xs font-semibold uppercase tracking-wide text-secondary/70">
                Tipo
              </label>
              <select
                id="notifications-type-filter"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
              >
                <option value="all">Tutti i tipi</option>
                {notificationTypes.map((type) => (
                  <option key={type} value={type}>
                    {NOTIFICATION_MODAL_TYPE_LABELS[type] || type}
                  </option>
                ))}
              </select>
            </div>
          </ModalBody>

          <ModalFooter className="p-0 border-t border-gray-200 bg-white dark:!bg-white dark:!border-gray-200">
            <button
              type="button"
              onClick={() => {
                setReadFilter("all");
                setTypeFilter("all");
                setUserFilter("");
              }}
              className="w-1/2 py-3 border-r border-gray-200 text-secondary font-semibold hover:bg-gray-50 transition-colors"
            >
              Rimuovi filtri
            </button>
            <button
              type="button"
              onClick={() => setIsFilterModalOpen(false)}
              className="w-1/2 py-3 bg-secondary text-white font-semibold hover:opacity-90 transition-opacity rounded-br-lg"
            >
              Applica
            </button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
