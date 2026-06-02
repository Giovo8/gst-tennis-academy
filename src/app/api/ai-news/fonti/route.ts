import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";
import { requireAdminOrGestore } from "@/lib/ai-news/auth";
import { normalizeCategoria, toBoolean } from "@/lib/ai-news/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const authResult = await requireAdminOrGestore();
    if (!authResult.ok) return authResult.response;

    const { data, error } = await supabaseServer
      .from("ai_news_fonti")
      .select("id, nome, url, categoria, attiva, creato_a")
      .order("creato_a", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ items: data ?? [] });
  } catch {
    return NextResponse.json({ error: "Errore caricamento fonti" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireAdminOrGestore();
    if (!authResult.ok) return authResult.response;

    const body = await request.json().catch(() => ({}));

    const nome = String(body?.nome ?? "").trim();
    const url = String(body?.url ?? "").trim();
    const categoria = normalizeCategoria(body?.categoria);
    const attiva = toBoolean(body?.attiva, true);

    if (!nome || !url) {
      return NextResponse.json({ error: "Nome e URL sono obbligatori" }, { status: 400 });
    }

    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "URL feed non valido" }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from("ai_news_fonti")
      .insert({ nome, url, categoria, attiva })
      .select("id, nome, url, categoria, attiva, creato_a")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Errore creazione fonte" }, { status: 500 });
  }
}
