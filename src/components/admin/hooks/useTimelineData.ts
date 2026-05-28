"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { getCourts } from "@/lib/courts/getCourts";
import { DEFAULT_COURTS } from "@/lib/courts/constants";

export type Booking = {
  id: string;
  court: string;
  user_id: string;
  coach_id: string | null;
  start_time: string;
  end_time: string;
  status: string;
  type: string;
  notes: string | null;
  user_profile?: { full_name: string; email: string; phone?: string } | null;
  coach_profile?: { full_name: string; email: string; phone?: string } | null;
  participants?: Array<{
    id?: string;
    booking_id?: string;
    full_name: string;
    email?: string;
    phone?: string;
    is_registered: boolean;
    user_id?: string | null;
    order_index?: number;
  }>;
  isBlock?: boolean;
  isCourse?: boolean;
  reason?: string;
};

interface UseTimelineDataParams {
  selectedDate: Date;
  showCourses: boolean;
  showCourtBlocks: boolean;
  fetchOccupied: boolean;
  highlightUserId?: string;
}

export function useTimelineData({
  selectedDate,
  showCourses,
  showCourtBlocks,
  fetchOccupied,
  highlightUserId,
}: UseTimelineDataParams) {
  const [courts, setCourts] = useState<string[]>(DEFAULT_COURTS);
  const [courtsLoading, setCourtsLoading] = useState(true);
  const [courtBlocks, setCourtBlocks] = useState<Booking[]>([]);
  const [blocksLoading, setBlocksLoading] = useState(false);
  const [courseEntries, setCourseEntries] = useState<Booking[]>([]);
  const [allOccupiedBookings, setAllOccupiedBookings] = useState<any[]>([]);

  useEffect(() => {
    void loadCourtsFromDB();
  }, []);

  useEffect(() => {
    if (!showCourses) {
      setCourseEntries([]);
      return;
    }
    void loadCourseEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, showCourses]);

  useEffect(() => {
    if (!showCourtBlocks) {
      setCourtBlocks([]);
      setBlocksLoading(false);
      return;
    }
    void loadCourtBlocks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, showCourtBlocks]);

  useEffect(() => {
    if (!fetchOccupied) return;
    const dateStr = selectedDate.toISOString().split("T")[0];
    const fetchAll = async () => {
      try {
        const results = await Promise.all(
          courts.map((court) =>
            fetch(`/api/bookings/availability?date=${dateStr}&court=${encodeURIComponent(court)}`)
              .then((r) => (r.ok ? r.json() : { bookings: [] }))
              .then((d) => (d.bookings ?? []) as Record<string, unknown>[])
          )
        );
        setAllOccupiedBookings(results.flat());
      } catch (err) {
        console.error("Error fetching occupied bookings:", err);
      }
    };
    void fetchAll();
  }, [selectedDate, courts, fetchOccupied]);

  async function loadCourtsFromDB() {
    setCourtsLoading(true);
    try {
      const courtsData = await getCourts();
      setCourts(courtsData);
    } catch (error) {
      console.error("Error loading courts:", error);
    } finally {
      setCourtsLoading(false);
    }
  }

  async function loadCourseEntries() {
    const DAY_CODES = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
    const dayCode = DAY_CODES[selectedDate.getDay()];
    const dateStr = selectedDate.toISOString().split("T")[0];
    const selectFields =
      "id, name, court_name, instructor_name, schedule_time, schedule_days, start_date, end_date, is_active, cancelled_dates, extra_dates, lesson_overrides, lesson_time_overrides, schedule_periods";

    const [q1, q2] = await Promise.all([
      supabase
        .from("courses")
        .select(selectFields)
        .eq("is_active", true)
        .contains("schedule_days", [dayCode]),
      supabase
        .from("courses")
        .select(selectFields)
        .eq("is_active", true)
        .contains("extra_dates", [dateStr]),
    ]);

    const seen = new Set<string>();
    const allData = [...(q1.data ?? []), ...(q2.data ?? [])].filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });

    const allInstructorNames = allData.flatMap((c) =>
      (c.instructor_name ?? "").split(", ").filter(Boolean)
    );
    const uniqueNames = [...new Set(allInstructorNames)];
    const nameToId = new Map<string, string>();
    if (uniqueNames.length > 0) {
      const { data: instructorProfiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("full_name", uniqueNames);
      (instructorProfiles ?? []).forEach((p: { id: string; full_name: string }) => {
        nameToId.set(p.full_name, p.id);
      });
    }

    const entries: Booking[] = [];
    for (const c of allData) {
      const isExtraDate = (c.extra_dates ?? []).includes(dateStr);
      const isScheduledDay = (c.schedule_days ?? []).includes(dayCode);
      if ((c.cancelled_dates ?? []).includes(dateStr)) continue;
      if (isScheduledDay && !isExtraDate) {
        if (c.start_date && c.start_date > dateStr) continue;
        if (c.end_date && c.end_date < dateStr) continue;
      }

      let timeStr: string = c.schedule_time || "";
      if (c.lesson_time_overrides?.[dateStr]) {
        timeStr = c.lesson_time_overrides[dateStr];
      } else if (c.schedule_periods?.length > 0) {
        const period = c.schedule_periods.find((p: { days: string[] }) =>
          p.days?.includes(dayCode)
        );
        if (period?.time) timeStr = period.time;
      }

      let courtName: string | null = c.court_name;
      if (c.lesson_overrides?.[dateStr]) {
        courtName = c.lesson_overrides[dateStr];
      } else if (c.schedule_periods?.length > 0) {
        const period = c.schedule_periods.find((p: { days: string[] }) =>
          p.days?.includes(dayCode)
        );
        if (period?.court) courtName = period.court;
      }

      if (!courtName) continue;

      const rangeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*[–\-]\s*(\d{1,2}):(\d{2})/);
      const startHour = rangeMatch ? parseInt(rangeMatch[1], 10) : 9;
      const startMinute = rangeMatch ? parseInt(rangeMatch[2], 10) : 0;
      const endHour = rangeMatch ? parseInt(rangeMatch[3], 10) : startHour + 1;
      const endMinute = rangeMatch ? parseInt(rangeMatch[4], 10) : startMinute;
      const startTime = new Date(selectedDate);
      startTime.setHours(startHour, startMinute, 0, 0);
      const endTime = new Date(selectedDate);
      endTime.setHours(endHour, endMinute, 0, 0);

      const instructorNames = (c.instructor_name ?? "").split(", ").filter(Boolean);
      const instructorIds = instructorNames
        .map((n: string) => nameToId.get(n))
        .filter(Boolean) as string[];
      const resolvedCoachId =
        instructorIds.length > 0
          ? highlightUserId && instructorIds.includes(highlightUserId)
            ? highlightUserId
            : instructorIds[0]
          : null;

      entries.push({
        id: c.id,
        court: courtName,
        user_id: "",
        coach_id: resolvedCoachId,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: "confirmed",
        type: "corso",
        notes: c.name,
        isCourse: true,
        user_profile: c.instructor_name ? { full_name: c.instructor_name, email: "" } : null,
      } as Booking);
    }
    setCourseEntries(entries);
  }

  async function loadCourtBlocks() {
    if (!showCourtBlocks) {
      setCourtBlocks([]);
      setBlocksLoading(false);
      return;
    }
    setBlocksLoading(true);
    try {
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const { data: blocksData } = await supabase
        .from("court_blocks")
        .select("*")
        .eq("is_disabled", false)
        .gte("start_time", startOfDay.toISOString())
        .lte("start_time", endOfDay.toISOString())
        .order("start_time", { ascending: true });

      const blockEntries: Booking[] =
        blocksData?.map((block) => ({
          id: block.id,
          court: block.court_id,
          user_id: "",
          coach_id: null,
          start_time: block.start_time,
          end_time: block.end_time,
          status: "blocked",
          type: "blocco",
          notes: block.reason,
          reason: block.reason,
          isBlock: true,
          user_profile: null,
          coach_profile: null,
        })) || [];

      setCourtBlocks(blockEntries);
    } catch (error) {
      console.error("Error loading court blocks:", error);
    } finally {
      setBlocksLoading(false);
    }
  }

  return {
    courts,
    courtsLoading,
    courtBlocks,
    blocksLoading,
    courseEntries,
    allOccupiedBookings,
  };
}
