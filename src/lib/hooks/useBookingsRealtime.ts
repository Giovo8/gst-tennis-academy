"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type BookingType = "campo" | "lezione_privata" | "lezione_gruppo";

type BookingRecord = {
  id: string;
  user_id: string;
  coach_id: string | null;
  court: string;
  type: BookingType;
  start_time: string;
  end_time: string;
  status?: string;
  coach_confirmed?: boolean;
  manager_confirmed?: boolean;
};

/**
 * Hook per aggiornamenti real-time delle prenotazioni
 * Sottoscrive a INSERT, UPDATE, DELETE sulla tabella bookings
 */
export function useBookingsRealtime(
  date: Date,
  onUpdate?: (bookings: BookingRecord[]) => void
) {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Calcola range giornaliero
    const startDay = new Date(date);
    startDay.setHours(8, 0, 0, 0);
    
    const endDay = new Date(date);
    endDay.setHours(22, 0, 0, 0);

    // Caricamento iniziale
    const fetchBookings = async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id,user_id,coach_id,court,type,start_time,end_time,status,coach_confirmed,manager_confirmed")
        .neq("status", "cancelled")
        .gte("start_time", startDay.toISOString())
        .lt("start_time", endDay.toISOString());

      if (!error && data) {
        setBookings(data as BookingRecord[]);
        onUpdate?.(data as BookingRecord[]);
      }
      setLoading(false);
    };

    fetchBookings();

    // Sottoscrizione real-time
    const channel = supabase
      .channel("bookings-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
        },
        async () => {
          // Ricarica bookings per avere dati aggiornati
          await fetchBookings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [date, onUpdate]);

  return { bookings, loading, refetch: async () => {
    const startDay = new Date(date);
    startDay.setHours(8, 0, 0, 0);
    
    const endDay = new Date(date);
    endDay.setHours(22, 0, 0, 0);

    const { data, error } = await supabase
      .from("bookings")
      .select("id,user_id,coach_id,court,type,start_time,end_time,status,coach_confirmed,manager_confirmed")
      .neq("status", "cancelled")
      .gte("start_time", startDay.toISOString())
      .lt("start_time", endDay.toISOString());

    if (!error && data) {
      setBookings(data as BookingRecord[]);
      onUpdate?.(data as BookingRecord[]);
    }
  }};
}
