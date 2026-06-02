import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";
import { requireAdminOrGestore } from "@/lib/ai-news/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const authResult = await requireAdminOrGestore();
    if (!authResult.ok) return authResult.response;

    const { data, error } = await supabaseServer
      .from("ai_news_generation_logs")
      .select("id, eseguito_a, tipo, cron_id, generate, skippate, errori")
      .order("eseguito_a", { ascending: false })
      .limit(20);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ items: data ?? [] });
  } catch {
    return NextResponse.json({ error: "Errore caricamento log" }, { status: 500 });
  }
}
