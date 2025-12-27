"use client";

import { Calendar } from "lucide-react";
import BookingCalendar from "@/components/bookings/BookingCalendar";
import AuthGuard from "@/components/auth/AuthGuard";

export default function BookingsPage() {
  return (
    <AuthGuard>
      <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-6 py-12 bg-[#021627] text-white">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-2 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Sistema di Prenotazione
          </p>
          <h1 className="text-4xl font-bold text-white">
            Prenota Campo o Lezione
          </h1>
          <p className="text-sm text-muted">
            Seleziona giorno, campo e orario. Per le lezioni private scegli il maestro desiderato.
          </p>
        </div>

        <BookingCalendar />
      </main>
    </AuthGuard>
  );
}
