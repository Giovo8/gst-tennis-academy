import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";
import { requireAdminOrGestore } from "@/lib/ai-news/auth";
import { normalizeCategoria, syncSingleCronJob, toBoolean } from "@/lib/ai-news/utils";

async function countCronAttivi(excludeId?: string) {
  let query = supabaseServer.from("ai_news_cron").select("id", { count: "exact", head: true }).eq("attivo", true);
  if (excludeId) query = query.neq("id", excludeId);
  const { count } = await query;
  return count ?? 0;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAdminOrGestore();
    if (!authResult.ok) return authResult.response;

    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const { data: current, error: currentError } = await supabaseServer
      .from("ai_news_cron")
      .select("id, nome, ora, minuto, categoria, prompt_custom, attivo")
      .eq("id", id)
      .single();

    if (currentError || !current) {
      return NextResponse.json({ error: "Cron non trovato" }, { status: 404 });
    }

    const nome = body?.nome !== undefined ? String(body.nome).trim() : current.nome;
    const ora = body?.ora !== undefined ? Number(body.ora) : current.ora;
    const minuto = body?.minuto !== undefined ? Number(body.minuto) : current.minuto;
    const categoria = body?.categoria !== undefined ? normalizeCategoria(body.categoria) : current.categoria;
    const promptCustom = body?.prompt_custom !== undefined ? (String(body.prompt_custom).trim() || null) : current.prompt_custom;
    const attivo = body?.attivo !== undefined ? toBoolean(body.attivo, current.attivo) : current.attivo;

    if (!nome || Number.isNaN(ora) || ora < 0 || ora > 23 || ![0, 15, 30, 45].includes(minuto)) {
      return NextResponse.json({ error: "Parametri cron non validi" }, { status: 400 });
    }

    if (attivo) {
      const attivi = await countCronAttivi(id);
      if (attivi >= 8) {
        return NextResponse.json(
          { error: "Puoi avere al massimo 8 cron attivi contemporaneamente" },
          { status: 400 }
        );
      }
    }

    const { data, error } = await supabaseServer
      .from("ai_news_cron")
      .update({ nome, ora, minuto, categoria, prompt_custom: promptCustom, attivo })
      .eq("id", id)
      .select("id, nome, ora, minuto, categoria, prompt_custom, attivo, ultimo_eseguito, creato_a")
      .single();

    if (error || !data) return NextResponse.json({ error: error?.message ?? "Errore aggiornamento cron" }, { status: 500 });

    await syncSingleCronJob({ id: data.id, attivo: data.attivo, ora: data.ora, minuto: data.minuto });

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore aggiornamento cron" },
      { status: 500 }
    );
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAdminOrGestore();
    if (!authResult.ok) return authResult.response;

    const { id } = await params;

    // Unschedule prima di eliminare.
    await syncSingleCronJob({ id, attivo: false, ora: 0, minuto: 0 });

    const { error } = await supabaseServer.from("ai_news_cron").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore eliminazione cron" },
      { status: 500 }
    );
  }
}
