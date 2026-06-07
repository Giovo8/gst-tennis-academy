import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { requireAdminOrGestore } from "@/lib/ai-news/auth";
import { sanitizeAINewsBody, sanitizeAINewsTitle } from "@/lib/ai-news/contentSanitizer";
import { supabaseServer } from "@/lib/supabase/serverClient";

export const dynamic = "force-dynamic";

const BATCH_SIZE = 100;

// Euristico leggero: controlla se il testo sembra inglese contando stopword comuni.
function looksEnglish(text: string): boolean {
  const sample = text.slice(0, 800).toLowerCase();
  const hits = ["the ", " and ", " is ", " are ", " was ", " has ", " have ", " his ", " her ", " for ", " with ", " that ", " this ", " from ", " they "].filter(
    (w) => sample.includes(w)
  );
  return hits.length >= 3;
}

async function translateToItalian(
  model: InstanceType<typeof GoogleGenerativeAI>["getGenerativeModel"] extends (...args: never[]) => infer R ? R : never,
  title: string,
  content: string
): Promise<{ titolo: string; testo: string } | null> {
  const prompt = [
    "Traduci in italiano giornalistico questo articolo di tennis.",
    "Mantieni tutti i numeri, nomi propri, classifiche e statistiche invariati.",
    "Rispondi SOLO con JSON valido: { titolo: '...', testo: '...' }",
    `Titolo originale: ${title}`,
    `Testo originale: ${content.slice(0, 3000)}`,
  ].join("\n");

  try {
    const res = await model.generateContent(prompt);
    const raw = res.response.text();
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    if (typeof parsed?.titolo === "string" && typeof parsed?.testo === "string") {
      return { titolo: parsed.titolo.trim(), testo: parsed.testo.trim() };
    }
    return null;
  } catch {
    return null;
  }
}

type CleanupRow = {
  id: string;
  title: string | null;
  content: string | null;
  excerpt: string | null;
  category: string | null;
};

export async function POST(request: Request) {
  try {
    const authResult = await requireAdminOrGestore();
    if (!authResult.ok) return authResult.response;

    const body = await request.json().catch(() => ({}));
    const dryRun = Boolean(body?.dryRun);

    const geminiApiKey = process.env.GEMINI_API_KEY;
    const gemini = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;
    const model = gemini ? gemini.getGenerativeModel({ model: "gemini-2.0-flash" }) : null;
    const geminiAvailable = model !== null;

    let scanned = 0;
    let updated = 0;
    let translated = 0;
    const errors: string[] = [];
    let offset = 0;

    while (true) {
      const { data, error } = await supabaseServer
        .from("news")
        .select("id, title, content, excerpt, category")
        .eq("ai_generated", true)
        .order("created_at", { ascending: false })
        .range(offset, offset + BATCH_SIZE - 1);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const rows = (data ?? []) as CleanupRow[];
      if (rows.length === 0) break;

      scanned += rows.length;

      for (const row of rows) {
        // Usa fallback stringa vuota invece di "News Tennis" per non sporcare il titolo.
        const rawSanitizedTitle = sanitizeAINewsTitle(row.title || "");
        let nextTitle = rawSanitizedTitle === "News Tennis" ? (row.title || "").trim() : rawSanitizedTitle;
        // Se il titolo era già "News Tennis" (fallback da bug precedente),
        // prova a ricavarlo dalla prima frase del contenuto.
        if (!nextTitle || nextTitle === "News Tennis") {
          const rawContent = row.content || "";
          const firstSentence = rawContent.split(/(?<=[.!?])\s+/)[0] ?? "";
          const derived = firstSentence.replace(/<[^>]+>/g, "").trim().slice(0, 120);
          if (derived) nextTitle = derived;
        }
        let nextContent = sanitizeAINewsBody(row.content || "");
        const nextCategory = "notizie";
        let wasTranslated = false;

        // Rilevamento e traduzione post in inglese.
        const combinedText = `${nextTitle} ${nextContent}`;
        if (model && looksEnglish(combinedText)) {
          const translated_result = await translateToItalian(model, nextTitle, nextContent);
          if (translated_result) {
            const tTitle = sanitizeAINewsTitle(translated_result.titolo);
            const tContent = sanitizeAINewsBody(translated_result.testo);
            // Accetta il risultato solo se non è vuoto e Gemini non ha restituito "News Tennis".
            if (tTitle && tTitle !== "News Tennis") nextTitle = tTitle;
            if (tContent) nextContent = tContent;
            wasTranslated = true;
          }
        }

        const nextExcerpt = sanitizeAINewsBody(row.excerpt || nextContent).slice(0, 220);

        const hasChanges =
          nextTitle !== (row.title || "") ||
          nextContent !== (row.content || "") ||
          nextExcerpt !== (row.excerpt || "") ||
          nextCategory !== (row.category || "");

        if (!hasChanges) continue;

        updated += 1;
        if (wasTranslated) translated += 1;
        if (dryRun) continue;

        const { error: updateError } = await supabaseServer
          .from("news")
          .update({
            title: nextTitle,
            content: nextContent,
            excerpt: nextExcerpt,
            category: nextCategory,
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id);

        if (updateError) {
          errors.push(`${row.id}: ${updateError.message}`);
        }
      }

      if (rows.length < BATCH_SIZE) break;
      offset += BATCH_SIZE;
    }

    return NextResponse.json({
      success: true,
      dryRun,
      scanned,
      updated,
      translated,
      geminiAvailable,
      errors,
    });
  } catch {
    return NextResponse.json({ error: "Errore durante la bonifica archivio AI" }, { status: 500 });
  }
}
