import { ReactNode } from "react";

export default function MaestroMainLayout({ children }: { children: ReactNode }) {
  // MaestroAthleteLayout is now applied at the parent level (/dashboard/maestro/layout.tsx)
  return children;
}
