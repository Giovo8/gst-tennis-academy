// This file exists to handle direct /dashboard/gestore access
// The actual dashboard is in (main)/page.tsx which uses the GestoreLayout

import GestoreLayout from "@/components/dashboard/GestoreLayout";
import GestoreDashboardContent from "./(main)/page";

export default function GestoreRootPage() {
  return (
    <GestoreLayout>
      <GestoreDashboardContent />
    </GestoreLayout>
  );
}
