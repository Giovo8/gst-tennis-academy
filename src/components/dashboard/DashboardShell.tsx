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
  Home,
  Search,
  ChevronLeft,
  ChevronRight,
  User,
  LayoutGrid,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import NotificationsDropdown from "@/components/notifications/NotificationsDropdown";
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
  primaryNavItems?: NavItem[];
}

const roleColors: Record<UserRole, string> = {
  admin: "bg-secondary",
  gestore: "bg-secondary",
  maestro: "bg-secondary",
  atleta: "bg-secondary",
};

export default function DashboardShell({
  children,
  navItems,
  role,
  userName,
  userEmail,
  userAvatar,
  primaryNavItems,
}: DashboardShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<NavItem[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  // Search handler
  useEffect(() => {
    if (searchQuery.trim()) {
      const allItems = primaryNavItems ? [...primaryNavItems, ...navItems] : navItems;
      const results = allItems.filter(item => 
        item.label.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(results);
      setShowSearchResults(true);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  }, [searchQuery, navItems, primaryNavItems]);

  const toggleExpanded = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label)
        ? prev.filter((item) => item !== label)
        : [...prev, label]
    );
  };

  const isActive = (href: string) => {
    // Dashboard principale - deve essere esattamente uguale
    if (
      href === "/dashboard/admin" ||
      href === "/dashboard/atleta" ||
      href === "/dashboard/maestro" ||
      href === "/dashboard/gestore"
    ) {
      return pathname === href;
    }
    // Evidenzia "Gestione Utenti" anche per invite-codes
    if (
      href === "/dashboard/admin/users" &&
      pathname.startsWith("/dashboard/admin/invite-codes")
    ) {
      return true;
    }
    return pathname.startsWith(href);
  };

  const hasPrimarySection = !!primaryNavItems && primaryNavItems.length > 0;

  // Primo item = Dashboard, resto sotto linea separatrice (layout legacy senza sezione primaria)
  const dashboardItem = navItems[0];
  const otherItems = navItems.slice(1);

  // Quando esiste una sezione primaria, evitiamo di duplicare le voci nel menu principale
  const primaryHrefSet = hasPrimarySection
    ? new Set(primaryNavItems!.map((item) => item.href))
    : null;

  const menuItemsWithPrimary = hasPrimarySection
    ? navItems.filter((item) => !primaryHrefSet!.has(item.href))
    : [];

  const renderNavItem = (item: NavItem, depth = 0) => {
    const active = isActive(item.href);
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.label);

    if (hasChildren && !sidebarCollapsed) {
      return (
        <div key={item.label}>
          <button
            onClick={() => toggleExpanded(item.label)}
            className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-md text-secondary/70 hover:bg-secondary/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-secondary/60">{item.icon}</span>
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
          relative flex items-center rounded-md
          transition-colors duration-200
          ${sidebarCollapsed ? "p-3 justify-center" : "px-3 py-2.5 gap-3"}
          ${
            active
              ? "bg-secondary text-white"
              : "text-secondary/70 hover:bg-secondary/5"
          }
        `}
      >
        <span className={`${active ? "text-white" : "text-secondary/60"} flex-shrink-0`}>
          {item.icon}
        </span>
        {!sidebarCollapsed && (
          <>
            <span className="text-sm font-medium flex-1">{item.label}</span>
            {item.badge && item.badge > 0 && (
              <span className={`px-2.5 py-1 text-xs font-bold rounded-md min-w-[28px] text-center ${
                active 
                  ? "bg-white text-secondary" 
                  : "bg-secondary text-white"
              }`}>
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            )}
          </>
        )}
        {sidebarCollapsed && item.badge && item.badge > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-secondary rounded-full ring-2 ring-white" />
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
            <span className="font-bold text-gray-900 text-2xl" style={{ fontFamily: 'var(--font-urbanist)' }}>Area GST</span>
          </Link>
          
          <NotificationsDropdown />
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
          bg-white
          transform transition-all duration-300 ease-in-out
          lg:translate-x-0
          ${sidebarCollapsed ? "w-[70px]" : "w-[260px]"}
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <Link href="/" className={`p-6 flex items-center ${sidebarCollapsed ? "justify-center" : "gap-3"} hover:opacity-80 transition-opacity`}>
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
              <span className="font-bold text-secondary text-2xl" style={{ fontFamily: 'var(--font-urbanist)' }}>Area GST</span>
            )}
          </Link>

          {/* Navigation */}
          <nav className={`flex-1 ${sidebarCollapsed ? "px-2 py-4" : "px-4 py-6"} space-y-6 overflow-y-auto`}>
            {/* Dashboard sempre per primo (senza intestazione) */}
            <div className={sidebarCollapsed ? "space-y-1" : "space-y-2"}>
              <div className="space-y-1">
                {renderNavItem(dashboardItem)}
              </div>
            </div>

            {/* GESTIONE Section - tutte le altre voci */}
            <div className={sidebarCollapsed ? "space-y-1" : "space-y-2"}>
              {!sidebarCollapsed && (
                <h3 className="px-3 text-[10px] font-semibold text-secondary/40 uppercase tracking-wider mb-3">Gestione</h3>
              )}
              <div className="space-y-1">
                {hasPrimarySection ? (
                  <>
                    {/* Prima le primaryNavItems escluso il dashboard */}
                    {primaryNavItems!.filter(item => item.href !== dashboardItem.href).map((item) => renderNavItem(item))}
                    {/* Poi le altre voci non presenti in primaryNavItems */}
                    {menuItemsWithPrimary.map((item) => renderNavItem(item))}
                  </>
                ) : (
                  <>
                    {otherItems.slice(0, -2).map((item) => renderNavItem(item))}
                  </>
                )}
              </div>
            </div>

            {/* GENERAL Section */}
            <div className={sidebarCollapsed ? "space-y-1" : "space-y-2"}>
              {!sidebarCollapsed && (
                <h3 className="px-3 text-[10px] font-semibold text-secondary/40 uppercase tracking-wider mb-3">General</h3>
              )}
              <div className="space-y-1">
                <Link
                  href="/"
                  title={sidebarCollapsed ? "Home" : undefined}
                  className={`flex items-center gap-3 ${sidebarCollapsed ? "p-3" : "px-3 py-2.5"} rounded-md text-secondary/70 hover:bg-secondary/5 transition-colors ${sidebarCollapsed ? "justify-center" : ""}`}
                >
                  <Home className="h-5 w-5" />
                  {!sidebarCollapsed && <span className="text-sm font-medium">Home</span>}
                </Link>
                <Link
                  href={`/dashboard/${role}/profile`}
                  title={sidebarCollapsed ? "Profilo" : undefined}
                  className={`flex items-center gap-3 ${sidebarCollapsed ? "p-3" : "px-3 py-2.5"} rounded-md text-secondary/70 hover:bg-secondary/5 transition-colors ${sidebarCollapsed ? "justify-center" : ""}`}
                >
                  <User className="h-5 w-5" />
                  {!sidebarCollapsed && <span className="text-sm font-medium">Profilo</span>}
                </Link>
                <button
                  onClick={handleLogout}
                  title={sidebarCollapsed ? "Logout" : undefined}
                  className={`w-full flex items-center gap-3 ${sidebarCollapsed ? "p-3" : "px-3 py-2.5"} rounded-md text-secondary/70 hover:bg-secondary/5 transition-colors ${sidebarCollapsed ? "justify-center" : ""}`}
                >
                  <LogOut className="h-5 w-5" />
                  {!sidebarCollapsed && <span className="text-sm font-medium">Logout</span>}
                </button>
              </div>
            </div>
          </nav>

          {/* Footer: only collapse/expand button, profilo spostato nella top bar */}
          <div className={`${sidebarCollapsed ? "p-3" : "p-4"}`}>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-full flex items-center justify-center p-2 rounded-md hover:bg-secondary/5 transition-colors"
              title={sidebarCollapsed ? "Espandi sidebar" : "Riduci sidebar"}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-5 w-5 text-secondary/60" />
              ) : (
                <ChevronLeft className="h-5 w-5 text-secondary/60" />
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`pt-16 lg:pt-0 min-h-screen transition-all duration-300 ${sidebarCollapsed ? "lg:ml-[70px]" : "lg:ml-[260px]"}` }>
        {/* Top bar desktop */}
        <div className="hidden lg:flex items-center justify-between px-8 py-4 bg-white">
          {/* Search */}
          <div className="flex-1 max-w-2xl mr-6 relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Cerca in dashboard..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery && setShowSearchResults(true)}
                onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
                className="w-full pl-9 pr-3 py-2.5 rounded-md border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary/50"
              />
            </div>
            
            {/* Search Results Dropdown */}
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto z-50">
                <div className="p-2">
                  {searchResults.map((item, idx) => (
                    <Link
                      key={idx}
                      href={item.href}
                      onClick={() => {
                        setSearchQuery("");
                        setShowSearchResults(false);
                      }}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      <div className="text-secondary/70">{item.icon}</div>
                      <span className="text-sm font-medium text-gray-900">{item.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            
            {showSearchResults && searchQuery && searchResults.length === 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50">
                <p className="text-sm text-gray-500 text-center">Nessun risultato trovato</p>
              </div>
            )}
          </div>

          {/* Right actions: notifications + account */}
          <div className="flex items-center gap-4">
            <NotificationsDropdown />
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full overflow-hidden bg-secondary text-white flex items-center justify-center text-sm font-semibold">
                {userAvatar ? (
                  <img
                    src={userAvatar}
                    alt={userName || "User"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{userName?.charAt(0)?.toUpperCase() || "U"}</span>
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-900 leading-tight">{userName || "User"}</span>
                <span className="text-xs text-gray-500 leading-tight">{userEmail}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
