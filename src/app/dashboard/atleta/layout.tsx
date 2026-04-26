import { Metadata } from "next";
import AthleteLayoutComponent from "@/components/dashboard/AthleteLayout";

export const metadata: Metadata = {
  title: "Dashboard Atleta | GST Tennis Academy",
  description: "Gestisci i tuoi allenamenti, prenotazioni e tornei",
};

export default function AthleteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AthleteLayoutComponent>{children}</AthleteLayoutComponent>;
}
