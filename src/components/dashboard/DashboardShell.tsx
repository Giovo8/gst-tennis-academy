"use client";

import { useState, useEffect, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  Menu,
  X,
  LogOut,
  ChevronDown,
  Bell,
  Home,
  Search,
  Settings,
  ChevronLeft,
  ChevronRight,
  User,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { type UserRole } from "@/lib/roles";

export interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
  badge?: number;
  children?: NavItem[];
}

interface DashboardShellProps {
  children: ReactNode;
  navItems: NavItem[];
  role: UserRole;
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
}

const roleColors: Record<UserRole, string> = {
  admin: "bg-frozen-600",
  gestore: "bg-frozen-600",
  maestro: "bg-frozen-500",
  atleta: "bg-frozen-500",
};

export default function DashboardShell({
  children,
  navItems,
  role,
  userName,
  userEmail,
  userAvatar,
}: DashboardShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      setNotificationCount(count || 0);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const toggleExpanded = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label)
        ? prev.filter((item) => item !== label)
        : [...prev, label]
    );
  };

  const isActive = (href: string) => {
    // Dashboard principale - deve essere esattamente uguale
    if (href === "/dashboard/admin" || href === "/dashboard/atleta" || href === "/dashboard/maestro" || href === "/dashboard/gestore") {
      return pathname === href;
    }
    // Evidenzia "Gestione Utenti" anche per invite-codes
    if (href === "/dashboard/admin/users" && pathname.startsWith("/dashboard/admin/invite-codes")) {
      return true;
    }
    return pathname.startsWith(href);
  };

  // Primo item = Dashboard, resto sotto linea separatrice
  const dashboardItem = navItems[0];
  const otherItems = navItems.slice(1);

  const renderNavItem = (item: NavItem, depth = 0) => {
    const active = isActive(item.href);
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.label);

    if (hasChildren && !sidebarCollapsed) {
      return (
        <div key={item.label}>
          <button
            onClick={() => toggleExpanded(item.label)}
            className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-gray-500">{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
            </div>
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
          </button>
          {isExpanded && (
            <div className="mt-1 space-y-1 ml-9">
              {item.children!.map((child) => renderNavItem(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setSidebarOpen(false)}
        title={sidebarCollapsed ? item.label : undefined}
        className={`
          relative flex items-center rounded-xl
          transition-colors duration-200
          ${sidebarCollapsed ? "p-3 justify-center" : "px-3 py-2.5 gap-3"}
          ${
            active
              ? "bg-frozen-500 text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-50"
          }
        `}
      >
        <span className={`${active ? "text-white" : "text-gray-500"} flex-shrink-0`}>
          {item.icon}
        </span>
        {!sidebarCollapsed && (
          <>
            <span className="text-sm font-medium flex-1">{item.label}</span>
            {item.badge && item.badge > 0 && (
              <span className={`px-2.5 py-1 text-xs font-bold rounded-lg min-w-[28px] text-center shadow-sm ${
                active 
                  ? "bg-white text-frozen-600" 
                  : "bg-frozen-500 text-white"
              }`}>
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            )}
          </>
        )}
        {sidebarCollapsed && item.badge && item.badge > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-frozen-500 rounded-full shadow-md ring-2 ring-white" />
        )}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header - solo per mobile */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 h-16 bg-white border-b border-gray-200">
        <div className="h-full px-4 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Menu className="h-5 w-5 text-gray-600" />
          </button>
          
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/images/logo-tennis.png"
              alt="GST Tennis Academy"
              width={32}
              height={32}
              className="h-8 w-8"
            />
            <span className="font-bold text-gray-900">GST Academy</span>
          </Link>
          
          <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <Bell className="h-5 w-5 text-gray-600" />
            {notificationCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>
        </div>
      </header>

      {/* Sidebar Overlay (Mobile) */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-screen
          bg-white border-r border-gray-200 shadow-sm
          transform transition-all duration-300 ease-in-out
          lg:translate-x-0
          ${sidebarCollapsed ? "w-[70px]" : "w-[260px]"}
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className={`p-6 border-b border-gray-200 flex items-center ${sidebarCollapsed ? "justify-center" : "gap-3"}`}>
            <div className="flex-shrink-0">
              <Image
                src="/images/logo-tennis.png"
                alt="GST Tennis Academy"
                width={36}
                height={36}
                className="w-9 h-9 object-contain"
              />
            </div>
            {!sidebarCollapsed && (
              <span className="font-bold text-gray-900 text-base">GST Academy</span>
            )}
          </div>

          {/* Navigation */}
          <nav className={`flex-1 ${sidebarCollapsed ? "px-2 py-4" : "px-4 py-6"} space-y-6 overflow-y-auto`}>
            {/* MENU Section */}
            <div className={sidebarCollapsed ? "space-y-1" : "space-y-2"}>
              {!sidebarCollapsed && (
                <h3 className="px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Menu</h3>
              )}
              <div className="space-y-1">
                {renderNavItem(dashboardItem)}
                {otherItems.slice(0, -2).map((item) => renderNavItem(item))}
              </div>
            </div>

            {/* Separatore quando collassata */}
            {sidebarCollapsed && <div className="border-t border-gray-200 mx-2" />}

            {/* GENERAL Section */}
            <div className={sidebarCollapsed ? "space-y-1" : "space-y-2"}>
              {!sidebarCollapsed && (
                <h3 className="px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">General</h3>
              )}
              <div className="space-y-1">
                <Link
                  href="/"
                  title={sidebarCollapsed ? "Home" : undefined}
                  className={`flex items-center gap-3 ${sidebarCollapsed ? "p-3" : "px-3 py-2.5"} rounded-xl text-gray-600 hover:bg-gray-50 transition-colors ${sidebarCollapsed ? "justify-center" : ""}`}
                >
                  <Home className="h-5 w-5" />
                  {!sidebarCollapsed && <span className="text-sm font-medium">Home</span>}
                </Link>
                <Link
                  href={`/dashboard/${role}/profile`}
                  title={sidebarCollapsed ? "Profilo" : undefined}
                  className={`flex items-center gap-3 ${sidebarCollapsed ? "p-3" : "px-3 py-2.5"} rounded-xl text-gray-600 hover:bg-gray-50 transition-colors ${sidebarCollapsed ? "justify-center" : ""}`}
                >
                  <User className="h-5 w-5" />
                  {!sidebarCollapsed && <span className="text-sm font-medium">Profilo</span>}
                </Link>
                <Link
                  href="/dashboard/admin/settings"
                  title={sidebarCollapsed ? "Impostazioni" : undefined}
                  className={`flex items-center gap-3 ${sidebarCollapsed ? "p-3" : "px-3 py-2.5"} rounded-xl text-gray-600 hover:bg-gray-50 transition-colors ${sidebarCollapsed ? "justify-center" : ""}`}
                >
                  <Settings className="h-5 w-5" />
                  {!sidebarCollapsed && <span className="text-sm font-medium">Impostazioni</span>}
                </Link>
                <button
                  onClick={handleLogout}
                  title={sidebarCollapsed ? "Logout" : undefined}
                  className={`w-full flex items-center gap-3 ${sidebarCollapsed ? "p-3" : "px-3 py-2.5"} rounded-xl text-gray-600 hover:bg-gray-50 transition-colors ${sidebarCollapsed ? "justify-center" : ""}`}
                >
                  <LogOut className="h-5 w-5" />
                  {!sidebarCollapsed && <span className="text-sm font-medium">Logout</span>}
                </button>
              </div>
            </div>
          </nav>

          {/* User Info Footer */}
          <div className={`${sidebarCollapsed ? "p-3" : "p-4"} border-t border-gray-200 space-y-3`}>
            {/* Toggle Button */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-full flex items-center justify-center p-2 rounded-xl hover:bg-gray-100 transition-colors"
              title={sidebarCollapsed ? "Espandi sidebar" : "Riduci sidebar"}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-5 w-5 text-gray-600" />
              ) : (
                <ChevronLeft className="h-5 w-5 text-gray-600" />
              )}
            </button>
            
            {/* User Info */}
            {sidebarCollapsed ? (
              <div className="flex justify-center">
                <div 
                  className="w-10 h-10 rounded-full shadow-md ring-2 ring-gray-100 overflow-hidden"
                  title={userName || "User"}
                >
                  {userAvatar ? (
                    <img
                      src={userAvatar}
                      alt={userName || "User"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className={`w-full h-full ${roleColors[role]} flex items-center justify-center text-white font-bold text-sm`}>
                      {userName?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-frozen-50 border border-frozen-100">
                <div className="w-10 h-10 rounded-full shadow-md ring-2 ring-white overflow-hidden flex-shrink-0">
                  {userAvatar ? (
                    <img
                      src={userAvatar}
                      alt={userName || "User"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className={`w-full h-full ${roleColors[role]} flex items-center justify-center text-white font-bold text-sm`}>
                      {userName?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{userName || "User"}</p>
                  <p className="text-xs font-medium text-gray-600 truncate">{userEmail}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`pt-16 lg:pt-0 min-h-screen transition-all duration-300 ${sidebarCollapsed ? "lg:ml-[70px]" : "lg:ml-[260px]"}` }>
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
