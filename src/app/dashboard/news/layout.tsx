import { Metadata } from "next";
import AdminLayoutComponent from "@/components/dashboard/AdminLayout";

export const metadata: Metadata = {
  title: "News AI Dashboard | GST Tennis Academy",
  description: "Modulo AI News nel pannello admin/gestore",
};

export default function DashboardNewsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayoutComponent>{children}</AdminLayoutComponent>;
}
