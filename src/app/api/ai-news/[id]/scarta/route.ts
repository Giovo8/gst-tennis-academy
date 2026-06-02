import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";
import { requireAdminOrGestore } from "@/lib/ai-news/auth";
import { mapStatoToLegacy } from "@/lib/ai-news/utils";

export async function PATCH(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAdminOrGestore();
    if (!authResult.ok) return authResult.response;

    const { id } = await params;

    const { data, error } = await supabaseServer
      .from("news")
      .update({
        stato: "scartata",
        ...mapStatoToLegacy("scartata"),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id, stato, is_published")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Errore scarto news" }, { status: 500 });
  }
}
