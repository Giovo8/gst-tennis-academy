import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";
import { requireAdminOrGestore } from "@/lib/ai-news/auth";
import { mapStatoToLegacy } from "@/lib/ai-news/utils";
import { sanitizeAINewsBody, sanitizeAINewsTitle } from "@/lib/ai-news/contentSanitizer";

export async function PATCH(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAdminOrGestore();
    if (!authResult.ok) return authResult.response;

    const { id } = await params;
    const { data: row, error: rowError } = await supabaseServer
      .from("news")
      .select("title, content")
      .eq("id", id)
      .single();

    if (rowError) return NextResponse.json({ error: rowError.message }, { status: 500 });

    const { data, error } = await supabaseServer
      .from("news")
      .update({
        stato: "pubblicata",
        category: "notizie",
        title: sanitizeAINewsTitle(row?.title || ""),
        content: sanitizeAINewsBody(row?.content || ""),
        excerpt: sanitizeAINewsBody(row?.content || "").slice(0, 220),
        ...mapStatoToLegacy("pubblicata"),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id, stato, is_published, published_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Errore approvazione news" }, { status: 500 });
  }
}
