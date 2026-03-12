import { NextResponse } from "next/server";
import { sendAdminNewBookingAlert } from "@/lib/email/triggers";
import { verifyAuth } from "@/lib/auth/verifyAuth";
import { supabaseServer } from "@/lib/supabase/serverClient";

/**
 * Endpoint di diagnostica email — solo admin autenticati.
 * Restituisce lo stato del servizio email, gli indirizzi degli admin trovati nel DB
 * e il risultato dell'invio di una mail di test.
 * GET /api/test/email-admin
 */
export async function GET(req: Request) {
  const auth = await verifyAuth(req, ["admin", "gestore"]);
  if (!auth.success) return auth.response;

  // --- 1. Stato variabili d'ambiente ---
  const resendKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM;
  const envStatus = {
    RESEND_API_KEY: resendKey
      ? resendKey === "re_placeholder_key_for_build"
        ? "⚠️ placeholder (non valida)"
        : `✅ impostata (${resendKey.slice(0, 8)}...)`
      : "❌ mancante",
    EMAIL_FROM: emailFrom ?? "❌ mancante (usa fallback noreply@gstacademy.it)",
  };

  // --- 2. Admin/gestori trovati nel DB ---
  const { data: admins, error: adminsError } = await supabaseServer
    .from("profiles")
    .select("id, email, full_name, role")
    .in("role", ["admin", "gestore"]);

  const adminList = admins?.map((a) => ({
    full_name: a.full_name,
    email: a.email ?? "(email vuota)",
    role: a.role,
  })) ?? [];

  // --- 3. Invio email di test ---
  const sendResult = await sendAdminNewBookingAlert({
    athleteName: "Mario Rossi (test diagnostica)",
    court: "Campo 1",
    bookingDate: new Date().toLocaleDateString("it-IT"),
    bookingTime: "10:00",
    bookingId: "test-diagnostica-" + Date.now(),
    participantsCount: 1,
  });

  return NextResponse.json({
    env: envStatus,
    adminsInDb: {
      count: admins?.length ?? 0,
      fetchError: adminsError?.message ?? null,
      list: adminList,
    },
    sendResult,
  });
}
