"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import { GraduationCap, Loader2 } from "lucide-react";

type CourseData = {
  id: string;
  name: string;
  schedule_periods: { days: string[]; time: string | null; court: string | null }[] | null;
  court_name: string | null;
  schedule_time: string | null;
  lesson_overrides: Record<string, string> | null;
  lesson_time_overrides: Record<string, string> | null;
};

const DAY_CODE: Record<number, string> = {
  0: "dom", 1: "lun", 2: "mar", 3: "mer", 4: "gio", 5: "ven", 6: "sab",
};

function getCourtForDate(course: CourseData, dateStr: string): string | null {
  if (course.lesson_overrides?.[dateStr]) return course.lesson_overrides[dateStr];
  if (course.schedule_periods?.length) {
    const dayCode = DAY_CODE[new Date(dateStr + "T12:00:00").getDay()];
    const period = course.schedule_periods.find((p) => p.days?.includes(dayCode));
    if (period?.court) return period.court;
  }
  return course.court_name;
}

function getTimeForDate(course: CourseData, dateStr: string): string | null {
  if (course.lesson_time_overrides?.[dateStr]) return course.lesson_time_overrides[dateStr];
  if (course.schedule_periods?.length) {
    const dayCode = DAY_CODE[new Date(dateStr + "T12:00:00").getDay()];
    const period = course.schedule_periods.find((p) => p.days?.includes(dayCode));
    if (period?.time) return period.time;
  }
  return course.schedule_time;
}

export default function CourseBookingDetailPage() {
  const params = useParams();
  const courseId = Array.isArray(params?.id) ? params.id[0] : (params?.id ?? "");
  const dateStr = Array.isArray(params?.date) ? params.date[0] : (params?.date ?? "");

  const [course, setCourse] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!courseId) return;
    supabase
      .from("courses")
      .select("id, name, schedule_periods, court_name, schedule_time, lesson_overrides, lesson_time_overrides")
      .eq("id", courseId)
      .single()
      .then(({ data }) => {
        setCourse(data);
        setLoading(false);
      });
  }, [courseId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-secondary/40" />
      </div>
    );
  }

  if (!course) return null;

  const court = getCourtForDate(course, dateStr);
  const time = getTimeForDate(course, dateStr);
  const dateObj = dateStr ? new Date(dateStr + "T12:00:00") : null;
  const dateDisplay = dateObj
    ? dateObj
        .toLocaleDateString("it-IT", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })
        .replace(/^\w/, (c) => c.toUpperCase())
    : "";

  return (
    <div className="space-y-6 pt-3">
      {/* Breadcrumb */}
      <div>
        <p className="breadcrumb text-secondary/60">
          <Link href="/dashboard/maestro/bookings" className="hover:text-secondary/80 transition-colors">
            Prenotazioni
          </Link>
          {" › "}
          <span>Dettaglio Corso</span>
        </p>

        <h1 className="text-4xl font-bold text-secondary">Dettaglio Corso</h1>
      </div>

      {/* Header */}
      <div
        className="rounded-xl border-t border-r border-b p-6 border-l-4"
        style={{
          backgroundColor: "var(--color-frozen-lake-900)",
          borderColor: "var(--color-frozen-lake-900)",
          borderLeftColor: "#023047",
        }}
      >
        <div className="flex items-start gap-6">
          <GraduationCap className="h-8 w-8 text-white flex-shrink-0" strokeWidth={2.5} />
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white">{course.name}</h2>
          </div>
        </div>
      </div>

      {/* Dettagli lezione */}
      <div className="page-card">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
          <h2 className="text-base sm:text-lg font-semibold text-secondary">Dettagli lezione</h2>
        </div>
        <div className="p-6 space-y-6">
          {dateDisplay && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Data</label>
              <p className="text-secondary font-semibold">{dateDisplay}</p>
            </div>
          )}
          {time && (
            <div className={`flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 ${court ? "pb-6 border-b border-gray-200" : ""}`}>
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Orario</label>
              <p className="text-secondary font-semibold">{time}</p>
            </div>
          )}
          {court && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Campo</label>
              <p className="text-secondary font-semibold">{court}</p>
            </div>
          )}
        </div>
      </div>

      {/* Azioni */}
      <div className="flex flex-col sm:flex-row gap-3">
        {dateStr && (
          <Link
            href={`/dashboard/maestro/corsi/${courseId}/lezioni/${dateStr}`}
            className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-3 text-white bg-[#022431] rounded-lg hover:bg-[#022431]/90 transition-all font-medium"
          >
            Presenze lezione
          </Link>
        )}
        <Link
          href={`/dashboard/maestro/corsi/${courseId}`}
          className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-3 text-white bg-[#023047] rounded-lg hover:bg-[#023047]/90 transition-all font-medium"
        >
          Vai al corso
        </Link>
      </div>
    </div>
  );
}
