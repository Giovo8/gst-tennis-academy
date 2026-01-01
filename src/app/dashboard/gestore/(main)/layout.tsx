import GestoreLayout from "@/components/dashboard/GestoreLayout";
import { ReactNode } from "react";

export default function GestoreMainLayout({ children }: { children: ReactNode }) {
  return <GestoreLayout>{children}</GestoreLayout>;
}
