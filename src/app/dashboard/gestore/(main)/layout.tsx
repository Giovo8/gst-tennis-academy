import { ReactNode } from "react";

export default function GestoreMainLayout({ children }: { children: ReactNode }) {
  // GestoreLayout is now applied at the parent level (/dashboard/gestore/layout.tsx)
  return children;
}
