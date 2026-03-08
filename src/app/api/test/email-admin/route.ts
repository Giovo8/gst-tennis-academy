import { NextResponse } from "next/server";
import { sendAdminNewBookingAlert } from "@/lib/email/triggers";

// ⚠️ Dev-only endpoint — remove before going to production
export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const result = await sendAdminNewBookingAlert({
    athleteName: "Mario Rossi (test)",
    court: "Campo 1",
    bookingDate: "08/03/2026",
    bookingTime: "10:00",
    bookingId: "test-id-12345",
    participantsCount: 2,
  });

  return NextResponse.json({ result });
}
