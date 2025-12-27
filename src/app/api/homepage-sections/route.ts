import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { supabaseServer } from "@/lib/supabase/serverClient";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("homepage_sections")
      .select("*")
      .order("order_index", { ascending: true });

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Error fetching homepage sections:", error);
    return NextResponse.json({ error: "Failed to fetch sections" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { data: { session } } = await supabaseServer.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabaseServer
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();

    if (!profile || !["admin", "gestore"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { sections } = body; // Array di { id, order_index, active }

    // Update in batch
    const updates = sections.map((section: { id: string; order_index: number; active: boolean }) =>
      supabaseServer
        .from("homepage_sections")
        .update({
          order_index: section.order_index,
          active: section.active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", section.id)
    );

    await Promise.all(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating homepage sections:", error);
    return NextResponse.json({ error: "Failed to update sections" }, { status: 500 });
  }
}
