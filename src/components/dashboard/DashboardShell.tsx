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
  Bell,
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
              : "text-gray-600 hover:bg-gray-100"
          }
        `}
      >
        <span className={`${active ? "text-white" : "text-gray-600"} flex-shrink-0`}>
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
          bg-white border-r border-gray-200
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
              <span className="font-bold text-secondary text-3xl tracking-tight" style={{ fontFamily: 'var(--font-urbanist)' }}>Area GST</span>
            )}
          </Link>

          {/* Navigation */}
          <nav className={`flex-1 ${sidebarCollapsed ? "px-2 py-4" : "px-4 py-6"} overflow-y-auto`}>
            {/* Dashboard sempre per primo (senza intestazione) */}
            <div className="space-y-1">
              {renderNavItem(dashboardItem)}
            </div>

            {/* Altre voci del menu */}
            <div className="space-y-1 mt-1">
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
          </nav>

          {/* Footer: azioni e profilo */}
          <div className={`${sidebarCollapsed ? "p-3" : "p-4"} space-y-3`}>
            {/* Azioni: Cerca, Notifiche, Logout e Collapse */}
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2 pl-2">
                {/* Search */}
                <button
                  onClick={() => setShowSearchModal(true)}
                  title="Cerca"
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Search className="h-5 w-5 text-gray-600" />
                </button>

                {/* Notifiche */}
                <NotificationsDropdown />

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  title="Esci"
                  className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <LogOut className="h-5 w-5 text-gray-600 hover:text-red-600" />
                </button>

                {/* Collapse/Expand */}
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Riduci menu"
                >
                  <ChevronLeft className="h-5 w-5 text-gray-600" />
                </button>
              </div>
            )}

            {/* Azioni in modalità collapsed */}
            {sidebarCollapsed && (
              <div className="flex flex-col gap-2">
                {/* Search */}
                <button
                  onClick={() => setShowSearchModal(true)}
                  title="Cerca"
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Search className="h-5 w-5 text-gray-600" />
                </button>

                {/* Notifiche */}
                <NotificationsDropdown />

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  title="Esci"
                  className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <LogOut className="h-5 w-5 text-gray-600 hover:text-red-600" />
                </button>

                {/* Collapse/Expand */}
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Espandi menu"
                >
                  <ChevronRight className="h-5 w-5 text-gray-600" />
                </button>
              </div>
            )}

            {/* Profilo Utente - cliccabile */}
            <Link
              href={`/dashboard/${role}/profile`}
              title={sidebarCollapsed ? "Profilo" : undefined}
              className="block"
            >
              {!sidebarCollapsed ? (
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/5 transition-colors cursor-pointer">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-secondary text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
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
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-sm font-semibold text-secondary leading-tight truncate">{userName || "User"}</span>
                    <span className="text-xs text-secondary/60 leading-tight truncate">{userEmail}</span>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-secondary text-white flex items-center justify-center text-sm font-semibold hover:ring-2 hover:ring-secondary/20 transition-all">
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
                </div>
              )}
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`pt-16 lg:pt-0 min-h-screen transition-all duration-300 ${sidebarCollapsed ? "lg:ml-[70px]" : "lg:ml-[260px]"}`}>
        {/* Page content */}
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>

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
