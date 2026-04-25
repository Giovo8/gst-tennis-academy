import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tornei | GST Tennis Academy",
  description: "Visualizza i tornei organizzati dalla GST Tennis Academy: calendari, risultati e classifiche.",
};

export default function TorneiLayout({ children }: { children: React.ReactNode }) {
  return children;
}
