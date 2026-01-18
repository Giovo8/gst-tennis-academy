import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");

    // Fetch invite code uses with related data
    const { data: uses, error } = await supabaseServer
      .from("invite_code_uses")
      .select(`
        id,
        invite_code_id,
        user_id,
        used_at
      `)
      .order("used_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error loading invite code logs:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!uses || uses.length === 0) {
      return NextResponse.json({ logs: [] });
    }

    // Get unique user IDs and invite code IDs
    const userIds = [...new Set(uses.map((u) => u.user_id).filter(Boolean))];
    const codeIds = [...new Set(uses.map((u) => u.invite_code_id).filter(Boolean))];

    // Fetch profiles
    let profilesMap = new Map();
    if (userIds.length > 0) {
      const { data: profiles } = await supabaseServer
        .from("profiles")
        .select("id, full_name, email, role")
        .in("id", userIds);

      profiles?.forEach((profile) => {
        profilesMap.set(profile.id, profile);
      });
    }

    // Fetch invite codes
    let codesMap = new Map();
    if (codeIds.length > 0) {
      const { data: codes } = await supabaseServer
        .from("invite_codes")
        .select("id, code, role")
        .in("id", codeIds);

      codes?.forEach((code) => {
        codesMap.set(code.id, code);
      });
    }

    // Enrich logs with profile and code data
    const logs = uses.map((use) => ({
      id: use.id,
      user_id: use.user_id,
      invite_code_id: use.invite_code_id,
      used_at: use.used_at,
      profile: use.user_id ? profilesMap.get(use.user_id) : null,
      invite_code: use.invite_code_id ? codesMap.get(use.invite_code_id) : null,
    }));

    return NextResponse.json({ logs });
  } catch (err: any) {
    console.error("Exception loading invite code logs:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
