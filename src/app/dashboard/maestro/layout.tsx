import { Metadata } from "next";
import MaestroAthleteLayout from "@/components/dashboard/MaestroAthleteLayout";

export const metadata: Metadata = {
  title: "Dashboard Maestro | GST Tennis Academy",
  description: "Area riservata maestri e coach",
};

export default function MaestroLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MaestroAthleteLayout>{children}</MaestroAthleteLayout>;
}
