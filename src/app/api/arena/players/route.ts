import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, isAdminOrGestore } from "@/lib/auth/verifyAuth";
import { supabaseServer } from "@/lib/supabase/serverClient";

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) return authResult.response;

    const isAdmin = isAdminOrGestore(authResult.data.profile?.role);
    const currentUserId = authResult.data.user.id;

    // Carica tutti gli utenti tranne l'utente corrente
    const { data: profiles, error: profilesError } = await supabaseServer
      .from("profiles")
      .select("id, full_name, avatar_url, email")
      .neq("id", currentUserId)
      .order("full_name", { ascending: true });

    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    // Carica le statistiche arena
    const { data: stats } = await supabaseServer
      .from("arena_stats")
      .select("user_id, ranking, points, wins, losses, level, total_matches, win_rate");

    // Combina i dati — email visibile solo agli admin
    const statsMap = new Map(stats?.map(s => [s.user_id, s]) || []);
    const players = (profiles || []).map(p => ({
      id: p.id,
      full_name: p.full_name || "Giocatore",
      avatar_url: p.avatar_url,
      ...(isAdmin ? { email: p.email } : {}),
      arena_stats: statsMap.get(p.id) || null,
    }));

    return NextResponse.json({ players });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Errore interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
