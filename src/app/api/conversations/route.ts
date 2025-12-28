import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";

export const dynamic = "force-dynamic";

// GET /api/conversations - Get all conversations for current user
export async function GET(req: NextRequest) {
  try {
    const supabase = await supabaseServer();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    // Get conversations where user is a participant
    const { data: participants, error: participantsError } = await supabase
      .from("conversation_participants")
      .select(`
        conversation_id,
        unread_count,
        last_read_at,
        is_muted,
        is_archived,
        conversations (
          id,
          title,
          is_group,
          created_by,
          created_at,
          last_message_at,
          last_message_preview
        )
      `)
      .eq("user_id", user.id)
      .order("last_read_at", { ascending: false });

    if (participantsError) {
      console.error("Error fetching conversations:", participantsError);
      return NextResponse.json({ error: "Errore nel recupero delle conversazioni" }, { status: 500 });
    }

    // Get other participants for each conversation
    const conversationsWithParticipants = await Promise.all(
      (participants || []).map(async (p: any) => {
        const conversation = p.conversations;
        
        // Get all participants
        const { data: allParticipants, error: participantsError } = await supabase
          .from("conversation_participants")
          .select(`
            user_id,
            profiles (
              id,
              full_name,
              avatar_url,
              user_role
            )
          `)
          .eq("conversation_id", conversation.id);

        if (participantsError) {
          console.error("Error fetching conversation participants:", participantsError);
          return null;
        }

        // Filter out current user for 1-on-1 conversations
        const otherParticipants = allParticipants?.filter((participant: any) => 
          participant.user_id !== user.id
        );

        return {
          id: conversation.id,
          title: conversation.title,
          is_group: conversation.is_group,
          created_at: conversation.created_at,
          last_message_at: conversation.last_message_at,
          last_message_preview: conversation.last_message_preview,
          unread_count: p.unread_count,
          is_muted: p.is_muted,
          is_archived: p.is_archived,
          participants: otherParticipants?.map((participant: any) => participant.profiles) || [],
        };
      })
    );

    // Filter out null values and sort by last message
    const validConversations = conversationsWithParticipants
      .filter((c) => c !== null)
      .sort((a: any, b: any) => 
        new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      );

    return NextResponse.json({ conversations: validConversations });
  } catch (error: any) {
    console.error("Error in GET /api/conversations:", error);
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 });
  }
}

// POST /api/conversations - Create new conversation
export async function POST(req: NextRequest) {
  try {
    const supabase = await supabaseServer();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const body = await req.json();
    const { participant_ids, title, is_group = false, initial_message } = body;

    // Validate
    if (!participant_ids || !Array.isArray(participant_ids) || participant_ids.length === 0) {
      return NextResponse.json({ error: "participant_ids richiesto" }, { status: 400 });
    }

    // For 1-on-1, check if conversation already exists
    if (!is_group && participant_ids.length === 1) {
      const { data: existingConv, error: rpcError } = await supabase
        .rpc("get_or_create_conversation", {
          user1_id: user.id,
          user2_id: participant_ids[0],
        });

      if (rpcError) {
        console.error("Error calling get_or_create_conversation:", rpcError);
        return NextResponse.json({ error: "Errore nella creazione della conversazione" }, { status: 500 });
      }

      // Send initial message if provided
      if (initial_message && existingConv) {
        const { error: messageError } = await supabase
          .from("messages")
          .insert({
            conversation_id: existingConv,
            sender_id: user.id,
            content: initial_message,
          });

        if (messageError) {
          console.error("Error sending initial message:", messageError);
        }
      }

      return NextResponse.json({ conversation_id: existingConv });
    }

    // Create group conversation
    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .insert({
        title: title || "Nuova conversazione",
        is_group: true,
        created_by: user.id,
      })
      .select()
      .single();

    if (conversationError) {
      console.error("Error creating conversation:", conversationError);
      return NextResponse.json({ error: "Errore nella creazione della conversazione" }, { status: 500 });
    }

    // Add creator as admin participant
    const participantsToAdd = [
      { conversation_id: conversation.id, user_id: user.id, is_admin: true },
      ...participant_ids.map((id: string) => ({
        conversation_id: conversation.id,
        user_id: id,
        is_admin: false,
      })),
    ];

    const { error: participantsError } = await supabase
      .from("conversation_participants")
      .insert(participantsToAdd);

    if (participantsError) {
      console.error("Error adding participants:", participantsError);
      return NextResponse.json({ error: "Errore nell'aggiunta dei partecipanti" }, { status: 500 });
    }

    // Send initial message if provided
    if (initial_message) {
      const { error: messageError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversation.id,
          sender_id: user.id,
          content: initial_message,
        });

      if (messageError) {
        console.error("Error sending initial message:", messageError);
      }
    }

    return NextResponse.json({ conversation_id: conversation.id }, { status: 201 });
  } catch (error: any) {
    console.error("Error in POST /api/conversations:", error);
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 });
  }
}
