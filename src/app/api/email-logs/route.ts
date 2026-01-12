import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");

    // Use server client with service role to bypass RLS
    const { data: logs, error } = await supabaseServer
      .from("email_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error loading email logs:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ logs });
  } catch (err: any) {
    console.error("Exception loading email logs:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
