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
  Search,
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
  const [drawerOpen, setDrawerOpen] = useState(false);
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
            onClick={() => toggleExpanded(item.label)}
            className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-md text-secondary/70 hover:bg-secondary/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-secondary/60 [&>svg]:!h-5 [&>svg]:!w-5">{item.icon}</span>
              <span className="text-base font-semibold">{item.label}</span>
            </div>
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
            />
          </button>
          {isExpanded && (
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
        onClick={() => setDrawerOpen(false)}
        className={`
          relative flex items-center gap-3 px-3 py-2.5 rounded-md
          transition-colors duration-200
          ${active ? "bg-secondary text-white" : "text-gray-600 hover:bg-gray-100"}
        `}
      >
        <span className={`${active ? "text-white" : "text-gray-600"} flex-shrink-0 [&>svg]:!h-5 [&>svg]:!w-5`}>
          {item.icon}
        </span>
        <span className="text-base font-semibold flex-1">{item.label}</span>
        {item.badge && item.badge > 0 && (
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
      <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[1400px] mx-auto relative h-16 px-6 lg:px-8 flex items-center justify-between">
          {/* Sinistra: hamburger */}
          <div className="flex items-center w-10">
            <button
              onClick={() => setDrawerOpen(!drawerOpen)}
              className="bg-secondary rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/50 transition-opacity hover:opacity-90 active:opacity-80 min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
              aria-label={drawerOpen ? "Chiudi menu" : "Apri menu"}
            >
              {drawerOpen ? <X className="h-5 w-5 text-white" /> : <Menu className="h-5 w-5 text-white" />}
            </button>
          </div>

          {/* Centro: logo */}
          <Link href="/" className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Image
              src="/images/logo-tennis.png"
              alt="GST Tennis Academy"
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
            />
            <span className="font-extrabold text-secondary text-2xl tracking-tight" style={{ fontFamily: 'var(--font-urbanist)' }}>
              Area GST
            </span>
          </Link>

          {/* Destra: notifiche, avatar */}
          <div className="flex items-center gap-1">
            <NotificationsDropdown />
            <Link href={profileHref} className="ml-1">
              <div className="w-11 h-11 rounded-lg overflow-hidden bg-secondary text-white flex items-center justify-center text-sm font-semibold hover:ring-2 hover:ring-secondary/30 transition-all">
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

      {/* Dropdown overlay - covers area below navbar */}
      {drawerOpen && (
        <div
          className="fixed top-16 left-0 right-0 bottom-0 z-[35] bg-black/30 backdrop-blur-sm"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Dropdown Navigation Panel */}
      <div
        className="fixed top-16 left-0 right-0 z-[45] transition-all duration-200 ease-out"
        style={{
          opacity: drawerOpen ? 1 : 0,
          transform: drawerOpen ? 'translateY(0)' : 'translateY(-6px)',
          pointerEvents: drawerOpen ? 'auto' : 'none',
        }}
      >
        <div className="max-w-[1400px] mx-auto">
          <div className="w-64 bg-white border border-t-0 border-gray-200 shadow-xl rounded-b-xl ml-6 lg:ml-8">
            <div className="px-3 py-3">
            {/* Nav items grid */}
            <nav className="flex flex-col gap-0.5">
              {(() => {
                const allItems = hasPrimarySection
                  ? [dashboardItem, ...primaryNavItems!.filter(i => i.href !== dashboardItem.href), ...menuItemsWithPrimary]
                  : [dashboardItem, ...otherItems];
                return allItems.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setDrawerOpen(false)}
                      className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                        active
                          ? 'bg-secondary text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <span className={`flex-shrink-0 [&>svg]:h-5 [&>svg]:w-5 ${active ? 'text-white' : 'text-gray-500'}`}>
                        {item.icon}
                      </span>
                      <span className="text-sm font-semibold truncate">{item.label}</span>
                      {item.badge && item.badge > 0 && (
                        <span className={`ml-auto px-1.5 py-0.5 text-xs font-bold rounded-md ${active ? 'bg-white text-secondary' : 'bg-secondary text-white'}`}>
                          {item.badge > 99 ? '99+' : item.badge}
                        </span>
                      )}
                    </Link>
                  );
                });
              })()}
            </nav>

            {/* Footer row */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors text-gray-600"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-sm font-semibold">Esci</span>
              </button>
            </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="pt-16 min-h-screen">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8 py-6 lg:py-8">
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
