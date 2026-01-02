import { Metadata } from "next";
import GestoreLayoutComponent from "@/components/dashboard/GestoreLayout";

export const metadata: Metadata = {
  title: "Gestore Dashboard | GST Tennis Academy",
  description: "Pannello di gestione",
};

export default function GestoreRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <GestoreLayoutComponent>{children}</GestoreLayoutComponent>;
}
