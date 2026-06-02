import env from "@/lib/config/env";
import { supabaseServer } from "@/lib/supabase/serverClient";

export function normalizeCategoria(value: unknown): string | null {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw || raw === "tutte") return null;
  return raw;
}

export function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "true";
  return fallback;
}

export async function syncSingleCronJob(input: {
  id: string;
  attivo: boolean;
  ora: number;
  minuto: number;
}) {
  const supabaseUrl = env.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.supabaseServiceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Variabili Supabase mancanti per la sincronizzazione cron");
  }

  const { error } = await supabaseServer.rpc("ai_news_sync_cron_job", {
    p_cron_id: input.id,
    p_attivo: input.attivo,
    p_ora: input.ora,
    p_minuto: input.minuto,
    p_supabase_url: supabaseUrl,
    p_service_key: serviceKey,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function callGeneraNewsEdge(payload: Record<string, unknown>) {
  const supabaseUrl = env.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.supabaseServiceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Configurazione Supabase incompleta");
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/genera-news`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (
      response.status === 404 ||
      data?.code === "NOT_FOUND" ||
      data?.message === "Requested function was not found"
    ) {
      throw new Error(
        "La funzione Supabase 'genera-news' non risulta deployata. Esegui il deploy della funzione e riprova."
      );
    }

    const message = typeof data?.error === "string" ? data.error : "Errore durante la generazione news";
    throw new Error(message);
  }

  return data;
}

export function mapStatoToLegacy(stato: string) {
  const isPublished = stato === "pubblicata";
  return {
    is_published: isPublished,
    published_at: isPublished ? new Date().toISOString() : null,
  };
}
