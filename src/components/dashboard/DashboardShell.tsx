"use client";

import { useState, useEffect, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  LogOut,
  ChevronDown,
  Search,
  PanelLeft,
  Menu,
  X,
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
  const [sidebarMode, setSidebarMode] = useState<'expanded' | 'collapsed' | 'hover'>('collapsed');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [sidebarControlOpen, setSidebarControlOpen] = useState(false);
  const showLabels = sidebarMode === 'expanded' || (sidebarMode === 'hover' && isHovered);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
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

  const renderNavItem = (item: NavItem, depth = 0) => {
    const active = isActive(item.href);
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.label);

    if (hasChildren) {
      return (
        <div key={item.label}>
          <button
            onClick={() => { if (!showLabels) setSidebarMode('expanded'); else toggleExpanded(item.label); }}
            title={!showLabels ? item.label : undefined}
            className={`w-full flex items-center rounded-md transition-colors ${
              showLabels ? "justify-between gap-3 px-3 py-2.5" : "justify-center py-2.5"
            } text-secondary/70 hover:bg-secondary/5`}
          >
            <div className={`flex items-center ${showLabels ? "gap-3" : ""}`}>
              <span className="text-secondary/60 [&>svg]:!h-5 [&>svg]:!w-5 flex-shrink-0">{item.icon}</span>
              {showLabels && <span className="text-base font-semibold">{item.label}</span>}
            </div>
            {showLabels && (
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
              />
            )}
          </button>
          {showLabels && isExpanded && (
            <div className="mt-1 space-y-1 ml-8">
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
        onClick={() => { if (sidebarMode === 'hover') setIsHovered(false); setMobileOpen(false); }}
        title={!showLabels ? item.label : undefined}
        className={`
          relative flex items-center rounded-md
          transition-colors duration-200
          ${showLabels ? "gap-3 px-3 py-2.5" : "justify-center py-2.5"}
          ${active ? "bg-secondary text-white" : "text-gray-600 hover:bg-gray-100"}
        `}
      >
        <span className={`${active ? "text-white" : "text-gray-600"} flex-shrink-0 [&>svg]:!h-5 [&>svg]:!w-5`}>
          {item.icon}
        </span>
        {showLabels && <span className="text-base font-semibold flex-1">{item.label}</span>}
        {showLabels && item.badge && item.badge > 0 && (
          <span className={`px-2 py-0.5 text-xs font-bold rounded-md min-w-[24px] text-center ${
            active ? "bg-white text-secondary" : "bg-secondary text-white"
          }`}>
            {item.badge > 99 ? "99+" : item.badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navbar - fisso su tutti gli schermi */}
      <header className="fixed top-0 left-0 right-0 z-[110] bg-white border-b border-gray-200">
        <div className="relative h-16 sm:h-14 flex items-center justify-between">
          {/* Sinistra: hamburger (mobile) + logo (desktop) */}
          <div className="flex items-center px-3 lg:px-0">
            {/* Hamburger - solo mobile, ora a sinistra */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden flex items-center justify-center w-11 h-11 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none"
              aria-label="Apri menu"
            >
              {mobileOpen ? <X className="h-7 w-7 text-gray-600" /> : <Menu className="h-7 w-7 text-gray-600" />}
            </button>
            {/* Logo - solo desktop, a sinistra */}
            <div className="hidden lg:flex items-center justify-center w-14 flex-shrink-0">
              <Link
                href="/"
                className="rounded-lg hover:opacity-80 active:opacity-60 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary min-w-[36px] min-h-[36px] flex items-center justify-center touch-manipulation"
                aria-label="Vai alla home"
              >
                <Image src="/images/logo-tennis.png" alt="GST" width={32} height={32} className="h-8 w-8 object-contain" />
              </Link>
            </div>
          </div>

          {/* Logo centrato - solo mobile */}
          <Link
            href="/"
            className="lg:hidden absolute left-1/2 -translate-x-1/2 rounded-lg hover:opacity-80 active:opacity-60 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary flex items-center justify-center touch-manipulation"
            aria-label="Vai alla home"
          >
            <Image src="/images/logo-tennis.png" alt="GST" width={32} height={32} className="h-8 w-8 object-contain" />
          </Link>

          {/* Destra: notifiche, avatar */}
          <div className="flex items-center pr-1">
            <NotificationsDropdown />
            <Link href={profileHref} className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="w-8 h-8 rounded-md overflow-hidden bg-secondary text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
                {userAvatar ? (
                  <img src={userAvatar} alt={userName || "User"} className="w-full h-full object-cover" />
                ) : (
                  <span>{userName?.charAt(0)?.toUpperCase() || "U"}</span>
                )}
              </div>
            </Link>
          </div>
        </div>
      </header>

      {/* Menu mobile drawer da sinistra - solo smartphone */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="lg:hidden fixed inset-0 bg-black/40 z-[99]"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          {/* Drawer */}
          <div className="lg:hidden fixed top-16 sm:top-14 left-0 bottom-0 w-72 bg-white shadow-xl overflow-y-auto animate-in slide-in-from-left duration-300 z-[100]">
            {/* Nav items */}
            <nav>
              {[dashboardItem, ...(hasPrimarySection
                ? [...primaryNavItems!.filter(i => i.href !== dashboardItem.href), ...menuItemsWithPrimary]
                : otherItems
              )].map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 transition-colors ${
                      active ? "bg-secondary text-white" : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span className={`flex-shrink-0 [&>svg]:!h-5 [&>svg]:!w-5 ${active ? "text-white" : "text-secondary/70"}`}>
                      {item.icon}
                    </span>
                    <span className="text-sm font-semibold flex-1">{item.label}</span>
                    {item.badge && item.badge > 0 && (
                      <span className={`px-2 py-0.5 text-xs font-bold rounded-md ${
                        active ? "bg-white text-secondary" : "bg-secondary text-white"
                      }`}>{item.badge > 99 ? "99+" : item.badge}</span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Footer */}
            <div className="p-2">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-md hover:bg-red-50 hover:text-red-600 transition-colors text-gray-700"
              >
                <LogOut className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm font-semibold">Esci</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Sidebar laterale - solo desktop */}
      <aside
        className={`
          hidden lg:flex fixed top-0 left-0 h-screen
          bg-white border-r border-gray-200
          flex-col z-30
          transition-all duration-300 ease-in-out
          ${showLabels ? "lg:translate-x-0 lg:w-56" : "lg:translate-x-0 lg:w-14"}
        `}
        onMouseEnter={() => sidebarMode === 'hover' && setIsHovered(true)}
        onMouseLeave={() => { if (sidebarMode === 'hover') { setIsHovered(false); setSidebarControlOpen(false); } }}
      >
        {/* Navigation */}
        <nav className={`flex-1 pt-14 sm:pt-16 py-4 overflow-y-auto space-y-0.5 ${showLabels ? "px-3" : "px-1"}`}>
          {renderNavItem(dashboardItem)}
          <div className={`my-2 ${showLabels ? "mx-1 border-t border-gray-200" : "mx-2 border-t border-gray-200"}`} />
          <div className="space-y-0.5">
            {hasPrimarySection ? (
              <>
                {primaryNavItems!.filter(item => item.href !== dashboardItem.href).map((item) => renderNavItem(item))}
                {menuItemsWithPrimary.map((item) => renderNavItem(item))}
              </>
            ) : (
              otherItems.map((item) => renderNavItem(item))
            )}
          </div>
        </nav>

        {/* Drawer Footer */}
        <div className={`border-t border-gray-100 space-y-1 flex-shrink-0 ${showLabels ? "p-3" : "p-1"}`}>
          <div className="relative">
            <button
              onClick={() => setSidebarControlOpen(!sidebarControlOpen)}
              title={!showLabels ? "Sidebar" : undefined}
              className={`w-full flex items-center rounded-md hover:bg-gray-100 transition-colors text-gray-500 ${
                showLabels ? "gap-3 px-3 py-2.5" : "justify-center py-2.5"
              }`}
            >
              <PanelLeft className="h-5 w-5 flex-shrink-0" />
              {showLabels && <span className="text-base font-semibold">Sidebar</span>}
            </button>
            {sidebarControlOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-52 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden z-50">
                <p className="px-4 py-3 text-xs font-semibold text-white uppercase tracking-wider bg-secondary">Sidebar control</p>
                <div className="py-1">
                {(['expanded', 'collapsed', 'hover'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => { setSidebarMode(mode); setSidebarControlOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <span className={`h-2 w-2 rounded-full flex-shrink-0 ${
                      sidebarMode === mode ? 'bg-secondary' : 'border border-gray-300'
                    }`} />
                    {mode === 'expanded' ? 'Expanded' : mode === 'collapsed' ? 'Collapsed' : 'Expand on hover'}
                  </button>
                ))}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            title={!showLabels ? "Esci" : undefined}
            className={`w-full flex items-center rounded-md hover:bg-red-50 hover:text-red-600 transition-colors text-gray-600 ${
              showLabels ? "gap-3 px-3 py-2.5" : "justify-center py-2.5"
            }`}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {showLabels && <span className="text-base font-semibold">Esci</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`min-h-screen pt-16 sm:pt-14 transition-all duration-300 ease-in-out ${sidebarMode === 'expanded' ? 'lg:pl-56' : 'lg:pl-14'}`}>
        <div className="p-6 lg:p-8">
          <div className="max-w-[1400px] mx-auto">
            {children}
          </div>
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
