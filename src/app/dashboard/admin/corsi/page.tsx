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
  MoreVertical,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
} from "@/components/ui";

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function CorsiAdminPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
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
    if (error) alert("Errore: " + error.message);
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

  const hasActiveFilters = filterActive !== "all";

  const filtered = courses.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      c.name.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q) ||
      c.instructor_name?.toLowerCase().includes(q) ||
      c.court_name?.toLowerCase().includes(q);
    const matchesActive =
      filterActive === "all" ||
      (filterActive === "active" && c.is_active) ||
      (filterActive === "inactive" && !c.is_active);
    return matchesSearch && matchesActive;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-4xl font-bold text-secondary">Corsi</h1>
        <Link
          href="/dashboard/admin/corsi/new"
          className="flex-1 sm:flex-none px-4 py-2.5 text-sm font-medium text-white bg-secondary rounded-md hover:opacity-90 transition-all flex items-center justify-center gap-2"
        >
          Nuovo Corso
        </Link>
      </div>

      {/* Search + Filter */}
      <div className="flex items-center gap-2 w-full">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
          <input
            type="text"
            placeholder="Cerca per nome, maestro o campo..."
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
          aria-label="Apri filtri"
          title="Filtri"
        >
          <SlidersHorizontal className="h-5 w-5" />
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-secondary" />
          <p className="mt-3 text-gray-600">Caricamento corsi...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 rounded-md bg-white">
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
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-secondary hover:opacity-90 text-white font-medium rounded-md transition-opacity"
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

            return (
              <div
                key={course.id}
                className="rounded-lg cursor-pointer hover:opacity-95 transition-opacity"
                style={{ background: "#075985", opacity: course.is_active ? 1 : 0.55 }}
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
                      className="inline-flex items-center justify-center p-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white transition-all focus:outline-none w-8 h-8"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {openMenuId === course.id && menuPosition && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); closeMenu(); }} />
                        <div
                          className="fixed z-50 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1"
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

      {/* Filter Modal */}
      <Modal open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
        <ModalContent
          size="sm"
          showBuiltinClose={false}
          className="overflow-hidden rounded-lg !border-gray-200 shadow-xl !bg-white dark:!bg-white dark:!border-gray-200"
        >
          <ModalHeader withCloseButton closeButtonClassName="text-white/70 hover:text-white hover:bg-white/10" className="px-4 py-3 bg-secondary border-b border-secondary dark:!border-secondary">
            <ModalTitle className="text-white text-lg">Filtra Corsi</ModalTitle>
          </ModalHeader>
          <ModalBody className="px-4 py-4 bg-white dark:!bg-white">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-secondary/70">
                Stato
              </label>
              <select
                value={filterActive}
                onChange={(e) => setFilterActive(e.target.value as "all" | "active" | "inactive")}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
              >
                <option value="all">Tutti</option>
                <option value="active">Solo attivi</option>
                <option value="inactive">Solo inattivi</option>
              </select>
            </div>
          </ModalBody>
          <ModalFooter className="p-0 border-t border-gray-200 bg-white dark:!bg-white dark:!border-gray-200">
            <button
              type="button"
              onClick={() => setFilterActive("all")}
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
