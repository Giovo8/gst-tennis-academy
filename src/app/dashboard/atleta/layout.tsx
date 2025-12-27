import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard Atleta | GST Tennis Academy",
  description: "Gestisci i tuoi allenamenti, prenotazioni e abbonamenti",
};

export default function AthleteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
