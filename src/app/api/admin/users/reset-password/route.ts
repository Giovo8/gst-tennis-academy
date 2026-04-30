import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import env from "@/lib/config/env";

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
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "admin" && profile.role !== "gestore")) {
      return NextResponse.json({ error: "Permessi insufficienti" }, { status: 403 });
    }

    const { email } = await request.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email obbligatoria" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Formato email non valido" }, { status: 400 });
    }

    const appBaseUrl = env.publicSiteUrl.replace(/\/$/, "");
    const redirectTo = `${appBaseUrl}/auth/reset-password`;

    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email.toLowerCase(), {
      redirectTo,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Errore interno" },
      { status: 500 }
    );
  }
}
