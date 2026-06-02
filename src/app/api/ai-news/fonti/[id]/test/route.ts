import { NextResponse } from "next/server";
import Parser from "rss-parser";
import { supabaseServer } from "@/lib/supabase/serverClient";
import { requireAdminOrGestore } from "@/lib/ai-news/auth";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAdminOrGestore();
    if (!authResult.ok) return authResult.response;

    const { id } = await params;
    const { data, error } = await supabaseServer
      .from("ai_news_fonti")
      .select("nome, url")
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Fonte non trovata" }, { status: 404 });
    }

    const parser = new Parser();
    const feed = await parser.parseURL(data.url);

    return NextResponse.json({
      ok: true,
      titolo_feed: feed.title ?? data.nome,
      articoli_trovati: (feed.items ?? []).length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Feed non raggiungibile",
      },
      { status: 400 }
    );
  }
}
