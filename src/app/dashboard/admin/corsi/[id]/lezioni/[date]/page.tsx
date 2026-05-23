"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Users } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type Athlete = {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
};

type GuestParticipant = {
  id: null;
  full_name: string;
  email?: null;
  phone?: null;
};

type Participant = Athlete | GuestParticipant;

type AttendanceMap = Record<string, boolean>;

export default function LezionePresenzePage() {
  const params = useParams();
  const courseId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const dateParam = Array.isArray(params?.date) ? params.date[0] : params?.date;

  const [courseName, setCorseName] = useState("");
  const [scheduleTime, setScheduleTime] = useState<string | null>(null);
  const [athletes, setAthletes] = useState<Participant[]>([]);
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

    // Load course info
    const { data: course } = await supabase
      .from("courses")
      .select("name, schedule_time")
      .eq("id", courseId)
      .single();

    if (course) {
      setCorseName(course.name ?? "");
      setScheduleTime(course.schedule_time ?? null);
    }

    // Load enrolled participants via two-step query
    const { data: enrollments } = await supabase
      .from("course_enrollments")
      .select("user_id, guest_name")
      .eq("course_id", courseId);

    if (enrollments && enrollments.length > 0) {
      const registeredIds = enrollments
        .filter((e: { user_id: string | null }) => e.user_id)
        .map((e: { user_id: string }) => e.user_id);
      const guestEnrollments = enrollments.filter(
        (e: { user_id: string | null; guest_name: string | null }) => !e.user_id && e.guest_name
      );
      const all: Participant[] = [];
      if (registeredIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone")
          .in("id", registeredIds);
        if (profiles) all.push(...(profiles as Athlete[]));
      }
      for (const g of guestEnrollments) {
        all.push({ id: null, full_name: g.guest_name! });
      }
      setAthletes(all);
    }

    // Load existing attendance for this lesson date
    const { data: existingAttendance } = await supabase
      .from("lesson_attendance")
      .select("user_id, guest_name, present")
      .eq("course_id", courseId)
      .eq("lesson_date", dateParam);

    if (existingAttendance) {
      const map: AttendanceMap = {};
      existingAttendance.forEach((r: { user_id: string | null; guest_name: string | null; present: boolean }) => {
        const key = r.user_id ?? `guest:${r.guest_name}`;
        map[key] = r.present;
      });
      setAttendance(map);
    }

    setLoading(false);
  }

  function toggleAttendance(key: string) {
    setAttendance((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  }

  function markAll(present: boolean) {
    const map: AttendanceMap = {};
    athletes.forEach((a) => {
      const key = a.id ?? `guest:${a.full_name}`;
      map[key] = present;
    });
    setAttendance(map);
    setSaved(false);
  }

  async function handleSave() {
    if (!courseId || !dateParam) return;
    setSaving(true);
    setError("");

    const rows = athletes.map((a) => {
      const key = a.id ?? `guest:${a.full_name}`;
      return a.id
        ? { course_id: courseId, lesson_date: dateParam, user_id: a.id, guest_name: null, present: attendance[key] ?? false }
        : { course_id: courseId, lesson_date: dateParam, user_id: null, guest_name: a.full_name, present: attendance[key] ?? false };
    });

    const registeredRows = rows.filter((r) => r.user_id);
    const guestRows = rows.filter((r) => !r.user_id);

    let saveError = null;
    if (registeredRows.length > 0) {
      const { error } = await supabase
        .from("lesson_attendance")
        .upsert(registeredRows, { onConflict: "course_id,lesson_date,user_id" });
      if (error) saveError = error;
    }
    if (guestRows.length > 0 && !saveError) {
      const { error } = await supabase
        .from("lesson_attendance")
        .upsert(guestRows, { onConflict: "course_id,lesson_date,guest_name" });
      if (error) saveError = error;
    }

    const upsertError = saveError;

    if (upsertError) {
      setError("Errore nel salvataggio: " + upsertError.message);
    } else {
      setSaved(true);
    }
    setSaving(false);
  }

  const presentCount = athletes.filter((a) => {
    const key = a.id ?? `guest:${a.full_name}`;
    return attendance[key] === true;
  }).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-secondary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div>
        <p className="breadcrumb text-secondary/60">
          <Link href="/dashboard/admin/corsi" className="hover:text-secondary/80 transition-colors">Corsi</Link>
          {" › "}
          <Link href={`/dashboard/admin/corsi/${courseId}`} className="hover:text-secondary/80 transition-colors">Dettagli Corso</Link>
          {" › "}
          <span>Presenze</span>
        </p>
        <h1 className="text-4xl font-bold text-secondary">Registro Presenze</h1>
      </div>

      {/* Header */}
      <div
        className="rounded-xl border-t border-r border-b p-6 border-l-4"
        style={{ backgroundColor: "#075985", borderColor: "#075985", borderLeftColor: "#075985" }}
      >
        <div className="flex items-start gap-6">
          <Users className="h-8 w-8 text-white flex-shrink-0" strokeWidth={2.5} />
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white">{dateLabel}</h2>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Presenze */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent flex items-center justify-between">
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
                const key = a.id ?? `guest:${a.full_name}`;
                const isPresent = attendance[key] === true;
                const initials = a.full_name.trim().split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
                const bg = isPresent ? "#023047" : "var(--secondary)";
                return (
                  <li key={key}>
                    <button onClick={() => toggleAttendance(key)} className="w-full">
                      <div className="flex items-center gap-4 py-3 px-3 rounded-lg hover:opacity-90 transition-opacity" style={{ background: bg }}>
                        <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center">
                          <span className="text-sm font-bold text-white leading-none">{initials}</span>
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="font-semibold text-white text-sm truncate">{a.full_name}</p>
                          {a.id && (a.email || a.phone) && (
                            <p className="text-xs text-white/60 truncate mt-0.5">
                              {[a.email, a.phone].filter(Boolean).join(" · ")}
                            </p>
                          )}
                          {!a.id && (
                            <p className="text-xs text-white/50 mt-0.5">Ospite</p>
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

      {/* Save */}
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
