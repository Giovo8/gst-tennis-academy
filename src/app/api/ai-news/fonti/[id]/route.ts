import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";
import { requireAdminOrGestore } from "@/lib/ai-news/auth";
import { normalizeCategoria, toBoolean } from "@/lib/ai-news/utils";


export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAdminOrGestore();
    if (!authResult.ok) return authResult.response;

    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const payload: Record<string, unknown> = {};

    if (body?.nome !== undefined) payload.nome = String(body.nome).trim();
    if (body?.url !== undefined) payload.url = String(body.url).trim();
    if (body?.categoria !== undefined) payload.categoria = normalizeCategoria(body.categoria);
    if (body?.attiva !== undefined) payload.attiva = toBoolean(body.attiva, true);

    if (typeof payload.url === "string") {
      try {
        new URL(payload.url);
      } catch {
        return NextResponse.json({ error: "URL feed non valido" }, { status: 400 });
      }
    }

    const { data, error } = await supabaseServer
      .from("ai_news_fonti")
      .update(payload)
      .eq("id", id)
      .select("id, nome, url, categoria, attiva, creato_a")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Errore aggiornamento fonte" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAdminOrGestore();
    if (!authResult.ok) return authResult.response;

    const { id } = await params;

    const { error } = await supabaseServer.from("ai_news_fonti").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Errore eliminazione fonte" }, { status: 500 });
  }
}
