"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarClock, Search, SlidersHorizontal } from "lucide-react";

export interface UpcomingBooking {
  id: string;
  court: string;
  user_id: string;
  coach_id: string | null;
  start_time: string;
  end_time: string;
  status: string;
  type: string;
  notes: string | null;
  isCourse?: boolean;
  user_profile?: { full_name: string } | null;
  coach_profile?: { full_name: string } | null;
  participants?: Array<{ full_name: string; user_id?: string | null }>;
}

const TYPE_LABELS: Record<string, string> = {
  lezione_privata: "Lezione privata",
  lezione_gruppo: "Lezione gruppo",
  campo: "Campo",
  lezione: "Lezione",
  arena: "Match Arena",
  corso: "Corso",
};

function getItemBg(item: UpcomingBooking, currentUserId?: string): string {
  if (item.isCourse) return "#075985";
  const isCoach = item.coach_id === currentUserId;
  if (isCoach) {
    switch (item.type) {
      case "lezione_privata":
      case "lezione_gruppo":
      case "lezione":
        return "#023047";
      case "campo":
        return "var(--color-frozen-lake-600)";
      case "arena":
        return "var(--color-frozen-lake-600)";
      default:
        return "#023047";
    }
  }
  switch (item.type) {
    case "lezione_privata":
    case "lezione_gruppo":
    case "lezione":
      return "var(--color-frozen-lake-900)";
    case "campo":
      return "var(--secondary)";
    case "arena":
      return "var(--color-frozen-lake-600)";
    default:
      return "var(--secondary)";
  }
}

const TYPE_OPTIONS = [
  { value: "tutti", label: "Tutti" },
  { value: "lezione_privata", label: "Lezione privata" },
  { value: "lezione_gruppo", label: "Lezione gruppo" },
  { value: "corso", label: "Corso" },
  { value: "campo", label: "Campo" },
  { value: "arena", label: "Match Arena" },
];

export function UpcomingCommitmentsCard({
  bookings,
  currentUserId,
  basePath = "/dashboard/maestro",
}: {
  bookings: UpcomingBooking[];
  currentUserId?: string;
  basePath?: string;
}) {
  const [upcomingSearch, setUpcomingSearch] = useState("");
  const [upcomingTypeFilter, setUpcomingTypeFilter] = useState("tutti");
  const [upcomingFilterOpen, setUpcomingFilterOpen] = useState(false);

  const searchLower = upcomingSearch.toLowerCase();
  const filtered = bookings.filter((item) => {
    if (upcomingTypeFilter !== "tutti") {
      const itemType = item.isCourse ? "corso" : item.type;
      if (itemType !== upcomingTypeFilter) return false;
    }
    if (searchLower) {
      const participantNames = (item.participants ?? []).map((p) => p.full_name).join(" ").toLowerCase();
      const name = item.isCourse
        ? (item.notes || "").toLowerCase()
        : [
            item.user_profile?.full_name || "",
            item.coach_profile?.full_name || "",
            participantNames,
          ].join(" ").toLowerCase();
      const court = (item.court || "").toLowerCase();
      if (!name.includes(searchLower) && !court.includes(searchLower)) return false;
    }
    return true;
  });

  const hasActiveFilters = upcomingTypeFilter !== "tutti";
  const timeStr = (t: string) =>
    new Date(t).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
        <h2 className="text-base sm:text-lg font-semibold text-secondary">Prossimi impegni</h2>
      </div>
      <div className="px-6 pt-4 pb-3 flex flex-col gap-3">
        <div className="flex items-center gap-2 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
            <input
              type="text"
              placeholder="Cerca per nome, corso o campo..."
              value={upcomingSearch}
              onChange={(e) => setUpcomingSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-md bg-white border border-gray-200 text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20"
            />
          </div>
          <button
            type="button"
            onClick={() => setUpcomingFilterOpen((v) => !v)}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-md border transition-colors ${
              hasActiveFilters
                ? "border-secondary bg-secondary text-white hover:opacity-90"
                : "border-gray-200 bg-white text-secondary hover:border-gray-300 hover:bg-gray-50"
            }`}
            aria-label="Filtri"
            title="Filtri"
          >
            <SlidersHorizontal className="h-5 w-5" />
          </button>
        </div>
        {upcomingFilterOpen && (
          <div className="flex flex-wrap gap-2 pb-1">
            {TYPE_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setUpcomingTypeFilter(o.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  upcomingTypeFilter === o.value
                    ? "bg-secondary text-white border-secondary"
                    : "bg-white text-secondary border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="px-6 pb-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-secondary/40">
            <CalendarClock className="h-8 w-8 mb-2" />
            <p className="text-sm font-medium">
              {bookings.length === 0 ? "Nessun impegno in arrivo" : "Nessun risultato"}
            </p>
          </div>
        ) : (
          <ul
            className="flex flex-col gap-2 overflow-y-auto scrollbar-hide"
            style={{ maxHeight: "390px" }}
          >
            {filtered.map((item) => {
              const start = new Date(item.start_time);

              if (item.isCourse) {
                return (
                  <li key={`course-${item.id}-${item.start_time}`}>
                    <Link
                      href={`${basePath}/corsi/${item.id}`}
                      className="flex items-center gap-4 py-3.5 px-3 rounded-lg hover:opacity-90 transition-opacity"
                      style={{ background: "#075985" }}
                    >
                      <div className="flex flex-col items-center justify-center bg-white/10 rounded-lg w-11 py-1.5 flex-shrink-0">
                        <span className="text-[10px] uppercase font-bold text-white/70 leading-none">
                          {start.toLocaleDateString("it-IT", { month: "short" }).replace(".", "")}
                        </span>
                        <span className="text-lg font-bold text-white leading-none mt-0.5 tabular-nums">
                          {start.getDate()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-sm truncate">{item.notes || "Corso"}</p>
                        <p className="text-xs text-white/70 mt-0.5">
                          {timeStr(item.start_time)}–{timeStr(item.end_time)}
                          {item.court ? ` · ${item.court}` : ""}
                        </p>
                      </div>
                      <span className="text-[10px] font-semibold text-white/70 flex-shrink-0 uppercase tracking-wide">
                        Corso
                      </span>
                    </Link>
                  </li>
                );
              }

              const participantNames = (item.participants ?? [])
                .filter((p) => !p.user_id || p.user_id !== currentUserId)
                .map((p) => p.full_name)
                .filter(Boolean);
              const counterpart =
                participantNames.length > 0
                  ? participantNames.join(", ")
                  : item.coach_id === currentUserId
                  ? item.user_profile?.full_name || "Impegno"
                  : item.coach_profile?.full_name || item.user_profile?.full_name || "Impegno";
              const typeLabel = TYPE_LABELS[item.type] || item.type.replace(/_/g, " ");
              const typeBg = getItemBg(item, currentUserId);

              return (
                <li key={item.id}>
                  <Link
                    href={`${basePath}/bookings/${item.id}`}
                    className="flex items-center gap-4 py-3.5 px-3 rounded-lg hover:opacity-90 transition-opacity"
                    style={{ background: typeBg }}
                  >
                    <div className="flex flex-col items-center justify-center bg-white/10 rounded-lg w-11 py-1.5 flex-shrink-0">
                      <span className="text-[10px] uppercase font-bold text-white/70 leading-none">
                        {start.toLocaleDateString("it-IT", { month: "short" }).replace(".", "")}
                      </span>
                      <span className="text-lg font-bold text-white leading-none mt-0.5 tabular-nums">
                        {start.getDate()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm truncate">{counterpart}</p>
                      <p className="text-xs text-white/70 mt-0.5">
                        {timeStr(item.start_time)}–{timeStr(item.end_time)} · {item.court}
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold text-white/70 flex-shrink-0 uppercase tracking-wide">
                      {typeLabel}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
