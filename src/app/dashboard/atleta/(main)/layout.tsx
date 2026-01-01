import AthleteLayout from "@/components/dashboard/AthleteLayout";
import { ReactNode } from "react";

export default function AthleteMainLayout({ children }: { children: ReactNode }) {
  return <AthleteLayout>{children}</AthleteLayout>;
}
