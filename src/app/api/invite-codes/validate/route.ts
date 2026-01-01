import { NextRequest, NextResponse } from "next/server";
import { supabaseServer as supabase } from "@/lib/supabase/serverClient";

// GET - Validate an invite code
export async function GET(request: NextRequest) {

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json(
      { valid: false, error: "Codice richiesto" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("invite_codes")
    .select("*")
    .eq("code", code.toUpperCase())
    .single();

  if (error || !data) {
    return NextResponse.json(
      { valid: false, error: "Codice non valido" },
      { status: 404 }
    );
  }

  // Check if expired
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return NextResponse.json(
      { valid: false, error: "Codice scaduto" },
      { status: 410 }
    );
  }

  // Check if uses remaining
  if (data.uses_remaining !== null && data.uses_remaining <= 0) {
    return NextResponse.json(
      { valid: false, error: "Codice esaurito" },
      { status: 410 }
    );
  }

  return NextResponse.json({
    valid: true,
    role: data.role,
    code: data.code,
  });
}

// POST - Use an invite code (during registration)
export async function POST(request: NextRequest) {

  try {
    const body = await request.json();
    const { code, user_id } = body;

    if (!code || !user_id) {
      return NextResponse.json(
        { error: "Codice e user_id richiesti" },
        { status: 400 }
      );
    }

    // Get the invite code
    const { data: inviteCode, error: fetchError } = await supabase
      .from("invite_codes")
      .select("*")
      .eq("code", code.toUpperCase())
      .single();

    if (fetchError || !inviteCode) {
      return NextResponse.json(
        { error: "Codice non valido" },
        { status: 404 }
      );
    }

    // Check validity
    if (inviteCode.expires_at && new Date(inviteCode.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "Codice scaduto" },
        { status: 410 }
      );
    }

    if (inviteCode.uses_remaining !== null && inviteCode.uses_remaining <= 0) {
      return NextResponse.json(
        { error: "Codice esaurito" },
        { status: 410 }
      );
    }

    // Decrement uses_remaining
    if (inviteCode.uses_remaining !== null) {
      const { error: updateError } = await supabase
        .from("invite_codes")
        .update({ uses_remaining: inviteCode.uses_remaining - 1 })
        .eq("id", inviteCode.id);

      if (updateError) {
        return NextResponse.json(
          { error: "Errore nell'aggiornamento del codice" },
          { status: 500 }
        );
      }
    }

    // Record the usage
    await supabase.from("invite_code_uses").insert({
      invite_code_id: inviteCode.id,
      user_id,
    });

    // Update user profile with the role from invite code
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ role: inviteCode.role })
      .eq("id", user_id);

    if (profileError) {
      return NextResponse.json(
        { error: "Errore nell'aggiornamento del profilo" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      role: inviteCode.role,
    });
  } catch {
    return NextResponse.json(
      { error: "Errore nell'utilizzo del codice" },
      { status: 500 }
    );
  }
}
