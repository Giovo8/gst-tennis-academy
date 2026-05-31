"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Users, UserCheck } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalBody, ModalFooter } from "@/components/ui";

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
  const router = useRouter();
  const courseId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const dateParam = Array.isArray(params?.date) ? params.date[0] : params?.date;

  const [courseName, setCorseName] = useState("");
  const [lessonTimeOverrides, setLessonTimeOverrides] = useState<Record<string, string>>({});
  const [cancelledDates, setCancelledDates] = useState<string[]>([]);
  const [maestroNames, setMaestroNames] = useState<string[]>([]);
  const [athletes, setAthletes] = useState<Participant[]>([]);
  const [attendance, setAttendance] = useState<AttendanceMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  // Delete lesson
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const stripDot = (s: string) => s.replace(/\.$/, "");

  const dateLabel = (() => {
    if (!dateParam) return { full: "", short: "" };
    const d = new Date(dateParam + "T12:00:00");
    const day = d.toLocaleDateString("it-IT", { day: "numeric" });
    const year = d.toLocaleDateString("it-IT", { year: "numeric" });
    const full = `${capitalize(d.toLocaleDateString("it-IT", { weekday: "long" }))} ${day} ${capitalize(d.toLocaleDateString("it-IT", { month: "long" }))} ${year}`;
    const short = `${capitalize(stripDot(d.toLocaleDateString("it-IT", { weekday: "short" })))} ${day} ${capitalize(stripDot(d.toLocaleDateString("it-IT", { month: "short" })))} ${year}`;
    return { full, short };
  })();

  useEffect(() => {
    if (!courseId || !dateParam) return;
    void load();
  }, [courseId, dateParam]);

  async function load() {
    setLoading(true);

    // Load course info
    const { data: course } = await supabase
      .from("courses")
      .select("name, schedule_time, instructor_name, lesson_time_overrides, cancelled_dates")
      .eq("id", courseId)
      .single();

    if (course) {
      setCorseName(course.name ?? "");
      setLessonTimeOverrides((course.lesson_time_overrides as Record<string, string>) ?? {});
      setCancelledDates(course.cancelled_dates ?? []);
      const names = (course.instructor_name ?? "").split(", ").filter(Boolean);
      setMaestroNames(names);
    }

    // Load enrolled participants via two-step query
    const { data: enrollments } = await supabase
      .from("course_enrollments")
      .select("user_id, guest_name")
      .eq("course_id", courseId);

    const all: Participant[] = [];
    if (enrollments && enrollments.length > 0) {
      const registeredIds = enrollments
        .filter((e: { user_id: string | null }) => e.user_id)
        .map((e: { user_id: string }) => e.user_id);
      const guestEnrollments = enrollments.filter(
        (e: { user_id: string | null; guest_name: string | null }) => !e.user_id && e.guest_name
      );
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

    // Merge extra participants from lesson_attendance (not in course_enrollments)
    const { data: attendanceExtras } = await supabase
      .from("lesson_attendance")
      .select("user_id, guest_name")
      .eq("course_id", courseId)
      .eq("lesson_date", dateParam);

    if (attendanceExtras && attendanceExtras.length > 0) {
      const enrolledIds = all.filter((a) => a.id).map((a) => a.id!);
      const enrolledGuests = all.filter((a) => !a.id).map((a) => a.full_name);

      const extraUserIds = attendanceExtras
        .filter((r: { user_id: string | null }) => r.user_id && !enrolledIds.includes(r.user_id))
        .map((r: { user_id: string }) => r.user_id);
      const extraGuests = attendanceExtras
        .filter((r: { user_id: string | null; guest_name: string | null }) => !r.user_id && r.guest_name && !enrolledGuests.includes(r.guest_name!))
        .map((r: { guest_name: string }) => r.guest_name);

      if (extraUserIds.length > 0) {
        const { data: extraProfiles } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone")
          .in("id", extraUserIds);
        if (extraProfiles) all.push(...(extraProfiles as Athlete[]));
      }
      for (const gName of extraGuests) {
        all.push({ id: null, full_name: gName });
      }
      if (extraUserIds.length > 0 || extraGuests.length > 0) {
        setAthletes([...all]);
      }
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

  async function handleDeleteLesson() {
    if (!courseId || !dateParam) return;
    setDeleting(true);
    const updated = [...cancelledDates.filter((d) => d !== dateParam), dateParam];
    const { error } = await supabase
      .from("courses")
      .update({ cancelled_dates: updated })
      .eq("id", courseId);
    setDeleting(false);
    if (!error) {
      router.push(`/dashboard/admin/corsi/${courseId}`);
    } else {
      setError("Errore nell'eliminazione: " + error.message);
      setShowDeleteConfirm(false);
    }
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
          <UserCheck className="h-8 w-8 text-white flex-shrink-0" strokeWidth={2.5} />
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white">
              <span className="hidden sm:inline">{dateLabel.full}</span>
              <span className="sm:hidden">{dateLabel.short}</span>
            </h2>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Maestro */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent flex items-center gap-2">
          <h2 className="text-base sm:text-lg font-semibold text-secondary">Maestro</h2>
        </div>
        {maestroNames.length > 0 ? (
          <div className="px-6 py-4">
            <ul className="flex flex-col gap-2">
              {maestroNames.map((name) => (
                <li key={name}>
                  <div className="flex items-center gap-4 py-3 px-3 rounded-lg" style={{ background: "var(--secondary)" }}>
                    <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-white leading-none">
                        {name.trim().split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm truncate">{name}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="px-6 py-8 text-center">
            <UserCheck className="h-10 w-10 text-secondary/20 mx-auto mb-2" />
            <p className="text-sm text-secondary/50">Nessun maestro assegnato a questo corso</p>
          </div>
        )}
      </div>

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

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        {athletes.length > 0 && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-3 text-white bg-secondary rounded-lg shadow-sm hover:bg-secondary/90 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving && <Loader2 className="h-5 w-5 animate-spin" />}
            {saved ? "Salvato ✓" : "Salva presenze"}
          </button>
        )}
        <Link
          href={`/dashboard/admin/corsi/${courseId}/lezioni/${dateParam}/modifica`}
          className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-3 text-white bg-[#023b52] rounded-lg shadow-sm hover:bg-[#023b52]/90 transition-all font-medium"
        >
          Modifica lezione
        </Link>
        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-3 text-white bg-[#022431] rounded-lg shadow-sm hover:bg-[#022431]/90 transition-all font-medium"
        >
          Elimina lezione
        </button>
      </div>

      {/* Delete confirm modal */}
      <Modal open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Elimina lezione</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <p className="text-sm text-secondary/70">
              Sei sicuro di voler eliminare la lezione del{" "}
              <span className="font-semibold text-secondary">
                <span className="hidden sm:inline">{dateLabel.full}</span>
                <span className="sm:hidden">{dateLabel.short}</span>
              </span>?
              Questa azione aggiungerà la data alle lezioni cancellate del corso.
            </p>
          </ModalBody>
          <ModalFooter className="p-0 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className="w-1/2 py-3 border-r border-gray-200 text-secondary font-semibold hover:bg-gray-50 transition-colors"
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={handleDeleteLesson}
              disabled={deleting}
              className="w-1/2 py-3 text-red-600 font-semibold hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {deleting && <Loader2 className="h-3 w-3 animate-spin" />}
              Elimina
            </button>
          </ModalFooter>
        </ModalContent>
      </Modal>

    </div>
  );
}
