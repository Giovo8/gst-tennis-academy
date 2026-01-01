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
      .select("id, email, full_name, email_notifications_enabled")
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

    // Send email notifications to admins who have them enabled
    const adminsWithEmail = admins.filter((admin) => admin.email_notifications_enabled);

    for (const admin of adminsWithEmail) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/email/notification`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: admin.email,
            name: admin.full_name,
            title,
            message,
            link,
          }),
        });
      } catch (emailError) {
        console.error(`Failed to send email to ${admin.email}:`, emailError);
      }
    }

    return NextResponse.json({
      message: `Notified ${admins.length} admins`,
      count: admins.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
