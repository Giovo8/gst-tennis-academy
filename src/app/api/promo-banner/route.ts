import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Fetch promo banner settings
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("promo_banner_settings")
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json(data || {
      is_enabled: false,
      message: '',
      cta_text: '',
      cta_url: '',
      background_color: 'blue'
    });
  } catch (error: any) {
    console.error("Error fetching promo banner settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch promo banner settings" },
      { status: 500 }
    );
  }
}

// PUT - Update promo banner settings (admin only)
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin or gestore
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "gestore"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { is_enabled, message, cta_text, cta_url, background_color } = body;

    // Get existing settings
    const { data: existing } = await supabase
      .from("promo_banner_settings")
      .select("id")
      .single();

    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from("promo_banner_settings")
        .update({
          is_enabled,
          message,
          cta_text,
          cta_url,
          background_color,
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    } else {
      // Insert new
      const { data, error } = await supabase
        .from("promo_banner_settings")
        .insert({
          is_enabled,
          message,
          cta_text,
          cta_url,
          background_color,
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    }
  } catch (error: any) {
    console.error("Error updating promo banner settings:", error);
    return NextResponse.json(
      { error: "Failed to update promo banner settings" },
      { status: 500 }
    );
  }
}
