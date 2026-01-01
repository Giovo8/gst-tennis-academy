import { redirect } from "next/navigation";

// Coach = Maestro, redirect to maestro dashboard
export default function CoachDashboardPage() {
  redirect("/dashboard/maestro");
}
