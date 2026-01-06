import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET - Fetch internal messages (inbox or sent)
export async function GET(request: NextRequest) {
  try {
    const supabaseSession = await createClient();
    const { data: { user } } = await supabaseSession.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") || "inbox"; // inbox, sent, or all
    const search = searchParams.get("search") || "";

    let query = supabaseServer
      .from("internal_messages")
      .select(`
        *,
        sender:sender_id(id, full_name, avatar_url),
        recipient:recipient_id(id, full_name, avatar_url)
      `)
      .order("created_at", { ascending: false });

    if (type === "inbox") {
      query = query.eq("recipient_id", user.id);
    } else if (type === "sent") {
      query = query.eq("sender_id", user.id);
    } else if (type === "all") {
      query = query.or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`);
    }

    if (search) {
      query = query.or(`subject.ilike.%${search}%,content.ilike.%${search}%`);
    }

    const { data: messages, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(messages);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Send a new internal message
export async function POST(request: NextRequest) {
  try {
    const supabaseSession = await createClient();
    const { data: { user } } = await supabaseSession.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const body = await request.json();
    const { recipient_id, subject, content, parent_message_id } = body;

    if (!recipient_id || !subject || !content) {
      return NextResponse.json(
        { error: "Destinatario, oggetto e contenuto sono obbligatori" },
        { status: 400 }
      );
    }

    // Check if recipient exists
    const { data: recipient } = await supabaseServer
      .from("profiles")
      .select("id")
      .eq("id", recipient_id)
      .single();

    if (!recipient) {
      return NextResponse.json(
        { error: "Destinatario non trovato" },
        { status: 404 }
      );
    }

    const { data: message, error } = await supabaseServer
      .from("internal_messages")
      .insert({
        sender_id: user.id,
        recipient_id,
        subject,
        content,
        parent_message_id: parent_message_id || null,
      })
      .select(`
        *,
        sender:sender_id(id, full_name, avatar_url),
        recipient:recipient_id(id, full_name, avatar_url)
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(message, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
