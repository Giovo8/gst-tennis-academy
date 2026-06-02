import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";
import { requireAdminOrGestore } from "@/lib/ai-news/auth";

export const dynamic = "force-dynamic";

async function ensureConfigRow(userId?: string) {
  const { data: existing } = await supabaseServer
    .from("ai_news_config")
    .select("*")
    .order("aggiornato_a", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return existing;

  const { data, error } = await supabaseServer
    .from("ai_news_config")
    .insert({ pubblicazione_auto: false, numero_post: 5, aggiornato_da: userId ?? null })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function GET() {
  try {
    const authResult = await requireAdminOrGestore();
    if (!authResult.ok) return authResult.response;

    const data = await ensureConfigRow(authResult.auth.user.id);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore caricamento configurazione" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireAdminOrGestore();
    if (!authResult.ok) return authResult.response;

    const body = await request.json().catch(() => ({}));
    const pubblicazioneAuto = Boolean(body?.pubblicazione_auto);
    const existing = await ensureConfigRow(authResult.auth.user.id);
    const parsedNumeroPost = Number(body?.numero_post);
    const numeroPost = Number.isFinite(parsedNumeroPost) && parsedNumeroPost > 0
      ? Math.floor(parsedNumeroPost)
      : Number((existing as { numero_post?: number | null } | null)?.numero_post ?? 5);

    const { data, error } = await supabaseServer
      .from("ai_news_config")
      .update({
        pubblicazione_auto: pubblicazioneAuto,
        numero_post: numeroPost,
        aggiornato_a: new Date().toISOString(),
        aggiornato_da: authResult.auth.user.id,
      })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Errore salvataggio configurazione" }, { status: 500 });
  }
}
