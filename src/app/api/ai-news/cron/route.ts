import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";
import { requireAdminOrGestore } from "@/lib/ai-news/auth";
import { normalizeCategoria, syncSingleCronJob, toBoolean } from "@/lib/ai-news/utils";

export const dynamic = "force-dynamic";

async function countCronAttivi(excludeId?: string) {
  let query = supabaseServer.from("ai_news_cron").select("id", { count: "exact", head: true }).eq("attivo", true);
  if (excludeId) {
    query = query.neq("id", excludeId);
  }
  const { count } = await query;
  return count ?? 0;
}

export async function GET() {
  try {
    const authResult = await requireAdminOrGestore();
    if (!authResult.ok) return authResult.response;

    const { data, error } = await supabaseServer
      .from("ai_news_cron")
      .select("id, nome, ora, minuto, categoria, prompt_custom, attivo, ultimo_eseguito, creato_a")
      .order("creato_a", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ items: data ?? [] });
  } catch {
    return NextResponse.json({ error: "Errore caricamento cron" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireAdminOrGestore();
    if (!authResult.ok) return authResult.response;

    const body = await request.json().catch(() => ({}));

    const nome = String(body?.nome ?? "").trim();
    const ora = Number(body?.ora);
    const minuto = Number(body?.minuto ?? 0);
    const categoria = normalizeCategoria(body?.categoria);
    const promptCustom = String(body?.prompt_custom ?? "").trim() || null;
    const attivo = toBoolean(body?.attivo, true);

    if (!nome || Number.isNaN(ora) || ora < 0 || ora > 23 || ![0, 15, 30, 45].includes(minuto)) {
      return NextResponse.json({ error: "Parametri cron non validi" }, { status: 400 });
    }

    if (attivo) {
      const attivi = await countCronAttivi();
      if (attivi >= 8) {
        return NextResponse.json(
          { error: "Puoi avere al massimo 8 cron attivi contemporaneamente" },
          { status: 400 }
        );
      }
    }

    const { data, error } = await supabaseServer
      .from("ai_news_cron")
      .insert({
        nome,
        ora,
        minuto,
        categoria,
        prompt_custom: promptCustom,
        attivo,
      })
      .select("id, nome, ora, minuto, categoria, prompt_custom, attivo, ultimo_eseguito, creato_a")
      .single();

    if (error || !data) return NextResponse.json({ error: error?.message ?? "Errore creazione cron" }, { status: 500 });

    await syncSingleCronJob({ id: data.id, attivo: data.attivo, ora: data.ora, minuto: data.minuto });

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore creazione cron" },
      { status: 500 }
    );
  }
}
