import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Fetch admin/gestore statistics
export async function GET(request: NextRequest) {
  try {
    const now = new Date().toISOString();
    const today = new Date().toISOString().split('T')[0];
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    // 1. Count total users
    const { count: totalUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    // 2. Count bookings today
    const { count: bookingsToday } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .gte("start_time", today + "T00:00:00")
      .lt("start_time", today + "T23:59:59")
      .neq("status", "cancelled");

    // 3. Count total bookings
    const { count: totalBookings } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true });

    // 4. Count active tournaments
    const { count: activeTournaments } = await supabase
      .from("tournaments")
      .select("*", { count: "exact", head: true })
      .eq("status", "In Corso");

    // 5. Count total tournaments
    const { count: totalTournaments } = await supabase
      .from("tournaments")
      .select("*", { count: "exact", head: true });

    // 6. Count upcoming bookings
    const { count: upcomingBookings } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .gte("start_time", now)
      .neq("status", "cancelled");

    // 7. Count pending confirmations
    const { count: pendingBookings } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("manager_confirmed", false)
      .gte("start_time", now);

    // 8. Count active courses
    const { count: activeCourses } = await supabase
      .from("courses")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    // 9. Count users by role
    const { data: roleData } = await supabase
      .from("profiles")
      .select("role");

    const usersByRole = {
      atleta: 0,
      maestro: 0,
      gestore: 0,
      admin: 0,
    };

    roleData?.forEach((user) => {
      if (user.role in usersByRole) {
        usersByRole[user.role as keyof typeof usersByRole]++;
      }
    });

    // 10. Count revenue this month (if payments table has data)
    const { data: payments } = await supabase
      .from("payments")
      .select("amount")
      .eq("status", "completed")
      .gte("created_at", startOfMonth);

    const monthlyRevenue = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

    // 11. Count new users this month
    const { count: newUsersThisMonth } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfMonth);

    // 12. Count pending enrollments
    const { count: pendingEnrollments } = await supabase
      .from("enrollments")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    return NextResponse.json({
      totalUsers: totalUsers || 0,
      bookingsToday: bookingsToday || 0,
      totalBookings: totalBookings || 0,
      activeTournaments: activeTournaments || 0,
      totalTournaments: totalTournaments || 0,
      upcomingBookings: upcomingBookings || 0,
      pendingBookings: pendingBookings || 0,
      activeCourses: activeCourses || 0,
      usersByRole,
      monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
      newUsersThisMonth: newUsersThisMonth || 0,
      pendingEnrollments: pendingEnrollments || 0,
    });
  } catch (err: any) {
    console.error("Error fetching admin stats:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
