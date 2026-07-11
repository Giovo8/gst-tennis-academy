"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GraduationCap, Loader2, Search } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type Course = {
  id: string;
  name: string;
  instructor_name: string | null;
};

export default function AtletaCorsiPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: enrollments } = await supabase
      .from("course_enrollments")
      .select("course_id")
      .eq("user_id", user.id);

    if (!enrollments?.length) { setLoading(false); return; }

    const ids = enrollments.map((e: { course_id: string }) => e.course_id);

    const { data: courseData } = await supabase
      .from("courses")
      .select("id, name, instructor_name")
      .in("id", ids)
      .order("start_date", { ascending: true });

    if (courseData) setCourses(courseData);
    setLoading(false);
  }

  const filtered = courses.filter((c) => {
    const q = search.toLowerCase();
    return (
      !search ||
      c.name.toLowerCase().includes(q) ||
      c.instructor_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pt-3">
      <h1 className="text-4xl font-bold text-secondary">Corsi</h1>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
        <input
          type="text"
          placeholder="Cerca per nome o maestro..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-md bg-white border border-gray-200 text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-secondary" />
          <p className="mt-3 text-secondary/60">Caricamento corsi...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 rounded-md bg-white">
          <GraduationCap className="w-16 h-16 mx-auto text-secondary/20 mb-4" />
          <h3 className="text-xl font-semibold text-secondary mb-2">
            {search ? "Nessun corso trovato" : "Nessun corso presente"}
          </h3>
          <p className="text-secondary/60">
            {search ? "Prova a modificare la ricerca" : "Non sei ancora iscritto a nessun corso"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((course) => (
              <Link
                key={course.id}
                href={`/dashboard/atleta/corsi/${course.id}`}
                className="rounded-lg block hover:opacity-90 transition-opacity"
                style={{ background: "#05384c" }}
              >
                <div className="flex items-center gap-4 py-3 px-3">
                  <div className="flex items-center justify-center bg-white/10 rounded-lg w-11 h-11 flex-shrink-0">
                    <GraduationCap className="h-5 w-5 text-white" strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm truncate">{course.name}</p>
                    {course.instructor_name && (
                      <p className="text-xs text-white/70 mt-0.5 truncate">{course.instructor_name}</p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
        </div>
      )}
    </div>
  );
}
