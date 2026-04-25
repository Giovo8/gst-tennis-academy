import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";
import { getRouteAuth, unauthorized } from "@/lib/auth/routeAuth";

// GET - Fetch user notifications
export async function GET(request: NextRequest) {
  try {
    const auth = await getRouteAuth();
    if (!auth) return unauthorized();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");
    const unreadOnly = searchParams.get("unread_only") === "true";

    if (!userId) {
      return NextResponse.json(
        { error: "user_id is required" },
        { status: 400 }
      );
    }

    let query = supabaseServer
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (unreadOnly) {
      query = query.eq("is_read", false);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ notifications: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST - Create new notification
export async function POST(request: NextRequest) {
  try {
    const auth = await getRouteAuth();
    if (!auth) return unauthorized();

    const body = await request.json();
    const { user_id, title, message, type, link } = body;

    if (!user_id || !title || !message) {
      return NextResponse.json(
        { error: "user_id, title, and message are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseServer
      .from("notifications")
      .insert({
        user_id,
        title,
        message,
        type: type || "general",
        link: link || null,
        is_read: false,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ notification: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH - Mark notification as read
export async function PATCH(request: NextRequest) {
  try {
    const auth = await getRouteAuth();
    if (!auth) return unauthorized();

    const body = await request.json();
    const { notification_id, user_id, mark_all_read } = body;

    if (mark_all_read && user_id) {
      const { error } = await supabaseServer
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user_id)
        .eq("is_read", false);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ message: "All notifications marked as read" });
    }

    if (!notification_id) {
      return NextResponse.json(
        { error: "notification_id is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseServer
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notification_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ notification: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE - Delete notification
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getRouteAuth();
    if (!auth) return unauthorized();

    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get("notification_id");

    if (!notificationId) {
      return NextResponse.json(
        { error: "notification_id is required" },
        { status: 400 }
      );
    }

    const { error } = await supabaseServer
      .from("notifications")
      .delete()
      .eq("id", notificationId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Notification deleted" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
