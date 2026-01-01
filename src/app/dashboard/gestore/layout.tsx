import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gestore Dashboard | GST Tennis Academy",
  description: "Pannello di gestione",
};

export default function GestoreRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
