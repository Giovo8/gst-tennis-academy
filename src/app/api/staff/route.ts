import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";
import { getRouteAuth, isAdmin, unauthorized, forbidden } from "@/lib/auth/routeAuth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const showAll = searchParams.get("all") === "true";

  let query = supabaseServer
   .from("staff")
    .select("*")
    .order("order_index", { ascending: true });

  if (!showAll) {
    query = query.eq("active", true);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { full_name, role, bio, image_url, order_index, active } = body;

  if (!full_name || !role) {
    return NextResponse.json(
      { error: "Full name and role are required" },
      { status: 400 }
    );
  }

  const auth = await getRouteAuth();
  if (!auth) return unauthorized();
  if (!isAdmin(auth.role)) return forbidden();

  const { data, error } = await supabaseServer
   .from("staff")
    .insert({
      full_name,
      role,
      bio,
      image_url,
      order_index: order_index ?? 0,
      active: active ?? true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  const authPatch = await getRouteAuth();
  if (!authPatch) return unauthorized();
  if (!isAdmin(authPatch.role)) return forbidden();

  const { data, error } = await supabaseServer
   .from("staff")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  const authDel = await getRouteAuth();
  if (!authDel) return unauthorized();
  if (!isAdmin(authDel.role)) return forbidden();

  const { error } = await supabaseServer.from("staff").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
