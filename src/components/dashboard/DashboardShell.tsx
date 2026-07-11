"use client";

import React, { useState, useEffect, useRef, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  LogOut,
} from "lucide-react";
import { MenuCloseIcon } from "@/components/ui/MenuCloseIcon";
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
  const [mobileNotificationsOpen, setMobileNotificationsOpen] = useState(false);
  const [notifCloseSignal, setNotifCloseSignal] = useState(0);
  const lockedScrollYRef = useRef(0);
  const sidebarCollapsed = false;

  // Force remove dark class on mount to ensure light mode
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    localStorage.removeItem('darkMode');
  }, []);

  useEffect(() => {
    const isMobileViewport = typeof window !== "undefined" && window.innerWidth < 1024;
    const shouldLockScroll = isMobileViewport && (mobileOpen || mobileNotificationsOpen);

    if (!shouldLockScroll) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyTouchAction = document.body.style.touchAction;
    const previousBodyPosition = document.body.style.position;
    const previousBodyTop = document.body.style.top;
    const previousBodyLeft = document.body.style.left;
    const previousBodyRight = document.body.style.right;
    const previousBodyWidth = document.body.style.width;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    lockedScrollYRef.current = window.scrollY;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    document.body.style.position = "fixed";
    document.body.style.top = `-${lockedScrollYRef.current}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.touchAction = previousBodyTouchAction;
      document.body.style.position = previousBodyPosition;
      document.body.style.top = previousBodyTop;
      document.body.style.left = previousBodyLeft;
      document.body.style.right = previousBodyRight;
      document.body.style.width = previousBodyWidth;
      window.scrollTo(0, lockedScrollYRef.current);
    };
  }, [mobileOpen, mobileNotificationsOpen]);

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

  const activeNavItem = navItems
    .filter((item) => isActive(item.href))
    .sort((a, b) => b.href.length - a.href.length)[0];

  const dashboardRootLabel = dashboardItem?.label || "Dashboard";
  const pathSegments = pathname.split("/").filter(Boolean);
  const currentSectionSegment = pathSegments[2];
  const sectionLabelFallbackMap: Record<string, string> = {
    profile: "Profilo Utente",
    bookings: "Prenotazioni",
    tornei: "Competizioni",
    corsi: "Corsi",
    videos: "Video Lab",
    arena: "Arena GST",
    mail: "Messaggi",
    maestro: "Maestro",
    news: "News",
    users: "Gestione Utenti",
    courts: "Campi",
    staff: "Staff",
    "invite-codes": "Codici Invito",
    "job-applications": "Lavora con Noi",
  };

  const isDashboardRootPath =
    !!dashboardItem &&
    (pathname === dashboardItem.href || pathname === `${dashboardItem.href}/`);

  const matchedNavLabel =
    activeNavItem && dashboardItem && activeNavItem.href !== dashboardItem.href
      ? activeNavItem.label
      : undefined;

  const fallbackSectionLabel =
    !isDashboardRootPath && currentSectionSegment
      ? sectionLabelFallbackMap[currentSectionSegment] ||
        currentSectionSegment
          .replace(/-/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase())
      : undefined;

  const segmentLabelMap: Record<string, string> = {
    ...sectionLabelFallbackMap,
    new: "Nuova",
    edit: "Modifica",
    modifica: "Modifica",
    archivio: "Archivio",
    statistiche: "Statistiche",
    history: "Storico",
  };

  const prettifySegmentLabel = (segment: string) =>
    segmentLabelMap[segment] ||
    segment
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

  const isLikelyDynamicId = (segment: string) => {
    if (!segment) return false;
    if (/^\d+$/.test(segment)) return true;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(segment)) return true;
    if (/^[0-9a-f-]{24,}$/i.test(segment)) return true;
    if (/^[A-Za-z0-9_-]{24,}$/.test(segment)) return true;
    if (/^[0-9a-f]{8,}$/i.test(segment)) return true;
    return false;
  };

  const detailLabelByParentSegment: Record<string, string> = {
    bookings: "Dettaglio Prenotazione",
    tornei: "Dettaglio Competizione",
    corsi: "Dettaglio Corso",
    users: "Dettaglio Utente",
    staff: "Dettaglio Staff",
    courts: "Dettaglio Campo",
    news: "Dettaglio News",
    videos: "Dettaglio Video",
    arena: "Dettaglio Sfida",
    "invite-codes": "Dettaglio Codice",
    "job-applications": "Dettaglio Candidatura",
  };

  const dashboardRootHref = dashboardItem?.href || "/dashboard";
  const dashboardRootSegments = dashboardRootHref.split("/").filter(Boolean);
  const routeSegmentsAfterRoot = pathSegments.slice(dashboardRootSegments.length);

  const desktopCrumbs: Array<{ label: string; href: string }> = [
    { label: dashboardRootLabel, href: dashboardRootHref },
  ];

  let currentHref = dashboardRootHref;
  routeSegmentsAfterRoot.forEach((segment, index) => {
    currentHref = `${currentHref}/${segment}`;
    const isFirstSection = index === 0;
    const firstSectionLabel = matchedNavLabel || fallbackSectionLabel;
    const previousSegment = index > 0 ? routeSegmentsAfterRoot[index - 1] : undefined;
    const isDynamicDetail = isLikelyDynamicId(segment);
    const detailLabel = previousSegment
      ? detailLabelByParentSegment[previousSegment] || "Dettaglio"
      : "Dettaglio";

    desktopCrumbs.push({
      label: isDynamicDetail
        ? detailLabel
        : isFirstSection && firstSectionLabel
          ? firstSectionLabel
          : prettifySegmentLabel(segment),
      href: currentHref,
    });
  });

  return (
    <div className="min-h-dvh bg-gray-50">

      {/* Top Navbar - solo mobile */}
      <header className="lg:hidden fixed top-4 left-6 right-6 z-[110] bg-secondary border border-black/10 rounded-lg shadow-lg [transform:translateZ(0)]">
        <div className="h-16 relative flex items-center px-4">
          <button
            onClick={() => { setMobileOpen(!mobileOpen); setNotifCloseSignal(s => s + 1); }}
            className="flex items-center justify-center w-10 h-10 rounded-lg transition-colors focus:outline-none text-white hover:bg-white/15"
            aria-label="Apri menu"
          >
            <MenuCloseIcon isOpen={mobileOpen} size={44} />
          </button>
          <Link href="/" aria-label="Home" className="absolute left-1/2 -translate-x-1/2" onClick={() => setNotifCloseSignal(s => s + 1)}>
            <Image src="/images/logo-tennis.png" alt="GST" width={40} height={40} className="h-10 w-10 object-contain" />
          </Link>
          <div className="ml-auto">
            <NotificationsDropdown
              iconSize="h-6 w-6"
              buttonSize="w-10 h-10"
              closeSignal={notifCloseSignal}
              onOpen={() => setMobileOpen(false)}
              onOpenChange={setMobileNotificationsOpen}
              showBorder={false}
              buttonClassName="!bg-transparent !text-white hover:!bg-white/15"
            />
          </div>
        </div>
      </header>

      <div
        className={`lg:hidden fixed inset-0 z-[90] bg-white transition-opacity duration-300 ${mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      {/* Mobile sidebar overlay */}
            <aside className={`lg:hidden fixed top-[6rem] left-6 right-6 z-[100] flex flex-col bg-white rounded-lg overflow-hidden border border-black/10 shadow-lg [transform:translateZ(0)] max-h-[calc(100dvh-7rem)] transition-all duration-300 ease-in-out ${mobileOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-3 pointer-events-none'}`}>
              <div className="pl-5 pr-4 py-3 bg-secondary flex items-center flex-shrink-0">
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
                    className={`group flex h-9 items-center gap-2.5 mx-2 my-1 px-3 rounded-md ${active ? "bg-secondary text-white" : "text-secondary hover:bg-secondary hover:text-white"}`}>
                    <span className={`flex-shrink-0 [&>svg]:!h-4 [&>svg]:!w-4 ${active ? "text-white" : "text-secondary/70 group-hover:text-white"}`}>{item.icon}</span>
                    <span className="text-sm leading-5 font-medium flex-1">{item.label}</span>
                    {item.badge && item.badge > 0 && (
                      <span className={`px-1.5 py-0.5 text-xs font-bold rounded ${active ? "bg-white text-secondary" : "bg-secondary text-white"}`}>{item.badge > 99 ? "99+" : item.badge}</span>
                    )}
                  </Link>
                  {index === 0 && <div className="my-2 border-t border-black/10" />}
                  {index > 0 && item.separatorAfter && <div className="my-2 border-t border-black/10" />}
                </React.Fragment>
              );
            })}
          </nav>
          <div className="p-3">
            <div className="flex items-center gap-1.5">
              <Link href={profileHref} onClick={() => setMobileOpen(false)} className="group flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-secondary hover:text-white flex-1 min-w-0">
                <div className="w-7 h-7 rounded-md overflow-hidden bg-secondary text-white flex items-center justify-center text-xs font-semibold flex-shrink-0 ring-1 ring-transparent group-hover:bg-white group-hover:text-secondary">
                  {userAvatar ? <img src={userAvatar} alt={userName || "User"} className="w-full h-full object-cover" /> : <span>{userName?.charAt(0)?.toUpperCase() || "U"}</span>}
                </div>
                {userName && <span className="text-sm font-semibold tracking-tight text-gray-700 truncate group-hover:text-white">{userName}</span>}
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-700 transition-colors hover:bg-secondary hover:text-white"
                aria-label="Esci"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </aside>

      {/* Layout desktop: container con sidebar + contenuto in riga */}
      <div className="flex min-h-dvh pt-[5rem] lg:pt-0">

        {/* Sidebar desktop - sticky dentro il container */}
        <aside className={`hidden lg:flex flex-col flex-shrink-0 sticky top-0 h-screen bg-white border border-black/10 overflow-visible transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-56'}`}>
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 h-20 border-b border-black/10 flex-shrink-0 px-4">
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
                    className={`group flex h-9 items-center gap-2.5 mx-2 my-1 px-3 rounded-md ${sidebarCollapsed ? 'justify-center' : ''} ${active ? "bg-secondary text-white" : "text-gray-700 hover:bg-secondary hover:text-white"}`}>
                    <span className={`flex-shrink-0 ${sidebarCollapsed ? '[&>svg]:!h-5 [&>svg]:!w-5' : '[&>svg]:!h-4 [&>svg]:!w-4'} ${active ? "text-white" : "text-secondary/70 group-hover:text-white"}`}>{item.icon}</span>
                    {!sidebarCollapsed && <span className="text-sm leading-5 font-medium flex-1">{item.label}</span>}
                    {!sidebarCollapsed && item.badge && item.badge > 0 && (
                      <span className={`px-1.5 py-0.5 text-xs font-bold rounded ${active ? "bg-white text-secondary" : "bg-secondary text-white"}`}>{item.badge > 99 ? "99+" : item.badge}</span>
                    )}
                  </Link>
                  {index === 0 && <div className="my-2 border-t border-black/10" />}
                  {index > 0 && item.separatorAfter && <div className="my-2 border-t border-black/10" />}
                </React.Fragment>
              );
            })}
          </nav>
          {/* Footer */}
          <div className="pt-2 pb-3 flex-shrink-0">
            <div>
              {/* Profilo */}
              {sidebarCollapsed ? (
                <Link href={profileHref} title={userName || 'Profilo'} className="group flex items-center justify-center w-9 h-9 mx-auto rounded-lg hover:bg-secondary">
                  <div className="w-7 h-7 rounded-md overflow-hidden bg-secondary text-white flex items-center justify-center text-xs font-semibold group-hover:bg-white group-hover:text-secondary">
                    {userAvatar ? <img src={userAvatar} alt={userName || "User"} className="w-full h-full object-cover" /> : <span>{userName?.charAt(0)?.toUpperCase() || "U"}</span>}
                  </div>
                </Link>
              ) : (
                <div className="relative flex items-center gap-2 mx-2">
                  <Link
                    href={profileHref}
                    className="group flex items-center gap-2.5 px-3 py-2 flex-1 min-w-0 text-left"
                    aria-label="Vai al profilo"
                  >
                    <div className="w-7 h-7 rounded-md overflow-hidden bg-secondary text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
                      {userAvatar ? <img src={userAvatar} alt={userName || "User"} className="w-full h-full object-cover" /> : <span>{userName?.charAt(0)?.toUpperCase() || "U"}</span>}
                    </div>
                    {userName && <span className="text-sm font-semibold tracking-tight text-gray-700 truncate transition-colors group-hover:text-secondary">{userName}</span>}
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center justify-center w-7 h-7 rounded-md transition-colors border bg-white text-secondary border-black/10 hover:bg-secondary hover:text-white hover:border-secondary"
                    aria-label="Esci"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                  <NotificationsDropdown buttonSize="w-7 h-7" buttonRounded="rounded-md" />
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          <div className="hidden lg:flex sticky top-0 z-30 h-20 border-b border-black/10 bg-white items-center justify-center">
            <h1 className="text-2xl font-bold text-secondary leading-none flex items-center gap-2">
              {desktopCrumbs.map((crumb, index) => (
                <React.Fragment key={crumb.href}>
                  {index > 0 && <span className="text-secondary/60">/</span>}
                  <Link href={crumb.href} className="hover:text-secondary/80 transition-colors">
                    {crumb.label}
                  </Link>
                </React.Fragment>
              ))}
            </h1>
          </div>
          <div className="pt-2 pb-6 lg:pt-3 lg:pb-8">
            <div className="dashboard-content max-w-[1400px] mx-auto px-6 lg:px-8 [&>h1:first-child]:lg:hidden [&>*>h1:first-child]:lg:hidden [&_p.breadcrumb]:hidden [&_p.breadcrumb+h1]:hidden">
              {children}
            </div>
          </div>
        </main>

      </div>

    </div>
  );
}
