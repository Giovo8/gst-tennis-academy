import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";

export const dynamic = "force-dynamic";

type EmailLogRow = {
  id: string;
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  template_name: string;
  status: string;
  provider: string;
  provider_message_id: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  failed_at: string | null;
  error_message: string | null;
  created_at: string;
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");

    const { data: primaryLogs, error: primaryError } = (await supabaseServer
      .from("email_logs")
      .select(
        "id, recipient_email, recipient_name, subject, template_name, status, provider, provider_message_id, sent_at, delivered_at, opened_at, clicked_at, error_message, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(limit)) as any;

    if (!primaryError) {
      const logs: EmailLogRow[] = (primaryLogs || []).map((row: any) => ({
        ...row,
        failed_at: null,
      }));
      return NextResponse.json({ logs });
    }

    const { data: fallbackLogs, error: fallbackError } = (await supabaseServer
      .from("email_log")
      .select(
        "id, recipient_email, recipient_name, subject, template_name, status, provider, sent_at, delivered_at, failed_at, error_message, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(limit)) as any;

    if (fallbackError) {
      console.error("Error loading email logs:", {
        primary: primaryError.message,
        fallback: fallbackError.message,
      });
      return NextResponse.json(
        { error: fallbackError.message || primaryError.message },
        { status: 500 }
      );
    }

    const logs: EmailLogRow[] = (fallbackLogs || []).map((row: any) => ({
      id: row.id,
      recipient_email: row.recipient_email,
      recipient_name: row.recipient_name || null,
      subject: row.subject,
      template_name: row.template_name,
      status: row.status,
      provider: row.provider || "resend",
      provider_message_id: null,
      sent_at: row.sent_at || null,
      delivered_at: row.delivered_at || null,
      opened_at: null,
      clicked_at: null,
      failed_at: row.failed_at || null,
      error_message: row.error_message || null,
      created_at: row.created_at,
    }));

    return NextResponse.json({ logs });
  } catch (err: any) {
    console.error("Exception loading email logs:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
