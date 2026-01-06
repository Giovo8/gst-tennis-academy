import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET - Fetch a single message with thread
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabaseSession = await createClient();
    const { data: { user } } = await supabaseSession.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const { data: message, error } = await supabaseServer
      .from("internal_messages")
      .select(`
        *,
        sender:sender_id(id, full_name, avatar_url),
        recipient:recipient_id(id, full_name, avatar_url)
      `)
      .eq("id", params.id)
      .single();

    if (error || !message) {
      return NextResponse.json({ error: "Messaggio non trovato" }, { status: 404 });
    }

    // Check if user has access to this message
    if (message.sender_id !== user.id && message.recipient_id !== user.id) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }

    // Get thread messages if this is a reply
    let thread = null;
    if (message.parent_message_id) {
      const { data: threadMessages } = await supabaseServer
        .from("internal_messages")
        .select(`
          *,
          sender:sender_id(id, full_name, avatar_url),
          recipient:recipient_id(id, full_name, avatar_url)
        `)
        .or(`id.eq.${message.parent_message_id},parent_message_id.eq.${message.parent_message_id}`)
        .order("created_at", { ascending: true });

      thread = threadMessages;
    }

    // Mark as read if user is the recipient
    if (message.recipient_id === user.id && !message.is_read) {
      await supabaseServer
        .from("internal_messages")
        .update({ is_read: true })
        .eq("id", params.id);
    }

    return NextResponse.json({ message, thread });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH - Mark message as read/unread
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabaseSession = await createClient();
    const { data: { user } } = await supabaseSession.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const body = await request.json();
    const { is_read } = body;

    const { data: message, error } = await supabaseServer
      .from("internal_messages")
      .update({ is_read })
      .eq("id", params.id)
      .eq("recipient_id", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(message);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete a message
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabaseSession = await createClient();
    const { data: { user } } = await supabaseSession.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const { error } = await supabaseServer
      .from("internal_messages")
      .delete()
      .eq("id", params.id)
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
