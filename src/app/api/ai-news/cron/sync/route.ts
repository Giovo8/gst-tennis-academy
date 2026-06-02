import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";
import { requireAdminOrGestore } from "@/lib/ai-news/auth";
import { syncSingleCronJob } from "@/lib/ai-news/utils";

export async function POST() {
  try {
    const authResult = await requireAdminOrGestore();
    if (!authResult.ok) return authResult.response;

    const { data: crons, error } = await supabaseServer
      .from("ai_news_cron")
      .select("id, attivo, ora, minuto");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const results: Array<{ id: string; ok: boolean; errore?: string }> = [];

    for (const cron of crons ?? []) {
      try {
        await syncSingleCronJob({
          id: cron.id,
          attivo: cron.attivo,
          ora: cron.ora,
          minuto: cron.minuto,
        });
        results.push({ id: cron.id, ok: true });
      } catch (error) {
        results.push({
          id: cron.id,
          ok: false,
          errore: error instanceof Error ? error.message : "Errore sincronizzazione",
        });
      }
    }

    return NextResponse.json({ synced: results });
  } catch {
    return NextResponse.json({ error: "Errore sincronizzazione cron" }, { status: 500 });
  }
}
