import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";
import { requireAdminOrGestore } from "@/lib/ai-news/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authResult = await requireAdminOrGestore();
    if (!authResult.ok) return authResult.response;

    const { searchParams } = new URL(request.url);
    const stato = String(searchParams.get("stato") || "bozza").toLowerCase();

    let query = supabaseServer
      .from("news")
      .select("id, title, content, excerpt, category, created_at, stato, ai_generated, fonte_nome, fonte_url")
      .eq("ai_generated", true)
      .order("created_at", { ascending: false });

    if (stato !== "tutte") {
      query = query.eq("stato", stato);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ items: data ?? [] });
  } catch {
    return NextResponse.json({ error: "Errore caricamento bozze" }, { status: 500 });
  }
}
