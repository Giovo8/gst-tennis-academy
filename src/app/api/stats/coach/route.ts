import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Fetch coach/maestro statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");

    if (!userId) {
      return NextResponse.json(
        { error: "user_id is required" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const today = new Date().toISOString().split('T')[0];
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    // 1. Count lessons today
    const { count: lessonsToday } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("coach_id", userId)
      .in("type", ["lezione_privata", "lezione_gruppo"])
      .gte("start_time", today + "T00:00:00")
      .lt("start_time", today + "T23:59:59");

    // 2. Count unique athletes assigned (based on bookings)
    const { data: athletesData } = await supabase
      .from("bookings")
      .select("user_id")
      .eq("coach_id", userId)
      .neq("status", "cancelled");

    const uniqueAthletes = new Set(athletesData?.map(b => b.user_id) || []).size;

    // 3. Calculate total hours this month
    const { data: monthBookings } = await supabase
      .from("bookings")
      .select("start_time, end_time")
      .eq("coach_id", userId)
      .gte("start_time", startOfMonth)
      .neq("status", "cancelled");

    let totalHours = 0;
    if (monthBookings) {
      totalHours = monthBookings.reduce((sum, booking) => {
        const start = new Date(booking.start_time).getTime();
        const end = new Date(booking.end_time).getTime();
        const hours = (end - start) / (1000 * 60 * 60);
        return sum + hours;
      }, 0);
    }

    // 4. Count upcoming lessons
    const { count: upcomingLessons } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("coach_id", userId)
      .gte("start_time", now)
      .neq("status", "cancelled");

    // 5. Count pending confirmations
    const { count: pendingConfirmations } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("coach_id", userId)
      .eq("coach_confirmed", false)
      .gte("start_time", now);

    // 6. Count courses managed
    const { count: coursesManaged } = await supabase
      .from("courses")
      .select("*", { count: "exact", head: true })
      .eq("coach_id", userId)
      .eq("is_active", true);

    // 7. Count total lessons all time
    const { count: totalLessons } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("coach_id", userId)
      .in("type", ["lezione_privata", "lezione_gruppo"]);

    return NextResponse.json({
      lessonsToday: lessonsToday || 0,
      uniqueAthletes: uniqueAthletes || 0,
      hoursThisMonth: Math.round(totalHours * 10) / 10, // Round to 1 decimal
      upcomingLessons: upcomingLessons || 0,
      pendingConfirmations: pendingConfirmations || 0,
      coursesManaged: coursesManaged || 0,
      totalLessons: totalLessons || 0,
    });
  } catch (err: any) {
    console.error("Error fetching coach stats:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
