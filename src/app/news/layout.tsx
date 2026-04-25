import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "News | GST Tennis Academy",
  description: "Scopri le ultime notizie, eventi e aggiornamenti dalla GST Tennis Academy.",
};

export default function NewsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
