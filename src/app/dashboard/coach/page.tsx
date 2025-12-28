import DashboardLinkCard from "@/components/dashboard/DashboardLinkCard";
import { Target as TargetIcon } from "lucide-react";

export default function CoachDashboardPage() {
  return (
    <DashboardLinkCard
      href="/dashboard/coach/tornei"
      icon={<TargetIcon className="h-12 w-12 text-accent mb-4 group-hover:scale-110 transition-transform" />}
      title="Tornei"
      description="Visualizza i tornei e lo stato delle iscrizioni."
    />
  );
}
