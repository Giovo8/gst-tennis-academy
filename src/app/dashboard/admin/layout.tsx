import { Metadata } from "next";
import AdminLayoutComponent from "@/components/dashboard/AdminLayout";

export const metadata: Metadata = {
  title: "Admin Dashboard | GST Tennis Academy",
  description: "Pannello di amministrazione",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayoutComponent>{children}</AdminLayoutComponent>;
}
