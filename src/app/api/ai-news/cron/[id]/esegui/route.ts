import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";
import { requireAdminOrGestore } from "@/lib/ai-news/auth";
import { callGeneraNewsEdge } from "@/lib/ai-news/utils";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAdminOrGestore();
    if (!authResult.ok) return authResult.response;

    const { id } = await params;

    const { data: cron, error } = await supabaseServer
      .from("ai_news_cron")
      .select("id, categoria")
      .eq("id", id)
      .single();

    if (error || !cron) {
      return NextResponse.json({ error: "Cron non trovato" }, { status: 404 });
    }

    const response = await callGeneraNewsEdge({
      cron_id: cron.id,
      ...(cron.categoria ? { categoria: cron.categoria } : {}),
    });

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore esecuzione cron" },
      { status: 500 }
    );
  }
}
