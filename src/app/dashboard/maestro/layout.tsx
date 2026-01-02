import { Metadata } from "next";
import CoachLayoutComponent from "@/components/dashboard/CoachLayout";

export const metadata: Metadata = {
  title: "Dashboard Maestro | GST Tennis Academy",
  description: "Area riservata maestri e coach",
};

export default function MaestroLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CoachLayoutComponent>{children}</CoachLayoutComponent>;
}
