"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Users } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type Athlete = {
  id: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  isGuest?: boolean;
  guestName?: string;
};

type AttendanceMap = Record<string, boolean>;

export default function MaestroLezionePresenzePage() {
  const params = useParams();
  const courseId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const dateParam = Array.isArray(params?.date) ? params.date[0] : params?.date;

  const [courseName, setCorseName] = useState("");
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [attendance, setAttendance] = useState<AttendanceMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const dateLabel = dateParam
    ? new Date(dateParam + "T12:00:00").toLocaleDateString("it-IT", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).replace(/^./, (c) => c.toUpperCase())
    : "";

  useEffect(() => {
    if (!courseId || !dateParam) return;
    void load();
  }, [courseId, dateParam]);

  async function load() {
    setLoading(true);

    const { data: course } = await supabase
      .from("courses")
      .select("name, schedule_time")
      .eq("id", courseId)
      .single();

    if (course) setCorseName(course.name ?? "");

    const { data: enrollments } = await supabase
      .from("course_enrollments")
      .select("user_id, guest_name")
      .eq("course_id", courseId);

    if (enrollments && enrollments.length > 0) {
      const allAthletes: Athlete[] = [];

      const userIds = enrollments
        .filter((e: { user_id: string | null }) => e.user_id != null)
        .map((e: { user_id: string }) => e.user_id);

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone")
          .in("id", userIds);
        if (profiles) allAthletes.push(...(profiles as Athlete[]));
      }

      const guests: Athlete[] = enrollments
        .filter((e: { user_id: string | null; guest_name: string | null }) => e.user_id == null && e.guest_name)
        .map((e: { guest_name: string }) => ({
          id: `guest-${e.guest_name}`,
          full_name: e.guest_name,
          isGuest: true,
          guestName: e.guest_name,
        }));
      allAthletes.push(...guests);

      setAthletes(allAthletes);
    }

    const { data: existingAttendance } = await supabase
      .from("lesson_attendance")
      .select("user_id, guest_name, present")
      .eq("course_id", courseId)
      .eq("lesson_date", dateParam);

    if (existingAttendance) {
      const map: AttendanceMap = {};
      existingAttendance.forEach((r: { user_id: string | null; guest_name: string | null; present: boolean }) => {
        const key = r.user_id ? r.user_id : `guest-${r.guest_name}`;
        map[key] = r.present;
      });
      setAttendance(map);
    }

    setLoading(false);
  }

  function toggleAttendance(userId: string) {
    setAttendance((prev) => ({ ...prev, [userId]: !prev[userId] }));
    setSaved(false);
  }

  async function handleSave() {
    if (!courseId || !dateParam) return;
    setSaving(true);
    setError("");

    await supabase
      .from("lesson_attendance")
      .delete()
      .eq("course_id", courseId)
      .eq("lesson_date", dateParam);

    const rows = athletes.map((a) => ({
      course_id: courseId,
      lesson_date: dateParam,
      ...(a.isGuest ? { guest_name: a.guestName } : { user_id: a.id }),
      present: attendance[a.id] ?? false,
    }));

    const { error: upsertError } = await supabase
      .from("lesson_attendance")
      .insert(rows);

    if (upsertError) {
      setError("Errore nel salvataggio: " + upsertError.message);
    } else {
      setSaved(true);
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-secondary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-3">
      {/* Breadcrumb */}
      <div>
        <p className="breadcrumb text-secondary/60">
          <Link href="/dashboard/maestro/corsi" className="hover:text-secondary/80 transition-colors">Corsi</Link>
          {" › "}
          <Link href={`/dashboard/maestro/corsi/${courseId}`} className="hover:text-secondary/80 transition-colors">{courseName || "Dettagli Corso"}</Link>
          {" › "}
          <span>Presenze</span>
        </p>
        <h1 className="text-4xl font-bold text-secondary">Registro Presenze</h1>
      </div>

      {/* Header */}
      <div
        className="rounded-xl border-t border-r border-b p-6 border-l-4"
        style={{ backgroundColor: "#05384c", borderColor: "#05384c", borderLeftColor: "#023047" }}
      >
        <div className="flex items-start gap-6">
          <Users className="h-8 w-8 text-white flex-shrink-0" strokeWidth={2.5} />
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white">{dateLabel}</h2>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Presenze */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
          <h2 className="text-base sm:text-lg font-semibold text-secondary">Presenze</h2>
        </div>
        {athletes.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <Users className="h-10 w-10 text-secondary/20 mx-auto mb-2" />
            <p className="text-sm text-secondary/50">Nessun partecipante iscritto a questo corso</p>
          </div>
        ) : (
          <div className="px-6 py-4">
            <ul className="flex flex-col gap-2">
              {athletes.map((a) => {
                const isPresent = attendance[a.id] === true;
                const initials = a.full_name.trim().split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
                const bg = isPresent ? "#023047" : "var(--secondary)";
                return (
                  <li key={a.id}>
                    <button onClick={() => toggleAttendance(a.id)} className="w-full">
                      <div className="flex items-center gap-4 py-3 px-3 rounded-lg hover:opacity-90 transition-opacity" style={{ background: bg }}>
                        <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center">
                          <span className="text-sm font-bold text-white leading-none">{initials}</span>
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="font-semibold text-white text-sm truncate">{a.full_name}</p>
                          {a.isGuest ? (
                            <p className="text-xs text-white/40 mt-0.5">Ospite</p>
                          ) : (a.email || a.phone) && (
                            <p className="text-xs text-white/60 truncate mt-0.5">
                              {[a.email, a.phone].filter(Boolean).join(" · ")}
                            </p>
                          )}
                        </div>
                        <span className="flex-shrink-0 text-xs font-bold text-white/50 uppercase tracking-wide">
                          {isPresent ? "PRESENTE" : "ASSENTE"}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {athletes.length > 0 && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 text-white bg-secondary rounded-lg hover:opacity-90 transition-all font-medium disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saved ? "Salvato ✓" : "Salva presenze"}
        </button>
      )}
    </div>
  );
}
