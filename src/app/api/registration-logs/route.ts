import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");

    // Fetch profiles ordered by creation date (most recent registrations)
    const { data: profiles, error } = await supabaseServer
      .from("profiles")
      .select("id, full_name, email, role, phone, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error loading registration logs:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform profiles into registration logs format
    const logs = profiles?.map((profile) => ({
      id: profile.id,
      user_id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
      role: profile.role,
      phone: profile.phone,
      registered_at: profile.created_at,
    }));

    return NextResponse.json({ logs });
  } catch (err: any) {
    console.error("Exception loading registration logs:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
