import { NextResponse } from "next/server";
import { requireAdminOrGestore } from "@/lib/ai-news/auth";
import { sanitizeAINewsBody, sanitizeAINewsTitle } from "@/lib/ai-news/contentSanitizer";
import { supabaseServer } from "@/lib/supabase/serverClient";

export const dynamic = "force-dynamic";

const BATCH_SIZE = 100;

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

    let scanned = 0;
    let updated = 0;
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
        const nextTitle = sanitizeAINewsTitle(row.title || "");
        const nextContent = sanitizeAINewsBody(row.content || "");
        const nextExcerpt = sanitizeAINewsBody(row.excerpt || nextContent).slice(0, 220);
        const nextCategory = "notizie";

        const hasChanges =
          nextTitle !== (row.title || "") ||
          nextContent !== (row.content || "") ||
          nextExcerpt !== (row.excerpt || "") ||
          nextCategory !== (row.category || "");

        if (!hasChanges) continue;

        updated += 1;
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
      errors,
    });
  } catch {
    return NextResponse.json({ error: "Errore durante la bonifica archivio AI" }, { status: 500 });
  }
}
