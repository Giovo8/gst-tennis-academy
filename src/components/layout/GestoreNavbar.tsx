"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { 
  Menu, 
  X, 
  Home, 
  Users, 
  Calendar, 
  Trophy, 
  MessageSquare, 
  ChevronDown,
  LogOut,
  Briefcase,
  UserCog,
  BarChart3,
  Clock
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import NotificationBell from "@/components/notifications/NotificationBell";

interface GestoreNavbarProps {
  userName?: string;
  userAvatar?: string;
}

export default function GestoreNavbar({ 
  userName = "Gestore", 
  userAvatar
}: GestoreNavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [notificationsCount, setNotificationsCount] = useState(0);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function getUserId() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        // Fetch notifications count
        const { count } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('read', false);
        setNotificationsCount(count || 0);
      }
    }
    getUserId();
  }, []);

  const menuSections = [
    {
      id: "main",
      label: "Dashboard",
      href: "/dashboard/gestore",
      icon: Home,
    },
    {
      id: "users",
      label: "Utenti",
      icon: Users,
      items: [
        { href: "/dashboard/gestore/users", label: "Gestione Utenti", icon: Users },
        { href: "/dashboard/gestore/users?role=atleta", label: "Atleti", icon: UserCog },
        { href: "/dashboard/gestore/users?role=maestro", label: "Maestri", icon: UserCog },
      ]
    },
    {
      id: "bookings",
      label: "Prenotazioni",
      icon: Calendar,
      items: [
        { href: "/dashboard/gestore/bookings", label: "Tutte le Prenotazioni", icon: Calendar },
        { href: "/dashboard/gestore/bookings?view=today", label: "Oggi", icon: Clock },
        { href: "/dashboard/gestore/courts", label: "Gestione Campi", icon: BarChart3 },
      ]
    },
    {
      id: "tournaments",
      label: "Tornei",
      href: "/dashboard/gestore/tornei",
      icon: Trophy,
    },
    {
      id: "announcements",
      label: "Bacheca",
      href: "/dashboard/gestore/announcements",
      icon: MessageSquare,
    },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const toggleDropdown = (id: string) => {
    setActiveDropdown(activeDropdown === id ? null : id);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="border-b border-white/10 bg-secondary/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="container py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/dashboard/gestore" aria-label="Dashboard Gestore" className="flex items-center gap-3">
            <Image 
              src="/images/logo-tennis.png" 
              alt="GST Tennis Academy" 
              width={36} 
              height={36}
              className="h-9 w-9"
            />
            <span className="text-lg font-bold text-white">Area GST</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center gap-4" ref={dropdownRef}>
            {menuSections.map((section) => {
              const Icon = section.icon;
              
              if (section.items) {
                return (
                  <div key={section.id} className="relative">
                    <button
                      onClick={() => toggleDropdown(section.id)}
                      className="flex items-center gap-1.5 text-sm font-medium text-muted-2 transition hover:text-blue-300"
                    >
                      <Icon className="h-4 w-4" />
                      {section.label}
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${activeDropdown === section.id ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {activeDropdown === section.id && (
                      <div className="absolute top-full left-0 mt-2 w-56 rounded-lg border border-white/15 bg-secondary-light shadow-xl py-2">
                        {section.items.map((item) => {
                          const ItemIcon = item.icon;
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setActiveDropdown(null)}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted-2 transition hover:bg-blue-500/10 hover:text-cyan-300"
                            >
                              <ItemIcon className="h-4 w-4" />
                              {item.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }
              
              return (
                <Link
                  key={section.id}
                  href={section.href!}
                  className="flex items-center gap-2 text-sm font-medium text-muted-2 transition hover:text-blue-300"
                >
                  <Icon className="h-4 w-4" />
                  {section.label}
                </Link>
              );
            })}
          </div>

          {/* Right Section - Desktop */}
          <div className="hidden lg:flex items-center gap-4">
            {/* Gestore Badge */}
            <div className="px-3 py-1 rounded-full text-xs font-semibold bg-primary/20 text-primary-light border border-primary/30">
              <Briefcase className="inline h-3 w-3 mr-1" />
              Gestore
            </div>

            {/* Notifications */}
            {userId && <NotificationBell userId={userId} />}

            {/* User Avatar */}
            <Link 
              href="/profile" 
              className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 transition hover:border-primary hover:bg-primary/20"
            >
              {userAvatar ? (
                <Image 
                  src={userAvatar} 
                  alt={userName} 
                  width={24} 
                  height={24}
                  className="h-6 w-6 rounded-full"
                />
              ) : (
                <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-white">
                  {userName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-sm font-medium text-white">{userName}</span>
            </Link>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="rounded-lg border border-white/15 p-2 text-white transition hover:bg-primary/10 hover:border-primary/30"
              aria-label="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden rounded-lg border border-primary/30 p-2 text-white transition hover:bg-primary/10 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Menu"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="lg:hidden border-t border-emerald-500/10 pt-4 mt-4 space-y-2 pb-4 pb-safe-bottom">
            {/* User Info Mobile */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-primary/5 border border-primary/20 mb-4">
              {userAvatar ? (
                <Image 
                  src={userAvatar} 
                  alt={userName} 
                  width={40} 
                  height={40}
                  className="h-10 w-10 rounded-full"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-lg font-bold text-white">
                  {userName.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-white">{userName}</p>
                <p className="text-xs text-emerald-300 font-medium flex items-center gap-1">
                  <Briefcase className="h-3 w-3" />
                  Gestore
                </p>
              </div>
              {notificationsCount > 0 && (
                <div className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                  {notificationsCount > 9 ? "9+" : notificationsCount}
                </div>
              )}
            </div>

            {/* Menu Items Mobile */}
            {menuSections.map((section) => {
              const Icon = section.icon;
              
              if (section.items) {
                return (
                  <div key={section.id} className="space-y-2">
                    <div className="px-4 py-2 text-xs font-semibold text-emerald-300 uppercase tracking-wider">
                      {section.label}
                    </div>
                    {section.items.map((item) => {
                      const ItemIcon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsOpen(false)}
                          className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-muted-2 hover:bg-primary/10 hover:text-primary-light transition pl-8"
                        >
                          <ItemIcon className="h-4 w-4" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                );
              }
              
              return (
                <Link
                  key={section.id}
                  href={section.href!}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-muted-2 hover:bg-primary/10 hover:text-primary-light transition"
                >
                  <Icon className="h-5 w-5" />
                  {section.label}
                </Link>
              );
            })}

            {/* Logout Mobile */}
            <button
              onClick={() => {
                setIsOpen(false);
                handleLogout();
              }}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-primary/30 px-4 py-3 text-sm font-semibold text-primary-light transition hover:bg-primary/10 mt-4"
            >
              <LogOut className="h-5 w-5" />
              Esci
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
