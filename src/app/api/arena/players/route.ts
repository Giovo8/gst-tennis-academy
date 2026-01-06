import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Ottieni l'utente corrente dalla richiesta
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
    }

    // Carica tutti gli utenti tranne l'utente corrente
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, email, role")
      .neq("id", user.id)
      .order("full_name", { ascending: true });

    if (profilesError) {
      console.error("Error loading profiles:", profilesError);
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    // Carica le statistiche arena
    const { data: stats } = await supabase
      .from("arena_stats")
      .select("user_id, ranking, points, wins, losses, level, total_matches, win_rate");

    // Combina i dati
    const statsMap = new Map(stats?.map(s => [s.user_id, s]) || []);
    const players = (profiles || []).map(p => ({
      id: p.id,
      full_name: p.full_name || "Giocatore",
      avatar_url: p.avatar_url,
      email: p.email,
      arena_stats: statsMap.get(p.id) || null,
    }));

    return NextResponse.json({ players });
  } catch (error: any) {
    console.error("Error in /api/arena/players:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
