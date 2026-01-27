import { NextRequest, NextResponse } from "next/server";
import { supabaseServer as supabase } from "@/lib/supabase/serverClient";

// GET - Validate an invite code (public, bypasses RLS via service role)
export async function GET(request: NextRequest) {

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json(
      { valid: false, error: "Codice richiesto" },
      { status: 400 }
    );
  }

  // Use service role to bypass RLS
  const { data, error } = await supabase
    .from("invite_codes")
    .select("id, code, role, max_uses, uses_remaining, expires_at")
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
    id: data.id,
  });
}

// POST - Use an invite code (during registration)
// This endpoint uses service role to bypass RLS for all database operations
export async function POST(request: NextRequest) {

  try {
    const body = await request.json();
    const { code, user_id, profile_data } = body;

    if (!code || !user_id) {
      return NextResponse.json(
        { error: "Codice e user_id richiesti" },
        { status: 400 }
      );
    }

    // Get the invite code (service role bypasses RLS)
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

    // If profile_data is provided, upsert the profile first (service role bypasses RLS)
    if (profile_data) {
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: user_id,
          email: profile_data.email,
          full_name: profile_data.full_name,
          phone: profile_data.phone,
          role: inviteCode.role,
        }, {
          onConflict: 'id'
        });

      if (profileError) {
        console.error("Errore upsert profilo:", profileError);
        return NextResponse.json(
          { error: "Errore nella creazione del profilo" },
          { status: 500 }
        );
      }
    } else {
      // Just update the role if no profile_data provided
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ role: inviteCode.role })
        .eq("id", user_id);

      if (profileError) {
        console.error("Errore update profilo:", profileError);
        return NextResponse.json(
          { error: "Errore nell'aggiornamento del profilo" },
          { status: 500 }
        );
      }
    }

    // Decrement uses_remaining (service role bypasses RLS)
    if (inviteCode.uses_remaining !== null) {
      const { error: updateError } = await supabase
        .from("invite_codes")
        .update({ uses_remaining: inviteCode.uses_remaining - 1 })
        .eq("id", inviteCode.id);

      if (updateError) {
        console.error("Errore decrement uses:", updateError);
        return NextResponse.json(
          { error: "Errore nell'aggiornamento del codice" },
          { status: 500 }
        );
      }
    }

    // Record the usage (service role bypasses RLS)
    const { error: useError } = await supabase.from("invite_code_uses").insert({
      invite_code_id: inviteCode.id,
      user_id,
    });

    if (useError) {
      console.error("Errore insert invite_code_uses:", useError);
      // Non bloccare se l'inserimento fallisce (potrebbe essere un duplicato)
    }

    return NextResponse.json({
      success: true,
      role: inviteCode.role,
    });
  } catch (err) {
    console.error("Errore generale in POST /api/invite-codes/validate:", err);
    return NextResponse.json(
      { error: "Errore nell'utilizzo del codice" },
      { status: 500 }
    );
  }
}
