import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName, phone, role, inviteCode } = await request.json();

    // Validate input
    if (!email || !password || !fullName || !role) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Use service role for admin operations (can auto-confirm)
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

    // Create user with auto-confirmation (email_confirmed_at is set)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true, // Auto-confirm the email
      user_metadata: {
        full_name: fullName,
        phone,
        role,
      },
    });

    if (authError || !authData.user) {
      console.error("Auth error:", authError);
      return NextResponse.json(
        { error: authError?.message || "Failed to create user" },
        { status: 400 }
      );
    }

    // Wait a moment for trigger to create profile
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Create profile record (if not auto-created by trigger)
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", authData.user.id)
      .single();

    if (!existingProfile) {
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .insert({
          id: authData.user.id,
          email: email.trim().toLowerCase(),
          full_name: fullName,
          role,
        });

      if (profileError) {
        console.error("Profile creation error:", profileError);
      }
    }

    // Mark invite code as used if provided
    if (inviteCode) {
      try {
        await supabaseAdmin
          .from("invite_codes")
          .update({ used_by: authData.user.id, used_at: new Date() })
          .eq("code", inviteCode);

        // Log the action
        await supabaseAdmin
          .from("activity_logs")
          .insert({
            action: "invite_code_used",
            entity_type: "invite_code",
            entity_id: inviteCode,
            user_id: authData.user.id,
            metadata: {
              code: inviteCode,
              role,
              user_email: email.trim().toLowerCase(),
            },
          });
      } catch (err) {
        console.error("Error processing invite code:", err);
      }
    }

    return NextResponse.json({
      user: {
        id: authData.user.id,
        email: authData.user.email,
      },
      message: "User created successfully and email auto-confirmed",
    });
  } catch (error: any) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
