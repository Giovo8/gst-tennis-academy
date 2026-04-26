"use client";

import MaestroOverviewPage from "@/app/dashboard/maestro/(main)/maestro/page";

export default function AdminMaestroPage() {
  return (
    <MaestroOverviewPage
      upcomingStyle="admin"
      upcomingBasePath="/dashboard/admin"
      upcomingRoleFilter="maestro"
    />
  );
}
