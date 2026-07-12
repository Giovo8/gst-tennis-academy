"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  Plus,
  Search,
  Loader2,
  Pencil,
  Trash2,
  SlidersHorizontal,
  ArrowUpDown,
  X,
  MoreVertical,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

type SchedulePeriod = { days: string[]; time: string | null; court?: string | null; start_date?: string | null; end_date?: string | null };

type Course = {
  id: string;
  name: string;
  description: string | null;
  max_participants: number;
  price_per_month: number;
  schedule_days: string[] | null;
  schedule_time: string | null;
  instructor_name: string | null;
  court_name: string | null;
  schedule_periods: SchedulePeriod[] | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
};

const DAYS: Record<string, string> = {
  lun: "Lun", mar: "Mar", mer: "Mer", gio: "Gio",
  ven: "Ven", sab: "Sab", dom: "Dom",
};

function localDateStr(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CorsiAdminPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("active");
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    loadCourses();
  }, []);

  async function loadCourses() {
    setLoading(true);
    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setCourses(data as Course[]);
    setLoading(false);
  }

  async function handleDelete(course: Course) {
    if (!confirm(`Sei sicuro di voler eliminare il corso "${course.name}"?`)) return;
    const { error } = await supabase.from("courses").delete().eq("id", course.id);
    if (error) toast.error("Errore: " + error.message);
    else setCourses((prev) => prev.filter((c) => c.id !== course.id));
  }

  async function toggleActive(course: Course) {
    const { error } = await supabase
      .from("courses")
      .update({ is_active: !course.is_active })
      .eq("id", course.id);
    if (!error)
      setCourses((prev) =>
        prev.map((c) => (c.id === course.id ? { ...c, is_active: !c.is_active } : c))
      );
  }

  const closeMenu = () => { setOpenMenuId(null); setMenuPosition(null); };

  const openMenu = (id: string, rect: DOMRect) => {
    const menuWidth = 176;
    const menuHeight = 120;
    const pad = 8;
    let left = rect.right - menuWidth;
    left = Math.max(pad, Math.min(left, window.innerWidth - menuWidth - pad));
    let top = rect.bottom + 6;
    if (top + menuHeight > window.innerHeight - pad) top = Math.max(pad, rect.top - menuHeight - 6);
    setOpenMenuId(id);
    setMenuPosition({ top, left });
  };

  const hasActiveFilters = filterActive !== "active";

  const hasUpcomingLessons = (course: Course): boolean => {
    const todayStr = localDateStr(new Date());

    if (course.schedule_periods?.length) {
      const hasFuturePeriod = course.schedule_periods.some((period) => {
        if (!period.end_date) return true;
        return period.end_date >= todayStr;
      });
      if (hasFuturePeriod) return true;
    }

    if (course.end_date) {
      return course.end_date >= todayStr;
    }

    return Boolean(course.is_active);
  };

  const filtered = courses
    .filter((c) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !search ||
        c.name.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.instructor_name?.toLowerCase().includes(q) ||
        c.court_name?.toLowerCase().includes(q);
      const matchesActive =
        filterActive === "all" ||
        (filterActive === "active" && hasUpcomingLessons(c)) ||
        (filterActive === "inactive" && !hasUpcomingLessons(c));
      return matchesSearch && matchesActive;
    })
    .sort((a, b) => {
      const byCreatedAt = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortOrder === "asc" ? byCreatedAt : -byCreatedAt;
    });

  return (
    <div className="space-y-6 pt-3">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <h1 className="text-4xl font-bold text-secondary">Corsi</h1>
        <Link
          href="/dashboard/admin/corsi/new"
          className="w-full px-4 py-3 text-sm font-semibold text-white bg-secondary rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Nuovo Corso
        </Link>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col gap-3 w-full">
        <div className="flex items-center gap-2 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
            <input
              type="text"
              placeholder="Cerca per nome, maestro o campo..."
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
            <button
              type="button"
              onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
              className={`inline-flex h-11 w-11 items-center justify-center rounded-lg border transition-colors ${
                sortOrder === "desc"
                  ? "border-[#023047] bg-[#023047] text-white hover:opacity-90"
                  : "border-black/10 bg-white text-secondary hover:bg-gray-50"
              }`}
              aria-label="Inverti ordinamento"
              title="Inverti ordinamento"
            >
              <ArrowUpDown className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2 sm:flex-1 sm:min-w-0">
              {[
                { value: "all", label: "Tutti" },
                { value: "active", label: "Attivi" },
                { value: "inactive", label: "Inattivi" },
              ].map((option) => {
                const isSelected = filterActive === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFilterActive(option.value as "all" | "active" | "inactive")}
                    className={`h-11 shrink-0 rounded-lg border px-3 text-sm font-semibold transition-colors sm:flex-1 sm:min-w-0 ${
                      isSelected
                        ? "border-secondary bg-secondary text-white"
                        : "border-black/10 bg-white text-secondary hover:bg-gray-50"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setFilterActive("active");
                setSortOrder("desc");
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

      {/* List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-secondary" />
          <p className="mt-3 text-gray-600">Caricamento corsi...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 rounded-lg bg-white">
          <GraduationCap className="w-16 h-16 mx-auto text-secondary/20 mb-4" />
          <h3 className="text-xl font-semibold text-secondary mb-2">
            {search || hasActiveFilters ? "Nessun corso trovato" : "Nessun corso presente"}
          </h3>
          <p className="text-secondary/60 mb-6">
            {search || hasActiveFilters ? "Prova a modificare i filtri" : "Crea il primo corso per iniziare"}
          </p>
          {!search && !hasActiveFilters && (
            <Link
              href="/dashboard/admin/corsi/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-secondary hover:opacity-90 text-white font-medium rounded-lg transition-opacity"
            >
              <Plus className="h-5 w-5" />
              Nuovo Corso
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((course) => {
            const days = (course.schedule_days ?? []).map((d) => DAYS[d] ?? d).join(", ");
            const subtitle = course.instructor_name ?? null;
            const isInactiveCourse = !hasUpcomingLessons(course);

            return (
              <div
                key={course.id}
                className="rounded-lg overflow-visible cursor-pointer transition-all hover:opacity-95 hover:shadow-[0_0_18px_rgba(8,179,247,0.35)]"
                style={{ background: isInactiveCourse ? "#9ca3af" : "var(--color-frozen-lake-900)" }}
                onClick={() => router.push(`/dashboard/admin/corsi/${course.id}`)}
              >
                <div className="flex items-center gap-4 py-3 px-3">
                  <div className="flex items-center justify-center bg-white/10 rounded-lg w-11 h-11 flex-shrink-0">
                    <GraduationCap className="h-5 w-5 text-white" strokeWidth={2} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm truncate">{course.name}</p>
                    {subtitle && (
                      <p className="text-xs text-white/70 mt-0.5 truncate">{subtitle}</p>
                    )}
                  </div>

                  <div className="relative flex items-center justify-center flex-shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (openMenuId === course.id) { closeMenu(); return; }
                        openMenu(course.id, e.currentTarget.getBoundingClientRect());
                      }}
                      className="inline-flex items-center justify-center p-2.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-all focus:outline-none touch-manipulation min-w-[40px] min-h-[40px]"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </button>
                    {openMenuId === course.id && menuPosition && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); closeMenu(); }} />
                        <div
                          className="fixed z-50 w-44 bg-white rounded-lg shadow-lg border border-black/10 py-1"
                          style={{ top: menuPosition.top, left: menuPosition.left }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Link
                            href={`/dashboard/admin/corsi/${course.id}`}
                            onClick={(e) => { e.stopPropagation(); closeMenu(); }}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-secondary hover:bg-gray-50 transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Modifica
                          </Link>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              closeMenu();
                              void handleDelete(course);
                            }}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors w-full"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Elimina
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
