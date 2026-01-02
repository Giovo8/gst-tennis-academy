"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Course = {
  id: string;
  title: string;
  description?: string;
  price?: number;
  start_date?: string;
  end_date?: string;
};

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/courses");
        const json = await res.json();
        if (res.ok) {
          if (mounted) setCourses(json.courses ?? []);
        } else {
          setError(json.error || "Impossibile caricare i corsi");
        }
      } catch (err: any) {
        setError(err.message || "Errore rete");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const handleEnroll = async (courseId: string) => {
    setError(null);
    setEnrolling(courseId);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) {
        setError('Devi effettuare il login per iscriverti');
        setEnrolling(null);
        return;
      }

      const res = await fetch('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, course_id: courseId })
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Errore iscrizione');
      } else {
        // optimistic: mark enrolled
        setCourses((prev) => prev.map(c => c.id === courseId ? { ...c } : c));
      }
    } catch (err: any) {
      setError(err.message || 'Errore rete');
    } finally {
      setEnrolling(null);
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-10 min-h-screen">
      <div className="space-y-4 sm:space-y-6">
        <h1 className="text-xl sm:text-2xl font-semibold text-white">Corsi</h1>
        <p className="text-xs sm:text-sm text-[#c6d8c9]">Iscriviti ai nostri corsi disponibili.</p>
      </div>

      <div className="mt-6 sm:mt-8 grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="text-sm text-[#c6d8c9]">Caricamento...</div>
        ) : error ? (
          <div className="text-sm text-frozen-300">{error}</div>
        ) : courses.length === 0 ? (
          <div className="text-sm text-[#c6d8c9]">Nessun corso disponibile.</div>
        ) : (
          courses.map((c) => (
            <div key={c.id} className="rounded-lg sm:rounded-xl border border-[#2f7de1]/30 p-3 sm:p-4 bg-[#1a3d5c]/60">
              <h3 className="font-semibold text-white text-base sm:text-lg">{c.title}</h3>
              <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-[#c6d8c9] line-clamp-2">{c.description}</p>
              <div className="mt-2 sm:mt-3 flex items-center justify-between gap-2">
                <div className="text-xs sm:text-sm text-[#9fb6a6]">{c.price ? `€${Number(c.price).toFixed(2)}` : 'Gratis'}</div>
                <button
                  onClick={() => handleEnroll(c.id)}
                  disabled={!!enrolling}
                  className="rounded-full bg-[#7de3ff] px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-[#06101f]"
                >
                  {enrolling === c.id ? 'Iscrizione...' : 'Iscriviti'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
