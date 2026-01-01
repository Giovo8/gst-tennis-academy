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
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { type UserRole } from "@/lib/roles";
import { ThemeToggleCompact } from "@/components/theme";

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
}

const roleLabels: Record<UserRole, string> = {
  admin: "Amministratore",
  gestore: "Gestore",
  maestro: "Maestro",
  atleta: "Atleta",
};

const roleColors: Record<UserRole, string> = {
  admin: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  gestore: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  maestro: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
  atleta: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
};

export default function DashboardShell({
  children,
  navItems,
  role,
  userName,
  userEmail,
}: DashboardShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
    return pathname === href || pathname.startsWith(href + "/");
  };

  const renderNavItem = (item: NavItem, depth = 0) => {
    const active = isActive(item.href);
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.label);

    if (hasChildren) {
      return (
        <div key={item.label}>
          <button
            onClick={() => toggleExpanded(item.label)}
            className={`
              w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg
              text-[var(--foreground-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]
              transition-all duration-200
              ${depth > 0 ? "pl-10" : ""}
            `}
          >
            <div className="flex items-center gap-3">
              <span className="text-[var(--foreground-subtle)]">{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
            </div>
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
          </button>
          {isExpanded && (
            <div className="mt-1 space-y-1">
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
        className={`
          flex items-center justify-between gap-3 px-4 py-3 rounded-lg
          transition-all duration-200
          ${depth > 0 ? "pl-10" : ""}
          ${
            active
              ? "bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/25"
              : "text-[var(--foreground-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
          }
        `}
      >
        <div className="flex items-center gap-3">
          <span className={active ? "text-white" : "text-[var(--foreground-subtle)]"}>
            {item.icon}
          </span>
          <span className="text-sm font-medium">{item.label}</span>
        </div>
        {item.badge && item.badge > 0 && (
          <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-red-500 text-white">
            {item.badge > 99 ? "99+" : item.badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-[var(--background-subtle)]">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 h-16 bg-[var(--surface)] border-b border-[var(--border)] px-4 flex items-center justify-between">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
        >
          <Menu className="h-6 w-6 text-[var(--foreground)]" />
        </button>
        
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/images/logo-tennis.png"
            alt="GST Tennis Academy"
            width={32}
            height={32}
            className="h-8 w-8"
          />
          <span className="font-bold text-[var(--foreground)]">GST Academy</span>
        </Link>
        
        <div className="flex items-center gap-2">
          <ThemeToggleCompact />
          <Link
            href="/notifications"
            className="relative p-2 rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
          >
            <Bell className="h-5 w-5 text-[var(--foreground-muted)]" />
            {notificationCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </Link>
        </div>
      </header>

      {/* Sidebar Overlay (Mobile) */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-[280px] bg-[var(--surface)] border-r border-[var(--border)]
          transform transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-[var(--border)]">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center shadow-lg shadow-[var(--primary)]/25">
                  <span className="text-white font-bold text-lg">G</span>
                </div>
                <div>
                  <h1 className="font-bold text-[var(--foreground)] text-sm">GST TENNIS</h1>
                  <p className="text-xs text-[var(--foreground-subtle)]">Academy</p>
                </div>
              </Link>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-2 rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
              >
                <X className="h-5 w-5 text-[var(--foreground-muted)]" />
              </button>
            </div>
          </div>

          {/* User Info */}
          <div className="px-6 py-4 border-b border-[var(--border)] bg-[var(--background-subtle)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-white font-semibold">
                {userName?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--foreground)] truncate">
                  {userName || "Utente"}
                </p>
                <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${roleColors[role]}`}>
                  {roleLabels[role]}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="space-y-1">
              {navItems.map((item) => renderNavItem(item))}
            </div>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-[var(--border)] space-y-2">
            <div className="flex items-center justify-between px-2">
              <span className="text-xs text-[var(--foreground-subtle)]">Tema</span>
              <ThemeToggleCompact />
            </div>
            
            <Link
              href="/"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-[var(--foreground-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] transition-colors"
            >
              <Home className="h-5 w-5" />
              <span className="text-sm font-medium">Torna al Sito</span>
            </Link>
            
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span className="text-sm font-medium">Esci</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-[280px] min-h-screen pt-16 lg:pt-0">
        {/* Desktop Header */}
        <header className="hidden lg:flex h-16 bg-[var(--surface)] border-b border-[var(--border)] px-6 items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              Dashboard {roleLabels[role]}
            </h2>
          </div>
          
          <div className="flex items-center gap-3">
            <Link
              href="/notifications"
              className="relative p-2 rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
            >
              <Bell className="h-5 w-5 text-[var(--foreground-muted)]" />
              {notificationCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white font-bold flex items-center justify-center">
                  {notificationCount > 9 ? "9+" : notificationCount}
                </span>
              )}
            </Link>
            
            <div className="h-8 w-px bg-[var(--border)]" />
            
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-[var(--foreground)]">{userName}</p>
                <p className="text-xs text-[var(--foreground-subtle)]">{userEmail}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-white font-semibold">
                {userName?.charAt(0)?.toUpperCase() || "U"}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
