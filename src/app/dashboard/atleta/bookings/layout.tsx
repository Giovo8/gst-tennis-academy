import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Le Tue Prenotazioni | GST Tennis Academy",
  description: "Visualizza e gestisci le tue prenotazioni",
};

export default function AthleteBookingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
