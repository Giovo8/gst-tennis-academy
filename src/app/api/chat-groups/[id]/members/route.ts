import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// POST - Add members to a chat group (admin only)
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

    // Check if user is an admin of this group
    const { data: membership } = await supabaseServer
      .from("chat_group_members")
      .select("role")
      .eq("group_id", id)
      .eq("user_id", user.id)
      .single();

    if (!membership || membership.role !== "admin") {
      return NextResponse.json({ error: "Solo gli admin possono aggiungere membri" }, { status: 403 });
    }

    const body = await request.json();
    const { user_ids } = body;

    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return NextResponse.json(
        { error: "Seleziona almeno un utente" },
        { status: 400 }
      );
    }

    // Add new members
    const membersToInsert = user_ids.map((userId: string) => ({
      group_id: id,
      user_id: userId,
      role: "member",
    }));

    const { data: newMembers, error } = await supabaseServer
      .from("chat_group_members")
      .insert(membersToInsert)
      .select(`
        id,
        user_id,
        role,
        joined_at,
        user:user_id(id, full_name, avatar_url)
      `);

    if (error) {
      // Ignore duplicate errors
      if (error.code === "23505") {
        return NextResponse.json({ error: "Alcuni utenti sono già membri del gruppo" }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(newMembers, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Remove a member or leave the group
export async function DELETE(
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

    const searchParams = request.nextUrl.searchParams;
    const targetUserId = searchParams.get("user_id");

    // If no user_id provided, user is leaving the group
    const userIdToRemove = targetUserId || user.id;
    const isSelfLeaving = userIdToRemove === user.id;

    // Get current user's membership
    const { data: currentMembership } = await supabaseServer
      .from("chat_group_members")
      .select("role")
      .eq("group_id", id)
      .eq("user_id", user.id)
      .single();

    if (!currentMembership) {
      return NextResponse.json({ error: "Non sei membro di questo gruppo" }, { status: 403 });
    }

    // If trying to remove someone else, must be admin
    if (!isSelfLeaving && currentMembership.role !== "admin") {
      return NextResponse.json({ error: "Solo gli admin possono rimuovere membri" }, { status: 403 });
    }

    // Check if target is the last admin
    if (isSelfLeaving && currentMembership.role === "admin") {
      const { data: admins } = await supabaseServer
        .from("chat_group_members")
        .select("id")
        .eq("group_id", id)
        .eq("role", "admin");

      if (admins && admins.length === 1) {
        return NextResponse.json(
          { error: "Sei l'ultimo admin. Promuovi un altro membro prima di uscire o elimina il gruppo." },
          { status: 400 }
        );
      }
    }

    const { error } = await supabaseServer
      .from("chat_group_members")
      .delete()
      .eq("group_id", id)
      .eq("user_id", userIdToRemove);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH - Update member role (admin only)
export async function PATCH(
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

    // Check if user is an admin of this group
    const { data: membership } = await supabaseServer
      .from("chat_group_members")
      .select("role")
      .eq("group_id", id)
      .eq("user_id", user.id)
      .single();

    if (!membership || membership.role !== "admin") {
      return NextResponse.json({ error: "Solo gli admin possono modificare i ruoli" }, { status: 403 });
    }

    const body = await request.json();
    const { user_id, role } = body;

    if (!user_id || !role || !["admin", "member"].includes(role)) {
      return NextResponse.json({ error: "Parametri non validi" }, { status: 400 });
    }

    const { data: updatedMember, error } = await supabaseServer
      .from("chat_group_members")
      .update({ role })
      .eq("group_id", id)
      .eq("user_id", user_id)
      .select(`
        id,
        user_id,
        role,
        joined_at,
        user:user_id(id, full_name, avatar_url)
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(updatedMember);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
