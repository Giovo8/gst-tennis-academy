import { ReactNode } from "react";

export default function AthleteMainLayout({ children }: { children: ReactNode }) {
  // AthleteLayout is now applied at the parent level (/dashboard/atleta/layout.tsx)
  return children;
}
