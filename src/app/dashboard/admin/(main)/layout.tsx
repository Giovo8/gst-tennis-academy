import { ReactNode } from "react";

export default function AdminMainLayout({ children }: { children: ReactNode }) {
  // AdminLayout is now applied at the parent level (/dashboard/admin/layout.tsx)
  return children;
}
