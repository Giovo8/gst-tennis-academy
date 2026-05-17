"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Loader2, Search } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

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
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
};

const DAYS: Record<string, string> = {
  lun: "Lun", mar: "Mar", mer: "Mer", gio: "Gio",
  ven: "Ven", sab: "Sab", dom: "Dom",
};

export default function MaestroCorsiPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadCourses();
  }, []);

  async function loadCourses() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const fullName = profile?.full_name ?? "";

    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      const mine = (data as Course[]).filter((c) =>
        fullName && c.instructor_name
          ? c.instructor_name.split(", ").some((n) => n.trim() === fullName.trim())
          : false
      );
      setCourses(mine);
    }
    setLoading(false);
  }

  const filtered = courses.filter((c) => {
    const q = search.toLowerCase();
    return (
      !search ||
      c.name.toLowerCase().includes(q) ||
      c.court_name?.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-bold text-secondary">Corsi</h1>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
        <input
          type="text"
          placeholder="Cerca per nome o campo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-md bg-white border border-gray-200 text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20"
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-secondary" />
          <p className="mt-3 text-gray-600">Caricamento corsi...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 rounded-md bg-white">
          <GraduationCap className="w-16 h-16 mx-auto text-secondary/20 mb-4" />
          <h3 className="text-xl font-semibold text-secondary mb-2">
            {search ? "Nessun corso trovato" : "Nessun corso assegnato"}
          </h3>
          <p className="text-secondary/60">
            {search ? "Prova a modificare la ricerca" : "Non sei ancora assegnato a nessun corso"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((course) => {
            const days = (course.schedule_days ?? []).map((d) => DAYS[d] ?? d).join(", ");
            const subtitle = course.court_name ?? "";

            return (
              <div
                key={course.id}
                className="rounded-lg cursor-pointer hover:opacity-95 transition-opacity"
                style={{ background: "#05384c", opacity: course.is_active ? 1 : 0.55 }}
                onClick={() => router.push(`/dashboard/maestro/corsi/${course.id}`)}
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
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
