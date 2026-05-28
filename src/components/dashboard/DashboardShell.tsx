"use client";

import React, { useState, useEffect, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  LogOut,
  Search,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import NotificationsDropdown from "@/components/notifications/NotificationsDropdown";
import { type UserRole } from "@/lib/roles";
import { handleLogout } from "@/lib/auth/logout";

export interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
  badge?: number;
  children?: NavItem[];
  separatorAfter?: boolean;
}

interface DashboardShellProps {
  children: ReactNode;
  navItems: NavItem[];
  role: UserRole;
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
  primaryNavItems?: NavItem[];
  userId?: string;
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
  userId,
}: DashboardShellProps) {
  const pathname = usePathname();
  const profileHref = (role === "admin" || role === "gestore") && userId
    ? `/dashboard/admin/users/${userId}`
    : `/dashboard/${role}/profile`;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifCloseSignal, setNotifCloseSignal] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<NavItem[]>([]);
  const [showSearchModal, setShowSearchModal] = useState(false);

  // Force remove dark class on mount to ensure light mode
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    localStorage.removeItem('darkMode');
  }, []);

  // Search handler
  useEffect(() => {
    if (searchQuery.trim()) {
      const allItems = primaryNavItems ? [...primaryNavItems, ...navItems] : navItems;
      const results = allItems.filter(item => 
        item.label.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, navItems, primaryNavItems]);

  const isActive = (href: string) => {
    // Dashboard principale - deve essere esattamente uguale
    if (
      href === "/dashboard/admin" ||
      href === "/dashboard/atleta" ||
      href === "/dashboard/maestro"
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
    // Evidenzia "Prenotazioni" anche per courts (blocco campi)
    if (
      href === "/dashboard/admin/bookings" &&
      pathname.startsWith("/dashboard/admin/courts")
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

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Top Navbar - solo mobile */}
      <header className="lg:hidden fixed top-4 left-6 right-6 z-[110] bg-white border border-gray-200 shadow-sm rounded-xl [transform:translateZ(0)]">
        <div className="h-16 relative flex items-center px-4">
          <button
            onClick={() => { setMobileOpen(!mobileOpen); setNotifCloseSignal(s => s + 1); }}
            className={`flex items-center justify-center w-9 h-9 rounded-lg transition-colors focus:outline-none ${mobileOpen ? "bg-secondary text-white" : "hover:bg-gray-100 text-secondary"}`}
            aria-label="Apri menu"
          >
            {mobileOpen ? <X className="h-5 w-5" strokeWidth={2.5} /> : <Menu className="h-5 w-5" strokeWidth={2.5} />}
          </button>
          <Link href="/" aria-label="Home" className="absolute left-1/2 -translate-x-1/2" onClick={() => setNotifCloseSignal(s => s + 1)}>
            <Image src="/images/logo-tennis.png" alt="GST" width={40} height={40} className="h-10 w-10 object-contain" />
          </Link>
          <div className="ml-auto">
            <NotificationsDropdown iconSize="h-5 w-5" closeSignal={notifCloseSignal} onOpen={() => setMobileOpen(false)} />
          </div>
        </div>
      </header>

      {/* Mobile sidebar overlay */}
      <aside className={`lg:hidden fixed top-[6rem] left-6 right-6 z-[100] flex flex-col bg-white rounded-2xl overflow-hidden shadow-xl border border-gray-200 max-h-[calc(100dvh-7rem)] transition-all duration-300 ease-in-out ${mobileOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-3 pointer-events-none'}`}>
          <div className="px-4 py-3 bg-secondary flex items-center flex-shrink-0">
            <h3 className="font-semibold text-white">Area GST</h3>
          </div>
          <nav className="flex-1 overflow-y-auto py-2">
            {[dashboardItem, ...(hasPrimarySection
              ? [...primaryNavItems!.filter(i => i.href !== dashboardItem.href), ...menuItemsWithPrimary]
              : otherItems
            )].map((item, index) => {
              const active = isActive(item.href);
              return (
                <React.Fragment key={item.href}>
                  <Link href={item.href} onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 mx-2 px-3 py-2 rounded-lg transition-colors ${active ? "bg-secondary text-white" : "text-secondary hover:bg-gray-50"}`}>
                    <span className={`flex-shrink-0 [&>svg]:!h-4 [&>svg]:!w-4 ${active ? "text-white" : "text-secondary/70"}`}>{item.icon}</span>
                    <span className="text-sm font-medium flex-1">{item.label}</span>
                    {item.badge && item.badge > 0 && (
                      <span className={`px-1.5 py-0.5 text-xs font-bold rounded ${active ? "bg-white text-secondary" : "bg-secondary text-white"}`}>{item.badge > 99 ? "99+" : item.badge}</span>
                    )}
                  </Link>
                  {index === 0 && <div className="mx-3 my-2 border-t border-gray-200" />}
                  {index > 0 && item.separatorAfter && <div className="mx-3 my-2 border-t border-gray-200" />}
                </React.Fragment>
              );
            })}
          </nav>
          <div className="border-t border-gray-200 p-3 space-y-1">
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary/10 transition-colors text-gray-700">
              <LogOut className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm font-medium">Esci</span>
            </button>
            <Link href={profileHref} onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors w-full min-w-0">
              <div className="w-7 h-7 rounded-md overflow-hidden bg-secondary text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
                {userAvatar ? <img src={userAvatar} alt={userName || "User"} className="w-full h-full object-cover" /> : <span>{userName?.charAt(0)?.toUpperCase() || "U"}</span>}
              </div>
              {userName && <span className="text-sm font-medium text-gray-700 truncate">{userName}</span>}
            </Link>
          </div>
        </aside>

      {/* Layout desktop: container con sidebar + contenuto in riga */}
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8 flex min-h-screen pt-[5rem] lg:pt-0">

        {/* Sidebar desktop - sticky dentro il container */}
        <aside className={`hidden lg:flex flex-col flex-shrink-0 sticky top-4 h-[calc(100vh-2rem)] bg-white border border-gray-200 rounded-2xl overflow-hidden -ml-8 mr-8 shadow-sm transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-56'}`}>
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 h-20 border-b border-gray-200 flex-shrink-0 px-4">
            <Link href="/" aria-label="Home" className="rounded-lg hover:opacity-80 transition-opacity flex items-center gap-2 min-w-0">
              <Image src="/images/logo-tennis.png" alt="GST" width={48} height={48} className="h-10 w-10 object-contain flex-shrink-0" />
              {!sidebarCollapsed && <span className="text-2xl font-bold text-secondary truncate">Area GST</span>}
            </Link>
          </div>
          {/* Nav */}
          <nav className="flex-1 overflow-y-auto py-2">
            {[dashboardItem, ...(hasPrimarySection
              ? [...primaryNavItems!.filter(i => i.href !== dashboardItem.href), ...menuItemsWithPrimary]
              : otherItems
            )].map((item, index) => {
              const active = isActive(item.href);
              return (
                <React.Fragment key={item.href}>
                  <Link href={item.href} title={sidebarCollapsed ? item.label : undefined}
                    className={`flex items-center gap-3 mx-2 px-3 py-2 rounded-lg transition-colors ${sidebarCollapsed ? 'justify-center' : ''} ${active ? "bg-secondary text-white" : "text-gray-700 hover:bg-gray-50"}`}>
                    <span className={`flex-shrink-0 [&>svg]:!h-4 [&>svg]:!w-4 ${active ? "text-white" : "text-secondary/70"}`}>{item.icon}</span>
                    {!sidebarCollapsed && <span className="text-sm font-medium flex-1">{item.label}</span>}
                    {!sidebarCollapsed && item.badge && item.badge > 0 && (
                      <span className={`px-1.5 py-0.5 text-xs font-bold rounded ${active ? "bg-white text-secondary" : "bg-secondary text-white"}`}>{item.badge > 99 ? "99+" : item.badge}</span>
                    )}
                  </Link>
                  {index === 0 && <div className="mx-3 my-2 border-t border-gray-200" />}
                  {index > 0 && item.separatorAfter && <div className="mx-3 my-2 border-t border-gray-200" />}
                </React.Fragment>
              );
            })}
          </nav>
          {/* Footer */}
          <div className="border-t border-gray-200 p-3 flex-shrink-0">
            {/* Riga icone: notifiche + logout + collapse */}
            <div className={`flex items-center gap-1 ${sidebarCollapsed ? 'flex-col' : ''} mb-2`}>
              <NotificationsDropdown />
              <button
                onClick={handleLogout}
                aria-label="Esci"
                title="Esci"
                className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-gray-100 transition-colors text-secondary"
              >
                <LogOut className="h-4 w-4" />
              </button>
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                aria-label={sidebarCollapsed ? 'Espandi menu' : 'Riduci menu'}
                title={sidebarCollapsed ? 'Espandi menu' : 'Riduci menu'}
                className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-gray-100 transition-colors text-secondary"
              >
                {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              </button>
            </div>
            <div className="border-t border-gray-200 pt-2">
              {/* Profilo */}
              {sidebarCollapsed ? (
                <Link href={profileHref} title={userName || 'Profilo'} className="flex items-center justify-center w-9 h-9 mx-auto rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="w-7 h-7 rounded-md overflow-hidden bg-secondary text-white flex items-center justify-center text-xs font-semibold">
                    {userAvatar ? <img src={userAvatar} alt={userName || "User"} className="w-full h-full object-cover" /> : <span>{userName?.charAt(0)?.toUpperCase() || "U"}</span>}
                  </div>
                </Link>
              ) : (
                <Link href={profileHref} className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors w-full min-w-0">
                  <div className="w-7 h-7 rounded-md overflow-hidden bg-secondary text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
                    {userAvatar ? <img src={userAvatar} alt={userName || "User"} className="w-full h-full object-cover" /> : <span>{userName?.charAt(0)?.toUpperCase() || "U"}</span>}
                  </div>
                  {userName && <span className="text-sm font-medium text-gray-700 truncate">{userName}</span>}
                </Link>
              )}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 py-6 lg:py-8">
          {children}
        </main>

      </div>

      {/* Search Modal */}
      {showSearchModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-start justify-center pt-20 px-4"
          onClick={() => setShowSearchModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
                <input
                  type="text"
                  placeholder="Cerca in dashboard..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="w-full pl-12 pr-4 py-3.5 rounded-lg border border-gray-200 bg-white text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
                />
              </div>

              {/* Search Results */}
              {searchQuery && (
                <div className="mt-4 max-h-96 overflow-y-auto">
                  {searchResults.length > 0 ? (
                    <div className="space-y-1">
                      {searchResults.map((item, idx) => (
                        <Link
                          key={idx}
                          href={item.href}
                          onClick={() => {
                            setSearchQuery("");
                            setShowSearchModal(false);
                          }}
                          className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-secondary/5 transition-colors"
                        >
                          <div className="text-secondary/70">{item.icon}</div>
                          <span className="text-sm font-medium text-secondary">{item.label}</span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <p className="text-sm text-secondary/60">Nessun risultato trovato</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
