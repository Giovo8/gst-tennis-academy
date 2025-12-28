import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";

export const dynamic = "force-dynamic";

// POST /api/messages - Send new message
export async function POST(req: NextRequest) {
  try {
    const supabase = supabaseServer;
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const body = await req.json();
    const {
      conversation_id,
      content,
      message_type = "text",
      attachment_url,
      attachment_metadata,
      reply_to_message_id,
    } = body;

    // Validate
    if (!conversation_id || !content) {
      return NextResponse.json({ error: "conversation_id e content sono richiesti" }, { status: 400 });
    }

    // Check if user is participant
    const { data: participant, error: participantError } = await supabase
      .from("conversation_participants")
      .select("*")
      .eq("conversation_id", conversation_id)
      .eq("user_id", user.id)
      .single();

    if (participantError || !participant) {
      return NextResponse.json({ error: "Non sei un partecipante di questa conversazione" }, { status: 403 });
    }

    // Insert message
    const { data: message, error: messageError } = await supabase
      .from("messages")
      .insert({
        conversation_id,
        sender_id: user.id,
        content,
        message_type,
        attachment_url,
        attachment_metadata,
        reply_to_message_id,
      })
      .select(`
        id,
        content,
        message_type,
        attachment_url,
        attachment_metadata,
        is_edited,
        reply_to_message_id,
        created_at,
        sender_id,
        profiles:sender_id (
          id,
          full_name,
          avatar_url
        )
      `)
      .single();

    if (messageError) {
      console.error("Error sending message:", messageError);
      return NextResponse.json({ error: "Errore nell'invio del messaggio" }, { status: 500 });
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (error: any) {
    console.error("Error in POST /api/messages:", error);
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 });
  }
}
