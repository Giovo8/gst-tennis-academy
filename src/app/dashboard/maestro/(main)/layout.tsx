import CoachLayout from "@/components/dashboard/CoachLayout";
import { ReactNode } from "react";

export default function CoachMainLayout({ children }: { children: ReactNode }) {
  return <CoachLayout>{children}</CoachLayout>;
}
