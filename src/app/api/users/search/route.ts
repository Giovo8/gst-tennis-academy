import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET - Search users for messaging
export async function GET(request: NextRequest) {
  try {
    // Try to get user from session first
    const supabaseSession = await createClient();
    const { data: { user } } = await supabaseSession.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || "";

    if (!query || query.length < 2) {
      return NextResponse.json([]);
    }

    // Use service role client to bypass RLS for search
    const { data: users, error } = await supabaseServer
      .from("profiles")
      .select("id, full_name, email, avatar_url, role")
      .neq("id", user.id)
      .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(10);

    if (error) {
      console.error("Error searching users:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(users || []);
  } catch (error: any) {
    console.error("Exception in search route:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
