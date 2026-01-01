"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, LayoutDashboard } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { type UserRole } from "@/lib/roles";
import { useEffect, useState } from "react";

interface MenuItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface DashboardSidebarProps {
  items: MenuItem[];
  role: UserRole;
  userName?: string;
}

export default function DashboardSidebar({ items, role, userName }: DashboardSidebarProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const roleLabels: Record<UserRole, string> = {
    admin: "Amministratore",
    gestore: "Gestore",
    maestro: "Maestro",
    atleta: "Atleta",
  };

  if (!mounted) return null;

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col min-h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">G</span>
          </div>
          <div>
            <h1 className="font-bold text-gray-900 text-sm">GST TENNIS</h1>
            <p className="text-xs text-gray-500">Academy</p>
          </div>
        </Link>
      </div>

      {/* User Info */}
      {userName && (
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-cyan-50 to-blue-50">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
            {roleLabels[role]}
          </p>
          <p className="text-sm font-semibold text-gray-900">{userName}</p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                  ${isActive 
                    ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md" 
                    : "text-gray-700 hover:bg-gray-100"
                  }
                `}
              >
                <span className={isActive ? "text-white" : "text-gray-500"}>
                  {item.icon}
                </span>
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors duration-200"
        >
          <LogOut className="h-5 w-5" />
          <span className="text-sm font-medium">Esci</span>
        </button>
      </div>
    </aside>
  );
}
