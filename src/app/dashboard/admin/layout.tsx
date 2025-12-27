import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Dashboard | GST Tennis Academy",
  description: "Pannello di amministrazione",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
