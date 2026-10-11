import { NextResponse } from "next/server";
import { requireAdminOrGestore } from "@/lib/ai-news/auth";
import { callGeneraNewsEdge, normalizeCategoria } from "@/lib/ai-news/utils";

export const dynamic = "force-dynamic";

// La generazione (incluso il fallback senza AI quando Gemini non risponde) avviene
// interamente nella Edge Function `genera-news`: qui si delega e basta.
export async function POST(request: Request) {
  try {
    const authResult = await requireAdminOrGestore();
    if (!authResult.ok) return authResult.response;

    const body = await request.json().catch(() => ({}));
    const categoria = normalizeCategoria(body?.categoria);
    const cronId = typeof body?.cron_id === "string" ? body.cron_id : undefined;

    const data = await callGeneraNewsEdge({
      ...(categoria ? { categoria } : {}),
      ...(cronId ? { cron_id: cronId } : {}),
    });

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore durante la generazione" },
      { status: 500 }
    );
  }
}
