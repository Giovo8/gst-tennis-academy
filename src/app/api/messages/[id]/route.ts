import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";

export const dynamic = "force-dynamic";

// PUT /api/messages/[id] - Update message (edit or mark as read)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = supabaseServer;
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const body = await req.json();
    const { content, mark_as_read } = body;

    // Mark as read
    if (mark_as_read) {
      // Get message to check conversation
      const { data: message, error: messageError } = await supabase
        .from("messages")
        .select("conversation_id, sender_id")
        .eq("id", id)
        .single();

      if (messageError || !message) {
        return NextResponse.json({ error: "Messaggio non trovato" }, { status: 404 });
      }

      // Check if user is participant
      const { data: participant, error: participantError } = await supabase
        .from("conversation_participants")
        .select("*")
        .eq("conversation_id", message.conversation_id)
        .eq("user_id", user.id)
        .single();

      if (participantError || !participant) {
        return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
      }

      // Don't mark own messages as read
      if (message.sender_id === user.id) {
        return NextResponse.json({ success: true });
      }

      // Insert or update message_read
      const { error: readError } = await supabase
        .from("message_reads")
        .upsert({
          message_id: id,
          user_id: user.id,
          read_at: new Date().toISOString(),
        }, {
          onConflict: "message_id,user_id",
        });

      if (readError) {
        console.error("Error marking message as read:", readError);
        return NextResponse.json({ error: "Errore nella marcatura come letto" }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    // Edit message content
    if (content !== undefined) {
      // Check if user is sender
      const { data: message, error: messageError } = await supabase
        .from("messages")
        .select("sender_id")
        .eq("id", id)
        .single();

      if (messageError || !message) {
        return NextResponse.json({ error: "Messaggio non trovato" }, { status: 404 });
      }

      if (message.sender_id !== user.id) {
        return NextResponse.json({ error: "Non puoi modificare questo messaggio" }, { status: 403 });
      }

      // Update message
      const { error: updateError } = await supabase
        .from("messages")
        .update({
          content,
          is_edited: true,
          edited_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (updateError) {
        console.error("Error updating message:", updateError);
        return NextResponse.json({ error: "Errore nell'aggiornamento" }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Nessuna operazione specificata" }, { status: 400 });
  } catch (error: any) {
    console.error("Error in PUT /api/messages/[id]:", error);
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 });
  }
}

// DELETE /api/messages/[id] - Delete message
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = supabaseServer;
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    // Check if user is sender or admin
    const { data: message, error: messageError } = await supabase
      .from("messages")
      .select("sender_id")
      .eq("id", id)
      .single();

    if (messageError || !message) {
      return NextResponse.json({ error: "Messaggio non trovato" }, { status: 404 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("user_role")
      .eq("id", user.id)
      .single();

    const isAdmin = profile?.user_role === "admin" || profile?.user_role === "gestore";
    const isSender = message.sender_id === user.id;

    if (!isAdmin && !isSender) {
      return NextResponse.json({ error: "Non puoi eliminare questo messaggio" }, { status: 403 });
    }

    // Soft delete: mark as deleted instead of removing
    const { error: deleteError } = await supabase
      .from("messages")
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        content: "[Messaggio eliminato]",
      })
      .eq("id", id);

    if (deleteError) {
      console.error("Error deleting message:", deleteError);
      return NextResponse.json({ error: "Errore nell'eliminazione" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in DELETE /api/messages/[id]:", error);
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 });
  }
}
