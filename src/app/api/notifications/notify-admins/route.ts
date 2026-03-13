import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST - Notify all admins and gestori
export async function POST(request: NextRequest) {
  try {
    const { title, message, link } = await request.json();

    if (!title || !message) {
      return NextResponse.json(
        { error: "title and message are required" },
        { status: 400 }
      );
    }

    // Get all admin and gestore users
    const { data: admins, error: adminsError } = await supabase
      .from("profiles")
      .select("id")
      .in("role", ["admin", "gestore"]);

    if (adminsError) {
      return NextResponse.json({ error: adminsError.message }, { status: 500 });
    }

    if (!admins || admins.length === 0) {
      return NextResponse.json({ message: "No admins found" });
    }

    // Create notifications for all admins
    const notifications = admins.map((admin) => ({
      user_id: admin.id,
      title,
      message,
      type: "info",
      link: link || null,
      is_read: false,
    }));

    const { error: notifError } = await supabase
      .from("notifications")
      .insert(notifications);

    if (notifError) {
      return NextResponse.json({ error: notifError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: `Notified ${admins.length} admins`,
      count: admins.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
