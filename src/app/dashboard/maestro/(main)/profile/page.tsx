"use client";

import AthleteProfilePage from "@/app/dashboard/atleta/(main)/profile/page";

export default function MaestroProfilePage() {
  return (
    <AthleteProfilePage
      dashboardPath="/dashboard/maestro"
      profileEditPath="/dashboard/maestro/profile/modifica"
    />
  );
}