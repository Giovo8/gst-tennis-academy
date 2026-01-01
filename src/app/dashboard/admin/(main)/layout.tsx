import AdminLayout from "@/components/dashboard/AdminLayout";
import { ReactNode } from "react";

export default function AdminMainLayout({ children }: { children: ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>;
}
