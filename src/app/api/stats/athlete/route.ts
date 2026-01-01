import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Fetch athlete statistics
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

    // 1. Get subscription credits
    const { data: credits } = await supabase
      .from("subscription_credits")
      .select("credits_available, weekly_credits")
      .eq("user_id", userId)
      .single();

    // 2. Get next upcoming booking
    const now = new Date().toISOString();
    const { data: nextBooking } = await supabase
      .from("bookings")
      .select("start_time, end_time, court, type")
      .eq("user_id", userId)
      .gte("start_time", now)
      .order("start_time", { ascending: true })
      .limit(1)
      .single();

    // 3. Count total completed bookings
    const { count: totalBookings } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .neq("status", "cancelled");

    // 4. Count total bookings (all time)
    const { count: allBookings } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    // 5. Count tournaments participated
    const { count: tournamentsCount } = await supabase
      .from("tournament_participants")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    // 6. Count upcoming bookings
    const { count: upcomingBookings } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("start_time", now)
      .neq("status", "cancelled");

    // 7. Count active course enrollments
    const { count: activeCourses } = await supabase
      .from("enrollments")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("status", ["confirmed", "pending"]);

    // 8. Count unread notifications
    const { count: unreadNotifications } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    return NextResponse.json({
      credits: {
        available: credits?.credits_available || 0,
        weekly: credits?.weekly_credits || 0,
      },
      nextBooking: nextBooking ? {
        startTime: nextBooking.start_time,
        endTime: nextBooking.end_time,
        court: nextBooking.court,
        type: nextBooking.type,
      } : null,
      totalBookings: totalBookings || 0,
      allTimeBookings: allBookings || 0,
      tournamentsCount: tournamentsCount || 0,
      upcomingBookings: upcomingBookings || 0,
      activeCourses: activeCourses || 0,
      unreadNotifications: unreadNotifications || 0,
    });
  } catch (err: any) {
    console.error("Error fetching athlete stats:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
