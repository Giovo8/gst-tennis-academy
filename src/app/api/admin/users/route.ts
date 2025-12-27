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
    const { email, password, full_name, role } = body;

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

    // Verifica se l'email esiste già (nella tabella profiles)
    const { data: existingProfiles, error: checkError } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("email", email.toLowerCase())
      .limit(1);

    if (!checkError && existingProfiles && existingProfiles.length > 0) {
      return NextResponse.json(
        { error: "Questa email è già registrata nel sistema" },
        { status: 400 }
      );
    }

    // Create user with admin client
    console.log("Tentativo creazione utente:", { email: email.toLowerCase(), role, full_name });
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true,
    });

    if (createError) {
      console.error("Errore auth.admin.createUser:", createError);
      let errorMessage = "Errore durante la creazione dell'utente";
      
      if (createError.message.includes("already") || createError.message.includes("Database error")) {
        errorMessage = "Questa email è già registrata nel sistema";
      } else if (createError.message.includes("password")) {
        errorMessage = "Password non valida";
      } else if (createError.message.includes("email")) {
        errorMessage = "Email non valida";
      }
      
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    if (!newUser.user) {
      console.error("newUser.user è null");
      return NextResponse.json({ error: "Errore creazione utente" }, { status: 500 });
    }

    console.log("✅ Utente auth creato con successo, ID:", newUser.user.id);

    // Create or update profile with role using upsert
    const profileData = {
      id: newUser.user.id,
      email: email.toLowerCase(),
      full_name: full_name?.trim() || null,
      role: role || "atleta",
    };
    
    console.log("Tentativo upsert profilo:", profileData);
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert(profileData, {
        onConflict: "id"
      });

    if (profileError) {
      console.error("❌ Errore upsert profilo:", profileError);
      // Tenta di eliminare l'utente auth se il profilo fallisce
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return NextResponse.json(
        { error: "Errore creazione profilo. Utente non creato." },
        { status: 500 }
      );
    }

    console.log("✅ Profilo creato con successo");

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

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Errore eliminazione utente:", error);
    return NextResponse.json(
      { error: error.message || "Errore interno" },
      { status: 500 }
    );
  }
}
