import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET - Fetch user's chat groups
export async function GET(request: NextRequest) {
  try {
    const supabaseSession = await createClient();
    const { data: { user } } = await supabaseSession.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    // Get groups where user is a member
    const { data: memberships, error: membershipError } = await supabaseServer
      .from("chat_group_members")
      .select("group_id")
      .eq("user_id", user.id);

    if (membershipError) {
      return NextResponse.json({ error: membershipError.message }, { status: 400 });
    }

    const groupIds = memberships?.map(m => m.group_id) || [];

    if (groupIds.length === 0) {
      return NextResponse.json([]);
    }

    // Fetch the groups with member count
    const { data: groups, error: groupsError } = await supabaseServer
      .from("chat_groups")
      .select(`
        *,
        members:chat_group_members(
          id,
          user_id,
          role,
          joined_at,
          user:user_id(id, full_name, avatar_url)
        )
      `)
      .in("id", groupIds)
      .order("updated_at", { ascending: false });

    if (groupsError) {
      return NextResponse.json({ error: groupsError.message }, { status: 400 });
    }

    return NextResponse.json(groups || []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create a new chat group
export async function POST(request: NextRequest) {
  try {
    const supabaseSession = await createClient();
    const { data: { user } } = await supabaseSession.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, member_ids } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { error: "Il nome del gruppo è obbligatorio" },
        { status: 400 }
      );
    }

    if (!member_ids || !Array.isArray(member_ids) || member_ids.length === 0) {
      return NextResponse.json(
        { error: "Seleziona almeno un membro" },
        { status: 400 }
      );
    }

    // Create the group
    const { data: group, error: groupError } = await supabaseServer
      .from("chat_groups")
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (groupError) {
      return NextResponse.json({ error: groupError.message }, { status: 400 });
    }

    // Add creator as admin
    const membersToInsert = [
      { group_id: group.id, user_id: user.id, role: "admin" },
      ...member_ids
        .filter((id: string) => id !== user.id)
        .map((id: string) => ({
          group_id: group.id,
          user_id: id,
          role: "member",
        })),
    ];

    const { error: membersError } = await supabaseServer
      .from("chat_group_members")
      .insert(membersToInsert);

    if (membersError) {
      // Rollback: delete the group if members insertion fails
      await supabaseServer.from("chat_groups").delete().eq("id", group.id);
      return NextResponse.json({ error: membersError.message }, { status: 400 });
    }

    // Fetch the complete group with members
    const { data: completeGroup, error: fetchError } = await supabaseServer
      .from("chat_groups")
      .select(`
        *,
        members:chat_group_members(
          id,
          user_id,
          role,
          joined_at,
          user:user_id(id, full_name, avatar_url)
        )
      `)
      .eq("id", group.id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 400 });
    }

    return NextResponse.json(completeGroup, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
