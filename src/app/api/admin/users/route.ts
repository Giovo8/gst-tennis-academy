import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Admin client with service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    // Check if user is admin or gestore
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "admin" && profile.role !== "gestore")) {
      return NextResponse.json({ error: "Permessi insufficienti" }, { status: 403 });
    }

    // Get all users using service role to bypass RLS
    const { data: users, error: usersError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (usersError) {
      console.error("Errore caricamento utenti:", usersError);
      return NextResponse.json({ error: "Errore caricamento utenti" }, { status: 500 });
    }

    return NextResponse.json({ users: users || [] });
  } catch (error: any) {
    console.error("Errore GET utenti:", error);
    return NextResponse.json(
      { error: error.message || "Errore interno" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "admin" && profile.role !== "gestore")) {
      return NextResponse.json({ error: "Permessi insufficienti" }, { status: 403 });
    }

    const body = await request.json();
    const {
      email,
      password,
      full_name,
      role,
      phone,
      date_of_birth,
      birth_city,
      fiscal_code,
      address,
      city,
      province,
      postal_code,
      arena_rank,
      notes,
    } = body;

    // Validazione input
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email e password sono obbligatorie" },
        { status: 400 }
      );
    }

    // Validazione formato email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Formato email non valido" },
        { status: 400 }
      );
    }

    // Validazione password (minimo 6 caratteri)
    if (password.length < 6) {
      return NextResponse.json(
        { error: "La password deve essere almeno 6 caratteri" },
        { status: 400 }
      );
    }

    // Validazione ruolo
    const validRoles = ["atleta", "maestro", "gestore", "admin"];
    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Ruolo non valido" },
        { status: 400 }
      );
    }

    // Impedisci a gestore di creare admin
    if (profile.role === "gestore" && role === "admin") {
      return NextResponse.json(
        { error: "I gestori non possono creare utenti admin" },
        { status: 403 }
      );
    }

    // Create user with admin client
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name?.trim() || email.toLowerCase(),
        role: role || "atleta",
      },
    });

    if (createError) {
      console.error("Errore auth.admin.createUser:", createError.message, createError);
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    if (!newUser.user) {
      console.error("newUser.user è null");
      return NextResponse.json({ error: "Errore creazione utente" }, { status: 500 });
    }

    // Create or update profile with role using upsert
    const profileData = {
      id: newUser.user.id,
      email: email.toLowerCase(),
      full_name: full_name?.trim() || null,
      role: role || "atleta",
      phone: phone || null,
      date_of_birth: date_of_birth || null,
      bio: notes || null,
      metadata: {
        birth_city: birth_city || null,
        fiscal_code: fiscal_code || null,
        address: address || null,
        city: city || null,
        province: province || null,
        postal_code: postal_code || null,
      },
    };
    
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert(profileData, {
        onConflict: "id"
      });

    if (profileError) {
      // Tenta di eliminare l'utente auth se il profilo fallisce
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return NextResponse.json(
        { error: "Errore creazione profilo. Utente non creato." },
        { status: 500 }
      );
    }

    // Initialize arena_stats
    const rankPoints: Record<string, number> = {
      Bronzo: 0,
      Argento: 800,
      Oro: 1500,
      Platino: 2000,
      Diamante: 2500,
    };
    await supabaseAdmin
      .from("arena_stats")
      .upsert(
        {
          user_id: newUser.user.id,
          points: rankPoints[arena_rank] ?? 0,
          level: arena_rank ?? "Bronzo",
          wins: 0,
          losses: 0,
          total_matches: 0,
        },
        { onConflict: "user_id" }
      );

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        full_name,
        role,
      },
    });
  } catch (error: any) {
    console.error("Errore creazione utente:", error);
    return NextResponse.json(
      { error: error.message || "Errore interno" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    // Check if user is admin or gestore
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "admin" && profile.role !== "gestore")) {
      return NextResponse.json({ error: "Permessi insufficienti" }, { status: 403 });
    }

    const body = await request.json();
    const { userId, full_name, phone, date_of_birth, address, city, postal_code, notes, role } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId richiesto" }, { status: 400 });
    }

    // Check if gestore is trying to modify an admin
    if (profile.role === "gestore") {
      const { data: targetUser } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();
      
      if (targetUser?.role === "admin") {
        return NextResponse.json({ error: "Non puoi modificare un admin" }, { status: 403 });
      }
    }

    // Update user profile using service role
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({
        full_name,
        phone,
        date_of_birth,
        address,
        city,
        postal_code,
        notes,
        role
      })
      .eq("id", userId);

    if (updateError) {
      console.error("Errore aggiornamento profilo:", updateError);
      return NextResponse.json({ error: "Errore aggiornamento profilo" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Utente aggiornato con successo" });
  } catch (error: any) {
    console.error("Errore PATCH utente:", error);
    return NextResponse.json(
      { error: error.message || "Errore interno" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "admin" && profile.role !== "gestore")) {
      return NextResponse.json({ error: "Permessi insufficienti" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId mancante" }, { status: 400 });
    }

    // Prevent self-deletion
    if (userId === user.id) {
      return NextResponse.json({ error: "Non puoi eliminare il tuo account" }, { status: 400 });
    }

    // Delete profile first
    const { error: profileDeleteError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (profileDeleteError) {
      console.error("Errore eliminazione profilo:", profileDeleteError);
      // Continua comunque a eliminare l'utente auth
    }

    // Delete auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Errore interno" },
      { status: 500 }
    );
  }
}
