"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarClock, Search, SlidersHorizontal } from "lucide-react";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui";

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
  if (item.isCourse) return "var(--color-frozen-lake-900)";
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
      return "#023047";
    case "campo":
      return "var(--secondary)";
    case "arena":
      return "var(--color-frozen-lake-600)";
    default:
      return "var(--secondary)";
  }
}

const TYPE_OPTIONS = [
  { value: "all", label: "Tutti i tipi" },
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
  title = "Prossimi impegni",
  showFilterButton = true,
}: {
  bookings: UpcomingBooking[];
  currentUserId?: string;
  basePath?: string;
  title?: string;
  showFilterButton?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterUser, setFilterUser] = useState("all");
  const [filterCoach, setFilterCoach] = useState("all");
  const [filterCourt, setFilterCourt] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const userOptions = Array.from(
    new Set(
      bookings.flatMap((b) => {
        if (b.isCourse) return [];
        const names = (b.participants ?? []).map((p) => p.full_name).filter(Boolean);
        if (names.length > 0) return names;
        return b.user_profile?.full_name ? [b.user_profile.full_name] : [];
      })
    )
  ).sort((a, b) => a.localeCompare(b, "it"));

  const coachOptions = Array.from(
    new Set(
      bookings
        .map((b) => b.coach_profile?.full_name?.trim())
        .filter((n): n is string => Boolean(n))
    )
  ).sort((a, b) => a.localeCompare(b, "it"));

  const courtOptions = Array.from(
    new Set(bookings.map((b) => b.court).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, "it"));

  const hasActiveFilters =
    filterType !== "all" ||
    filterUser !== "all" ||
    filterCoach !== "all" ||
    filterCourt !== "all" ||
    Boolean(filterDateFrom) ||
    Boolean(filterDateTo);

  const searchLower = search.toLowerCase();

  const filtered = bookings.filter((item) => {
    const itemType = item.isCourse ? "corso" : item.type;
    if (filterType !== "all" && itemType !== filterType) return false;
    if (filterCourt !== "all" && item.court !== filterCourt) return false;
    const itemDateStr = item.start_time.slice(0, 10);
    if (filterDateFrom && itemDateStr < filterDateFrom) return false;
    if (filterDateTo && itemDateStr > filterDateTo) return false;
    if (filterUser !== "all" && !item.isCourse) {
      const names = (item.participants ?? []).map((p) => p.full_name);
      const primary = names.length > 0 ? names.join(", ") : item.user_profile?.full_name ?? "";
      if (primary !== filterUser) return false;
    }
    if (filterCoach !== "all" && (item.coach_profile?.full_name ?? "") !== filterCoach) return false;
    if (searchLower) {
      const participantNames = (item.participants ?? []).map((p) => p.full_name).join(" ").toLowerCase();
      const name = item.isCourse
        ? (item.notes || "").toLowerCase()
        : [item.user_profile?.full_name || "", item.coach_profile?.full_name || "", participantNames]
            .join(" ")
            .toLowerCase();
      const court = (item.court || "").toLowerCase();
      if (!name.includes(searchLower) && !court.includes(searchLower)) return false;
    }
    return true;
  });

  const timeStr = (t: string) =>
    new Date(t).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });

  function resetFilters() {
    setFilterType("all");
    setFilterUser("all");
    setFilterCoach("all");
    setFilterCourt("all");
    setFilterDateFrom("");
    setFilterDateTo("");
  }

  return (
    <div className="bg-white rounded-lg border border-black/10 overflow-hidden">
      <div className="px-6 py-4 border-b border-black/10 bg-gradient-to-r from-secondary/5 to-transparent">
        <h2 className="text-base sm:text-lg font-semibold text-secondary">{title}</h2>
      </div>
      <div className="px-6 pt-4 pb-3 flex items-center gap-2 w-full">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
          <input
            type="text"
            placeholder="Cerca per nome, corso o campo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-md bg-white border border-gray-200 text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20"
          />
        </div>
        {showFilterButton && (
          <button
            type="button"
            onClick={() => setIsFilterModalOpen(true)}
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
                      style={{ background: "var(--color-frozen-lake-900)" }}
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

      {/* Filter modal */}
      <Modal open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
        <ModalContent
          size="md"
          showBuiltinClose={false}
          className="overflow-hidden rounded-lg !border-gray-200 shadow-xl !bg-white dark:!bg-white dark:!border-gray-200"
        >
          <ModalHeader withCloseButton closeButtonClassName="text-white/70 hover:text-white hover:bg-white/10" className="px-4 py-3 bg-secondary border-b border-secondary dark:!border-secondary">
            <ModalTitle className="text-white text-lg">Filtra Prenotazioni</ModalTitle>
          </ModalHeader>

          <ModalBody className="px-4 py-4 bg-white dark:!bg-white space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-secondary/70">Tipo</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
              >
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {userOptions.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-secondary/70">Utente</label>
                <select
                  value={filterUser}
                  onChange={(e) => setFilterUser(e.target.value)}
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                >
                  <option value="all">Tutti gli utenti</option>
                  {userOptions.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            )}

            {coachOptions.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-secondary/70">Maestro</label>
                <select
                  value={filterCoach}
                  onChange={(e) => setFilterCoach(e.target.value)}
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                >
                  <option value="all">Tutti i maestri</option>
                  {coachOptions.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            )}

            {courtOptions.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-secondary/70">Campo</label>
                <select
                  value={filterCourt}
                  onChange={(e) => setFilterCourt(e.target.value)}
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                >
                  <option value="all">Tutti i campi</option>
                  {courtOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-secondary/70">Data da</label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-secondary/70">Data a</label>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                />
              </div>
            </div>
          </ModalBody>

          <ModalFooter className="px-7! py-3! border-t border-gray-200 bg-white dark:!bg-white dark:!border-gray-200">
            <button
              type="button"
              onClick={resetFilters}
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
