import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";
import { requireAdminOrGestore } from "@/lib/ai-news/auth";
import { sanitizeAINewsBody, sanitizeAINewsTitle } from "@/lib/ai-news/contentSanitizer";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAdminOrGestore();
    if (!authResult.ok) return authResult.response;

    const body = await request.json().catch(() => ({}));
    const title = sanitizeAINewsTitle(String(body?.titolo ?? "").trim());
    const testo = sanitizeAINewsBody(String(body?.testo ?? "").trim());

    if (!title || !testo) {
      return NextResponse.json({ error: "Titolo e testo sono obbligatori" }, { status: 400 });
    }

    const { id } = await params;

    const { data, error } = await supabaseServer
      .from("news")
      .update({
        title,
        content: testo,
        excerpt: testo.slice(0, 220),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id, title, content, excerpt, updated_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Errore aggiornamento news" }, { status: 500 });
  }
}
