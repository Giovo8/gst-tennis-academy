"use client";

import DashboardSidebar from "./DashboardSidebar";
import { type UserRole } from "@/lib/roles";

interface MenuItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  items: MenuItem[];
  role: UserRole;
  userName?: string;
}

export default function DashboardLayout({ children, items, role, userName }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <DashboardSidebar items={items} role={role} userName={userName} />
      <main className="flex-1 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
