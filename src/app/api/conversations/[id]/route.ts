import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";

export const dynamic = "force-dynamic";

// GET /api/conversations/[id] - Get conversation details with messages
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await supabaseServer();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    // Check if user is participant
    const { data: participant, error: participantError } = await supabase
      .from("conversation_participants")
      .select("*")
      .eq("conversation_id", id)
      .eq("user_id", user.id)
      .single();

    if (participantError || !participant) {
      return NextResponse.json({ error: "Conversazione non trovata o accesso negato" }, { status: 404 });
    }

    // Get conversation details
    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", id)
      .single();

    if (conversationError || !conversation) {
      return NextResponse.json({ error: "Conversazione non trovata" }, { status: 404 });
    }

    // Get all participants
    const { data: participants, error: participantsError } = await supabase
      .from("conversation_participants")
      .select(`
        user_id,
        is_admin,
        profiles (
          id,
          full_name,
          avatar_url,
          user_role
        )
      `)
      .eq("conversation_id", id);

    if (participantsError) {
      console.error("Error fetching participants:", participantsError);
      return NextResponse.json({ error: "Errore nel recupero dei partecipanti" }, { status: 500 });
    }

    // Get messages with pagination
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select(`
        id,
        content,
        message_type,
        attachment_url,
        attachment_metadata,
        is_edited,
        edited_at,
        is_deleted,
        reply_to_message_id,
        created_at,
        sender_id,
        profiles:sender_id (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq("conversation_id", id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (messagesError) {
      console.error("Error fetching messages:", messagesError);
      return NextResponse.json({ error: "Errore nel recupero dei messaggi" }, { status: 500 });
    }

    return NextResponse.json({
      conversation: {
        ...conversation,
        participants: participants?.map((p: any) => ({
          ...p.profiles,
          is_admin: p.is_admin,
        })),
      },
      messages: messages?.reverse() || [], // Reverse to show oldest first
    });
  } catch (error: any) {
    console.error("Error in GET /api/conversations/[id]:", error);
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 });
  }
}

// PUT /api/conversations/[id] - Update conversation
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await supabaseServer();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const body = await req.json();
    const { title, is_muted, is_archived, last_read_at } = body;

    // If updating participant settings
    if (is_muted !== undefined || is_archived !== undefined || last_read_at !== undefined) {
      const updateData: any = {};
      if (is_muted !== undefined) updateData.is_muted = is_muted;
      if (is_archived !== undefined) updateData.is_archived = is_archived;
      if (last_read_at !== undefined) updateData.last_read_at = last_read_at;

      const { error: participantError } = await supabase
        .from("conversation_participants")
        .update(updateData)
        .eq("conversation_id", id)
        .eq("user_id", user.id);

      if (participantError) {
        console.error("Error updating participant:", participantError);
        return NextResponse.json({ error: "Errore nell'aggiornamento" }, { status: 500 });
      }
    }

    // If updating conversation title (only admin/creator)
    if (title !== undefined) {
      const { error: conversationError } = await supabase
        .from("conversations")
        .update({ title })
        .eq("id", id);

      if (conversationError) {
        console.error("Error updating conversation:", conversationError);
        return NextResponse.json({ error: "Errore nell'aggiornamento del titolo" }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in PUT /api/conversations/[id]:", error);
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 });
  }
}

// DELETE /api/conversations/[id] - Delete conversation
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await supabaseServer();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    // Check if user is creator or admin
    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("created_by")
      .eq("id", id)
      .single();

    if (conversationError || !conversation) {
      return NextResponse.json({ error: "Conversazione non trovata" }, { status: 404 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("user_role")
      .eq("id", user.id)
      .single();

    const isAdmin = profile?.user_role === "admin" || profile?.user_role === "gestore";
    const isCreator = conversation.created_by === user.id;

    if (!isAdmin && !isCreator) {
      return NextResponse.json({ error: "Permessi insufficienti" }, { status: 403 });
    }

    // Delete conversation (cascade will handle participants and messages)
    const { error: deleteError } = await supabase
      .from("conversations")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Error deleting conversation:", deleteError);
      return NextResponse.json({ error: "Errore nell'eliminazione" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in DELETE /api/conversations/[id]:", error);
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 });
  }
}
