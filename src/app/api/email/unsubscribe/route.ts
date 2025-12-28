import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";

export const dynamic = "force-dynamic";

/**
 * Email Unsubscribe API
 * Allows users to unsubscribe from marketing/notification emails
 */

export async function POST(request: NextRequest) {
  try {
    const { data: { user } } = await supabaseServer.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { email, category = "all", reason } = await request.json();

    // Verify email belongs to user
    const { data: profile } = await supabaseServer
      .from("profiles")
      .select("email")
      .eq("id", user.id)
      .single();

    if (!profile || profile.email !== email) {
      return NextResponse.json(
        { error: "Invalid email" },
        { status: 400 }
      );
    }

    // Create unsubscribe record
    const { data, error } = await supabaseServer
      .from("email_unsubscribes")
      .insert({
        user_id: user.id,
        email: email,
        unsubscribe_from: category,
        reason: reason || null,
      })
      .select()
      .single();

    if (error) {
      // Check if already unsubscribed
      if (error.code === "23505") {
        return NextResponse.json({
          success: true,
          message: "Already unsubscribed",
        });
      }

      console.error("Error creating unsubscribe:", error);
      return NextResponse.json(
        { error: "Failed to unsubscribe" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      unsubscribe: data,
    });
  } catch (error: any) {
    console.error("Unsubscribe error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { data: { user } } = await supabaseServer.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get user's unsubscribe preferences
    const { data: unsubscribes, error } = await supabaseServer
      .from("email_unsubscribes")
      .select("*")
      .eq("user_id", user.id);

    if (error) {
      console.error("Error fetching unsubscribes:", error);
      return NextResponse.json(
        { error: "Failed to fetch preferences" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      unsubscribes: unsubscribes || [],
    });
  } catch (error: any) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { data: { user } } = await supabaseServer.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { category } = await request.json();

    // Re-subscribe by deleting unsubscribe record
    const { error } = await supabaseServer
      .from("email_unsubscribes")
      .delete()
      .eq("user_id", user.id)
      .eq("unsubscribe_from", category);

    if (error) {
      console.error("Error re-subscribing:", error);
      return NextResponse.json(
        { error: "Failed to re-subscribe" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Re-subscribed successfully",
    });
  } catch (error: any) {
    console.error("Re-subscribe error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
