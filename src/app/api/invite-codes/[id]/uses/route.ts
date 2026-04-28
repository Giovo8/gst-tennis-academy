import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: codeId } = await params;

  // 1. Fetch the invite code to get the code string
  const { data: inviteCode } = await supabaseServer
    .from("invite_codes")
    .select("id, code")
    .eq("id", codeId)
    .single();

  if (!inviteCode) {
    return NextResponse.json({ uses: [] });
  }

  // 2. Fetch uses from invite_code_uses (new flow)
  const { data: uses } = await supabaseServer
    .from("invite_code_uses")
    .select("user_id, used_at")
    .eq("invite_code_id", codeId)
    .order("used_at", { ascending: false });

  // 3. Fetch uses from activity_logs (old flow: action='invite_code_used', entity_id=code string)
  const { data: logs } = await supabaseServer
    .from("activity_logs")
    .select("user_id, created_at")
    .eq("action", "invite_code_used")
    .eq("entity_id", inviteCode.code)
    .order("created_at", { ascending: false });

  // 4. Merge and deduplicate by user_id
  const usesMap = new Map<string, { user_id: string; used_at: string }>();

  (uses || []).forEach((u: any) => {
    usesMap.set(u.user_id, { user_id: u.user_id, used_at: u.used_at });
  });
  (logs || []).forEach((l: any) => {
    if (!usesMap.has(l.user_id)) {
      usesMap.set(l.user_id, { user_id: l.user_id, used_at: l.created_at });
    }
  });

  const merged = Array.from(usesMap.values());

  if (merged.length === 0) {
    return NextResponse.json({ uses: [] });
  }

  // 5. Fetch profiles
  const userIds = merged.map((u) => u.user_id);
  const { data: profiles } = await supabaseServer
    .from("profiles")
    .select("id, full_name, email")
    .in("id", userIds);

  const result = merged.map((u) => ({
    ...u,
    profile: profiles?.find((p: any) => p.id === u.user_id) || null,
  }));

  return NextResponse.json({ uses: result });
}
