import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";
import { verifyAuth } from "@/lib/auth/verifyAuth";

export const dynamic = "force-dynamic";

// GET - Fetch messages for a chat group
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authResult = await verifyAuth(request);
    if (!authResult.success) return authResult.response;
    const user = authResult.data.user;

    // Check if user is a member of this group
    const { data: membership } = await supabaseServer
      .from("chat_group_members")
      .select("id")
      .eq("group_id", id)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "Non sei membro di questo gruppo" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const { data: messages, error } = await supabaseServer
      .from("internal_messages")
      .select(`
        *,
        sender:sender_id(id, full_name, avatar_url)
      `)
      .eq("group_id", id)
      .order("created_at", { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(messages || []);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Errore interno del server";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// POST - Send a message to a chat group
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authResult = await verifyAuth(request);
    if (!authResult.success) return authResult.response;
    const user = authResult.data.user;

    // Check if user is a member of this group
    const { data: membership } = await supabaseServer
      .from("chat_group_members")
      .select("id")
      .eq("group_id", id)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "Non sei membro di questo gruppo" }, { status: 403 });
    }

    const body = await request.json();
    const { content, attachment_url, attachment_type } = body;

    if (!content || content.trim() === "") {
      return NextResponse.json(
        { error: "Il messaggio non può essere vuoto" },
        { status: 400 }
      );
    }

    const baseInsertPayload: Record<string, any> = {
      sender_id: user.id,
      recipient_id: null,
      group_id: id,
      subject: "",
      content: content.trim(),
    };

    if (attachment_url) {
      baseInsertPayload.attachment_url = attachment_url;
    }

    if (attachment_type) {
      baseInsertPayload.attachment_type = attachment_type;
    }

    let insertPayload: Record<string, any> = { ...baseInsertPayload };
    let message: any = null;
    let error: any = null;

    // Handle schema drift between environments by retrying without missing optional columns.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const result = await supabaseServer
        .from("internal_messages")
        .insert(insertPayload)
        .select(`
          *,
          sender:sender_id(id, full_name, avatar_url)
        `)
        .single();

      message = result.data;
      error = result.error;

      if (!error) {
        break;
      }

      const missingColumnMatch = error.message?.match(
        /Could not find the '([^']+)' column/i
      );
      const missingColumn = missingColumnMatch?.[1];

      if (!missingColumn || !(missingColumn in insertPayload)) {
        break;
      }

      delete insertPayload[missingColumn];
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Update the group's updated_at timestamp
    await supabaseServer
      .from("chat_groups")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", id);

    return NextResponse.json(message, { status: 201 });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Errore interno del server";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
