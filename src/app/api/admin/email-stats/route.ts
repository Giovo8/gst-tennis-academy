import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";

export const dynamic = "force-dynamic";

// GET /api/admin/email-stats - Get email statistics
export async function GET(req: NextRequest) {
  try {
    const supabase = supabaseServer;

    // Verify admin access
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const { data: profile } = (await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()) as any;

    if (!profile || (profile.role !== "admin" && profile.role !== "gestore")) {
      return NextResponse.json({ error: "Accesso negato" }, { status: 403 });
    }

    // Get email statistics from email_logs table
    const { data: logs, error } = await supabase
      .from("email_logs")
      .select("status, opened_at, clicked_at");

    if (error) {
      console.error("Error fetching email logs:", error);
      return NextResponse.json({ error: "Errore nel recupero delle statistiche" }, { status: 500 });
    }

    const stats = {
      total_sent: logs?.length || 0,
      total_delivered: logs?.filter((log: any) => log.status === "delivered").length || 0,
      total_opened: logs?.filter((log: any) => log.opened_at).length || 0,
      total_clicked: logs?.filter((log: any) => log.clicked_at).length || 0,
      total_failed: logs?.filter((log: any) => log.status === "failed" || log.status === "bounced").length || 0,
    };

    return NextResponse.json({ stats });
  } catch (error) {
    console.error("Error in email-stats:", error);
    return NextResponse.json({ error: "Errore del server" }, { status: 500 });
  }
}
