import { ReactNode } from "react";

export default function CoachMainLayout({ children }: { children: ReactNode }) {
  // CoachLayout is now applied at the parent level (/dashboard/maestro/layout.tsx)
  return children;
}
