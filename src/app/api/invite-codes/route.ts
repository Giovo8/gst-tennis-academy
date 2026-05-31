import { NextRequest, NextResponse } from "next/server";
import { supabaseServer as supabase } from "@/lib/supabase/serverClient";

// GET - Fetch all invite codes (admin only)
export async function GET(request: NextRequest) {
  // Get auth token from header
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  if (!token) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  // Verify admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "gestore"].includes(profile.role)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("invite_codes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST - Create new invite code
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  if (!token) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  // Verify admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "gestore"].includes(profile.role)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { code, role, max_uses, expires_at } = body;

    if (!code || !role) {
      return NextResponse.json(
        { error: "Codice e ruolo sono obbligatori" },
        { status: 400 }
      );
    }

    let normalizedMaxUses: number | null = null;
    if (max_uses !== undefined && max_uses !== null) {
      const parsed = Number(max_uses);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 10000) {
        return NextResponse.json(
          { error: "max_uses deve essere un intero tra 1 e 10000" },
          { status: 400 }
        );
      }
      normalizedMaxUses = parsed;
    }

    if (expires_at !== undefined && expires_at !== null) {
      const ts = Date.parse(expires_at);
      if (Number.isNaN(ts)) {
        return NextResponse.json(
          { error: "expires_at non è una data valida" },
          { status: 400 }
        );
      }
      if (ts <= Date.now()) {
        return NextResponse.json(
          { error: "expires_at deve essere una data futura" },
          { status: 400 }
        );
      }
    }

    const { data, error } = await supabase
      .from("invite_codes")
      .insert({
        code,
        role,
        max_uses: normalizedMaxUses,
        uses_remaining: normalizedMaxUses,
        expires_at: expires_at ?? null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Questo codice esiste già" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Errore nella creazione del codice" },
      { status: 500 }
    );
  }
}

// DELETE - Delete an invite code
export async function DELETE(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  if (!token) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  // Verify admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "gestore"].includes(profile.role)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID richiesto" }, { status: 400 });
  }

  const { error } = await supabase
    .from("invite_codes")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
