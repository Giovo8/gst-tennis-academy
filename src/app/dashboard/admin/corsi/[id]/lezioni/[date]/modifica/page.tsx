"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Loader2, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { isBookableCoachProfile } from "@/lib/roles";
import SearchableSelect from "@/components/bookings/SearchableSelect";
import AthletesSelector from "@/components/bookings/AthletesSelector";
import { useDragScroll } from "@/components/admin/hooks/useDragScroll";

interface AthleteProfile {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  role: "atleta" | "admin" | "gestore" | "maestro";
}

type ExtraParticipant = {
  userId?: string;
  fullName: string;
  email?: string;
  phone?: string;
  isRegistered: boolean;
};

interface TimeSlot {
  time: string;
  available: boolean;
}

interface ExistingBooking {
  id: string;
  start_time: string;
  end_time: string;
  type: string;
  status: string;
  isBlock?: boolean;
  isCourse?: boolean;
  courseName?: string;
}

export default function ModificaLezionePage() {
  const params = useParams();
  const router = useRouter();
  const courseId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const dateParam = Array.isArray(params?.date) ? params.date[0] : params?.date;

  const [courseName, setCourseName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [existingBookings, setExistingBookings] = useState<ExistingBooking[]>([]);
  const { scrollRef, handleMouseDown, handleMouseMove, handleMouseUp, handleMouseLeave } = useDragScroll();

  const [maestros, setMaestros] = useState<{ id: string; full_name: string }[]>([]);
  const [selectedMaestros, setSelectedMaestros] = useState<{ id: string; full_name: string }[]>([]);

  // Course participants (read-only)
  const [courseParticipants, setCourseParticipants] = useState<{ id: string | null; full_name: string }[]>([]);
  // Extra participants for this lesson only
  const [allAthletes, setAllAthletes] = useState<AthleteProfile[]>([]);
  const [extraParticipants, setExtraParticipants] = useState<ExtraParticipant[]>([]);
  const [originalExtraKeys, setOriginalExtraKeys] = useState<string[]>([]);

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

  useEffect(() => {
    async function loadMaestros() {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, role, metadata")
        .in("role", ["maestro", "gestore"])
        .order("full_name");
      if (data) {
        setMaestros(
          data
            .filter((p) => isBookableCoachProfile(p))
            .map(({ id, full_name }) => ({ id, full_name }))
        );
      }
    }
    loadMaestros();
  }, []);

  useEffect(() => {
    async function loadAllAthletes() {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, role")
        .eq("role", "atleta")
        .order("full_name");
      if (data) setAllAthletes(data as AthleteProfile[]);
    }
    loadAllAthletes();
  }, []);

  async function load() {
    setLoading(true);
    const { data: course } = await supabase
      .from("courses")
      .select("name, schedule_time, lesson_time_overrides, instructor_name")
      .eq("id", courseId)
      .single();

    if (course) {
      setCourseName(course.name ?? "");
      const overrides = (course.lesson_time_overrides as Record<string, string> | null) ?? {};
      const currentTime = overrides[dateParam ?? ""] ?? course.schedule_time ?? "";
      const match = currentTime.match(/(\d{1,2}:\d{2})\s*[\u2013\-]\s*(\d{1,2}:\d{2})/);
      if (match) {
        const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
        const initial: string[] = [];
        let cur = toMin(match[1].padStart(5, "0"));
        const end = toMin(match[2].padStart(5, "0"));
        while (cur < end) {
          initial.push(`${String(Math.floor(cur / 60)).padStart(2, "0")}:${String(cur % 60).padStart(2, "0")}`);
          cur += 30;
        }
        setSelectedSlots(initial);
      }
      const maestroNames = (course.instructor_name ?? "").split(", ").filter(Boolean);
      setSelectedMaestros(maestroNames.map((n: string) => ({ id: n, full_name: n })));
    }

    // Load course enrollments (fixed participants)
    const { data: enrollments } = await supabase
      .from("course_enrollments")
      .select("user_id, guest_name")
      .eq("course_id", courseId);

    const enrolledUserIds: string[] = [];
    const enrolledGuestNames: string[] = [];
    const participants: { id: string | null; full_name: string }[] = [];

    if (enrollments && enrollments.length > 0) {
      const registeredIds = enrollments
        .filter((e: { user_id: string | null }) => e.user_id)
        .map((e: { user_id: string }) => e.user_id);
      enrolledUserIds.push(...registeredIds);
      if (registeredIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", registeredIds);
        if (profiles) participants.push(...profiles.map((p: { id: string; full_name: string }) => ({ id: p.id, full_name: p.full_name })));
      }
      for (const e of enrollments.filter((e: { user_id: string | null; guest_name: string | null }) => !e.user_id && e.guest_name)) {
        enrolledGuestNames.push(e.guest_name!);
        participants.push({ id: null, full_name: e.guest_name! });
      }
    }
    setCourseParticipants(participants);

    // Load lesson_attendance extras (not in course_enrollments)
    const { data: attendanceRows } = await supabase
      .from("lesson_attendance")
      .select("user_id, guest_name")
      .eq("course_id", courseId)
      .eq("lesson_date", dateParam);

    const extras: ExtraParticipant[] = [];
    const extraKeys: string[] = [];
    const extraRegisteredIds: string[] = [];

    if (attendanceRows) {
      for (const r of attendanceRows) {
        if (r.user_id && !enrolledUserIds.includes(r.user_id)) {
          extraRegisteredIds.push(r.user_id);
          extraKeys.push(`user:${r.user_id}`);
        } else if (!r.user_id && r.guest_name && !enrolledGuestNames.includes(r.guest_name)) {
          extras.push({ fullName: r.guest_name, isRegistered: false });
          extraKeys.push(`guest:${r.guest_name}`);
        }
      }
    }
    if (extraRegisteredIds.length > 0) {
      const { data: extraProfiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone")
        .in("id", extraRegisteredIds);
      if (extraProfiles) {
        extras.unshift(
          ...extraProfiles.map((p: { id: string; full_name: string; email: string; phone?: string | null }) => ({
            userId: p.id,
            fullName: p.full_name,
            email: p.email,
            phone: p.phone ?? undefined,
            isRegistered: true,
          }))
        );
      }
    }
    setExtraParticipants(extras);
    setOriginalExtraKeys(extraKeys);
    setLoading(false);
  }

  useEffect(() => {
    if (!dateParam) return;
    void loadAvailableSlots();
  }, [dateParam]);

  async function loadAvailableSlots() {
    if (!dateParam) return;
    setLoadingSlots(true);
    const [{ data: bookingsData }, { data: blocksData }] = await Promise.all([
      supabase.from("bookings").select("id, start_time, end_time, type, status")
        .neq("status", "cancelled").neq("status", "rejected")
        .lt("start_time", `${dateParam}T23:59:59.999Z`).gt("end_time", `${dateParam}T00:00:00.000Z`),
      supabase.from("court_blocks").select("id, start_time, end_time")
        .eq("is_disabled", false)
        .lt("start_time", `${dateParam}T23:59:59.999Z`).gt("end_time", `${dateParam}T00:00:00.000Z`),
    ]);
    const blocks: ExistingBooking[] = (blocksData ?? []).map((b: { id: string; start_time: string; end_time: string }) => ({
      id: b.id, start_time: b.start_time, end_time: b.end_time, type: "blocco", status: "blocked", isBlock: true,
    }));
    setExistingBookings([...(bookingsData ?? []) as ExistingBooking[], ...blocks]);
    const occupiedSlots = new Set<string>();
    [...(bookingsData ?? []), ...blocks].forEach((b) => {
      const cur = new Date(b.start_time);
      const end = new Date(b.end_time);
      while (cur < end) {
        occupiedSlots.add(`${String(cur.getHours()).padStart(2, "0")}:${String(cur.getMinutes()).padStart(2, "0")}`);
        cur.setMinutes(cur.getMinutes() + 30);
      }
    });
    const generated: TimeSlot[] = [];
    for (let h = 7; h <= 22; h++) {
      for (const m of [0, 30]) {
        if (h === 22 && m === 30) break;
        const time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        generated.push({ time, available: !occupiedSlots.has(time) });
      }
    }
    setSlots(generated);
    setLoadingSlots(false);
  }

  const isSlotAvailable = (time: string): boolean => {
    if (selectedSlots.includes(time)) return true;
    const slot = slots.find((s) => s.time === time);
    return slot ? slot.available : true;
  };

  const toggleSlotSelection = (time: string, available: boolean) => {
    if (!available) return;
    setSelectedSlots((prev) => {
      if (prev.includes(time)) return prev.filter((t) => t !== time);
      if (prev.length === 0) return [time];
      const all = [...prev, time].sort((a, b) => {
        const [hA, mA] = a.split(":").map(Number);
        const [hB, mB] = b.split(":").map(Number);
        return hA * 60 + mA - (hB * 60 + mB);
      });
      for (let i = 1; i < all.length; i++) {
        const [hP, mP] = all[i - 1].split(":").map(Number);
        const [hC, mC] = all[i].split(":").map(Number);
        if (hC * 60 + mC - (hP * 60 + mP) !== 30) return [time];
      }
      return all;
    });
  };

  async function handleSave() {
    if (!courseId || !dateParam) return;
    setSaving(true);
    setError("");

    try {
      const updatePayload: Record<string, unknown> = {
        instructor_name: selectedMaestros.map((m) => m.full_name).join(", ") || null,
      };

      if (selectedSlots.length > 0) {
        const sorted = [...selectedSlots].sort();
        const startStr = sorted[0];
        const [lh, lm] = sorted[sorted.length - 1].split(":").map(Number);
        const endMin = lh * 60 + lm + 30;
        const endStr = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;
        const { data: courseData } = await supabase.from("courses").select("lesson_time_overrides").eq("id", courseId).single();
        const current = (courseData?.lesson_time_overrides as Record<string, string> | null) ?? {};
        updatePayload.lesson_time_overrides = { ...current, [dateParam]: `${startStr} \u2013 ${endStr}` };
      }

      const { error: saveError } = await supabase
        .from("courses")
        .update(updatePayload)
        .eq("id", courseId);

      if (saveError) throw new Error("Errore nel salvataggio: " + saveError.message);

      // Save extra lesson participants (not in course_enrollments)
      const currentKeys = extraParticipants.map((a) =>
        a.userId ? `user:${a.userId}` : `guest:${a.fullName}`
      );

      // Delete removed extras
      const removedKeys = originalExtraKeys.filter((k) => !currentKeys.includes(k));
      for (const key of removedKeys) {
        if (key.startsWith("user:")) {
          const { error: delErr } = await supabase
            .from("lesson_attendance")
            .delete()
            .eq("course_id", courseId)
            .eq("lesson_date", dateParam)
            .eq("user_id", key.slice(5));
          if (delErr) throw new Error("Errore nella rimozione partecipante: " + delErr.message);
        } else {
          const { error: delErr } = await supabase
            .from("lesson_attendance")
            .delete()
            .eq("course_id", courseId)
            .eq("lesson_date", dateParam)
            .eq("guest_name", key.slice(6))
            .is("user_id", null);
          if (delErr) throw new Error("Errore nella rimozione partecipante: " + delErr.message);
        }
      }

      // Insert new extras
      const addedExtras = extraParticipants.filter(
        (a) => !originalExtraKeys.includes(a.userId ? `user:${a.userId}` : `guest:${a.fullName}`)
      );
      for (const a of addedExtras) {
        if (a.isRegistered && a.userId) {
          const { error: insErr } = await supabase
            .from("lesson_attendance")
            .insert({ course_id: courseId, lesson_date: dateParam, user_id: a.userId, guest_name: null, present: false });
          if (insErr && insErr.code !== "23505") throw new Error("Errore nell'aggiunta partecipante: " + insErr.message);
        } else if (!a.isRegistered && a.fullName.trim()) {
          const { error: insErr } = await supabase
            .from("lesson_attendance")
            .insert({ course_id: courseId, lesson_date: dateParam, user_id: null, guest_name: a.fullName.trim(), present: false });
          if (insErr && insErr.code !== "23505") throw new Error("Errore nell'aggiunta partecipante: " + insErr.message);
        }
      }

      router.refresh();
      router.push(`/dashboard/admin/corsi/${courseId}/lezioni/${dateParam}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore imprevisto. Riprova.");
    } finally {
      setSaving(false);
    }
  }

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
          <Link href={`/dashboard/admin/corsi/${courseId}/lezioni/${dateParam}`} className="hover:text-secondary/80 transition-colors">Presenze</Link>
          {" › "}
          <span>Modifica lezione</span>
        </p>
        <h1 className="text-4xl font-bold text-secondary">Modifica lezione</h1>
      </div>

      {error && (
        <div className="bg-red-50 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {/* Info */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
          <h2 className="text-base sm:text-lg font-semibold text-secondary">Informazioni</h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-8 pb-6 border-b border-gray-200">
            <span className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Corso</span>
            <span className="flex-1 text-sm text-secondary/70">{courseName}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-8">
            <span className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Data lezione</span>
            <span className="flex-1 text-sm text-secondary/70">
              <span className="hidden sm:inline">{dateLabel.full}</span>
              <span className="sm:hidden">{dateLabel.short}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Maestri */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
          <h2 className="text-base sm:text-lg font-semibold text-secondary">Maestri</h2>
        </div>
        <div className="p-6 space-y-4">
          <SearchableSelect
            value=""
            onChange={(val) => {
              const m = maestros.find((x) => x.id === val);
              if (!m || selectedMaestros.some((sm) => sm.full_name === m.full_name)) return;
              setSelectedMaestros((prev) => [...prev, { id: m.id, full_name: m.full_name }]);
            }}
            options={maestros
              .filter((m) => !selectedMaestros.some((sm) => sm.full_name === m.full_name))
              .map((m) => ({ value: m.id, label: m.full_name }))}
            placeholder="Cerca maestro"
            searchPlaceholder="Cerca maestro..."
          />
          {selectedMaestros.length > 0 && (
            <ul className="flex flex-col gap-2">
              {selectedMaestros.map((m) => (
                <li key={m.full_name}>
                  <div className="flex items-center gap-4 py-3 px-3 rounded-lg" style={{ background: "#05384c" }}>
                    <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-white leading-none">
                        {m.full_name.trim().split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm truncate">{m.full_name}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedMaestros((prev) => prev.filter((x) => x.full_name !== m.full_name))}
                      className="flex-shrink-0 inline-flex items-center justify-center p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white transition-all focus:outline-none w-8 h-8"
                      aria-label={`Rimuovi ${m.full_name}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Partecipanti */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
          <h2 className="text-base sm:text-lg font-semibold text-secondary">Partecipanti</h2>
        </div>
        {/* Add extra via AthletesSelector (search/add only, no selected list) */}
        <div className="px-6 pt-4">
          <AthletesSelector
            athletes={allAthletes.filter((a) => {
              const enrolledIds = courseParticipants.filter((p) => p.id).map((p) => p.id!);
              const extraIds = extraParticipants.filter((p) => p.userId).map((p) => p.userId!);
              return !enrolledIds.includes(a.id) && !extraIds.includes(a.id);
            })}
            selectedAthletes={[]}
            onAthleteAdd={(a) => setExtraParticipants((prev) => [...prev, a])}
            onAthleteRemove={() => {}}
            maxAthletes={null}
          />
        </div>
        <div className="px-6 py-4 space-y-2">
          {courseParticipants.length === 0 && extraParticipants.length === 0 && (
            <p className="text-sm text-secondary/50 py-2">Nessun partecipante.</p>
          )}
          {/* Course participants — non removibili */}
          {courseParticipants.map((p) => {
            const initials = p.full_name.trim().split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
            return (
              <div key={p.id ?? `guest:${p.full_name}`} className="flex items-center gap-4 py-3 px-3 rounded-lg" style={{ background: "var(--secondary)" }}>
                <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-white leading-none">{initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm truncate">{p.full_name}</p>
                  {!p.id && <p className="text-xs text-white/50 mt-0.5">Ospite</p>}
                </div>
              </div>
            );
          })}
          {/* Extra participants — removibili */}
          {extraParticipants.map((p, i) => {
            const initials = p.fullName.trim().split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
            return (
              <div key={p.userId ?? `guest:${p.fullName}`} className="flex items-center gap-4 py-3 px-3 rounded-lg" style={{ background: "var(--secondary)" }}>
                <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-white leading-none">{initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm truncate">{p.fullName}</p>
                  {p.isRegistered ? (
                    p.email && <p className="text-xs text-white/50 mt-0.5 truncate">{p.email}</p>
                  ) : (
                    <p className="text-xs text-white/50 mt-0.5">Ospite</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setExtraParticipants((prev) => prev.filter((_, idx) => idx !== i))}
                  className="flex-shrink-0 inline-flex items-center justify-center p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white transition-all focus:outline-none w-8 h-8"
                  aria-label={`Rimuovi ${p.fullName}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Orari disponibili */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-secondary/5 to-transparent flex items-center justify-between gap-4">
          <h2 className="text-base sm:text-lg font-semibold text-secondary">Orari disponibili</h2>
        </div>
        <div className="p-4 sm:p-6">
          {loadingSlots ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-12 w-12 animate-spin text-secondary mb-4" />
              <p className="text-secondary font-semibold">Caricamento slot...</p>
            </div>
          ) : (
            <div
              ref={scrollRef}
              className="overflow-x-auto scrollbar-hide cursor-grab active:cursor-grabbing"
              style={{ overflowX: 'scroll', WebkitOverflowScrolling: 'touch' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
            >
              <div className="min-w-[1280px]">
                {/* Header con orari */}
                <div className="grid timeline-grid grid-cols-[repeat(16,_minmax(80px,_1fr))] bg-secondary rounded-lg mb-3">
                  {Array.from({ length: 16 }, (_, i) => {
                    const hour = 7 + i;
                    return (
                      <div key={hour} className="p-3 text-center font-bold text-white text-xs flex items-center justify-center">
                        {hour.toString().padStart(2, '0')}:00
                      </div>
                    );
                  })}
                </div>
                {/* Griglia slot selezionabili */}
                <div className="grid timeline-grid grid-cols-[repeat(16,_minmax(80px,_1fr))] bg-white rounded-lg relative" style={{ minHeight: "70px" }}>
                  {/* Prenotazioni esistenti come blocchi sovrapposti */}
                  {existingBookings.filter((b) => b.status !== "cancelled").map((b) => {
                    const start = new Date(b.start_time);
                    const end = new Date(b.end_time);
                    const startSlot = (start.getHours() - 7) * 2 + (start.getMinutes() === 30 ? 1 : 0);
                    const endSlot = (end.getHours() - 7) * 2 + (end.getMinutes() === 30 ? 1 : 0);
                    const duration = endSlot - startSlot;
                    if (duration <= 0) return null;
                    const getBookingStyle = () => {
                      if (b.isBlock) return { background: "var(--color-frozen-lake-900)" };
                      if (b.isCourse) return { background: "#075985" };
                      switch (b.type) {
                        case "lezione_privata": case "lezione_gruppo": return { background: "#023047" };
                        case "campo": return { background: "var(--secondary)" };
                        case "arena": return { background: "var(--color-frozen-lake-600)" };
                        default: return { background: "var(--secondary-light)" };
                      }
                    };
                    return (
                      <div
                        key={b.id}
                        className="absolute p-2.5 text-white text-xs font-bold flex flex-col justify-center rounded-md z-10 pointer-events-none"
                        style={{ ...getBookingStyle(), left: `${(startSlot / 32) * 100}%`, width: `calc(${(duration / 32) * 100}% - 4px)`, top: '4px', bottom: '4px', marginLeft: '2px' }}
                      />
                    );
                  })}
                  {/* Slot cliccabili */}
                  {Array.from({ length: 16 }, (_, hourIndex) => {
                    const hour = 7 + hourIndex;
                    const time1 = `${hour.toString().padStart(2, '0')}:00`;
                    const time2 = hour < 22 ? `${hour.toString().padStart(2, '0')}:30` : null;
                    const available1 = isSlotAvailable(time1);
                    const available2 = time2 ? isSlotAvailable(time2) : false;
                    const isSelected1 = selectedSlots.includes(time1);
                    const isSelected2 = time2 ? selectedSlots.includes(time2) : false;
                    if (!time2) {
                      return (
                        <div
                          key={hour}
                          className={`border-r border-gray-200 relative transition-colors cursor-pointer ${
                            isSelected1 ? 'bg-secondary hover:bg-secondary/90' : available1 ? 'bg-white hover:bg-emerald-50/40' : 'bg-gray-100 cursor-not-allowed'
                          }`}
                          onClick={() => toggleSlotSelection(time1, available1)}
                          title={`${time1} - ${available1 ? (isSelected1 ? 'Selezionato' : 'Disponibile') : 'Occupato'}`}
                        >
                          <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-px h-4 bg-gray-300" />
                        </div>
                      );
                    }
                    return (
                      <div key={hour} className="border-r border-gray-200 last:border-r-0 relative flex">
                        <div
                          className={`flex-1 relative transition-colors cursor-pointer ${
                            isSelected1 ? 'bg-secondary hover:bg-secondary/90' : available1 ? 'bg-white hover:bg-emerald-50/40' : 'bg-gray-100 cursor-not-allowed'
                          }`}
                          onClick={() => toggleSlotSelection(time1, available1)}
                          title={`${time1} - ${available1 ? (isSelected1 ? 'Selezionato' : 'Disponibile') : 'Occupato'}`}
                        />
                        <div
                          className={`flex-1 relative transition-colors cursor-pointer ${
                            isSelected2 ? 'bg-secondary hover:bg-secondary/90' : available2 ? 'bg-white hover:bg-emerald-50/40' : 'bg-gray-100 cursor-not-allowed'
                          }`}
                          onClick={() => toggleSlotSelection(time2, available2)}
                          title={`${time2} - ${available2 ? (isSelected2 ? 'Selezionato' : 'Disponibile') : 'Occupato'}`}
                        />
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-px h-4 bg-gray-300" />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-3 text-white bg-secondary rounded-lg shadow-sm hover:bg-secondary/90 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving && <Loader2 className="h-5 w-5 animate-spin" />}
          Salva modifiche
        </button>
        <Link
          href={`/dashboard/admin/corsi/${courseId}/lezioni/${dateParam}`}
          className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-3 text-white bg-[#023b52] rounded-lg shadow-sm hover:bg-[#023b52]/90 transition-all font-medium"
        >
          Annulla
        </Link>
      </div>
    </div>
  );
}
