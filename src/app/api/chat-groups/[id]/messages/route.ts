import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET - Fetch messages for a chat group
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabaseSession = await createClient();
    const { data: { user } } = await supabaseSession.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Send a message to a chat group
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabaseSession = await createClient();
    const { data: { user } } = await supabaseSession.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

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

    const { data: message, error } = await supabaseServer
      .from("internal_messages")
      .insert({
        sender_id: user.id,
        recipient_id: null,
        group_id: id,
        subject: "",
        content: content.trim(),
        attachment_url: attachment_url || null,
        attachment_type: attachment_type || null,
      })
      .select(`
        *,
        sender:sender_id(id, full_name, avatar_url)
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Update the group's updated_at timestamp
    await supabaseServer
      .from("chat_groups")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", id);

    return NextResponse.json(message, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
