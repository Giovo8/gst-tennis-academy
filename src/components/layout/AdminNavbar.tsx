"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { 
  Menu, 
  X, 
  Home, 
  Users, 
  Calendar, 
  FileText, 
  Trophy, 
  MessageSquare, 
  Mail,
  ChevronDown,
  LogOut,
  Shield,
  Image as ImageIcon,
  Newspaper,
  BookOpen,
  CreditCard,
  UserCog
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import NotificationBell from "@/components/notifications/NotificationBell";

interface AdminNavbarProps {
  userName?: string;
  userAvatar?: string;
}

export default function AdminNavbar({ 
  userName = "Admin", 
  userAvatar
}: AdminNavbarProps) {
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
      href: "/dashboard/admin",
      icon: Home,
    },
    {
      id: "users",
      label: "Utenti",
      icon: Users,
      items: [
        { href: "/dashboard/admin/users", label: "Gestione Utenti", icon: Users },
        { href: "/dashboard/admin/users?role=atleta", label: "Atleti", icon: UserCog },
        { href: "/dashboard/admin/users?role=maestro", label: "Maestri", icon: UserCog },
      ]
    },
    {
      id: "content",
      label: "Contenuti",
      icon: FileText,
      items: [
        { href: "/dashboard/admin/news", label: "News", icon: Newspaper },
        { href: "/dashboard/admin/courses", label: "Corsi", icon: BookOpen },
      ]
    },
    {
      id: "bookings",
      label: "Prenotazioni",
      href: "/dashboard/admin/bookings",
      icon: Calendar,
    },
    {
      id: "tournaments",
      label: "Tornei",
      href: "/dashboard/admin/tournaments",
      icon: Trophy,
    },
    {
      id: "announcements",
      label: "Bacheca",
      href: "/dashboard/admin/announcements",
      icon: MessageSquare,
    },
    {
      id: "email",
      label: "Email",
      href: "/dashboard/admin/email",
      icon: Mail,
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
          <Link href="/dashboard/admin" aria-label="Dashboard Admin" className="flex items-center gap-3">
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
            {/* Admin Badge */}
            <div className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-cyan-300 border border-cyan-500/30">
              <Shield className="inline h-3 w-3 mr-1" />
              Admin
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
            className="lg:hidden rounded-lg border border-blue-500/30 p-2 text-white transition hover:bg-blue-500/10 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Menu"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="lg:hidden border-t border-blue-500/10 pt-4 mt-4 space-y-2 pb-4 pb-safe-bottom">
            {/* User Info Mobile */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-500/5 border border-blue-500/20 mb-4">
              {userAvatar ? (
                <Image 
                  src={userAvatar} 
                  alt={userName} 
                  width={40} 
                  height={40}
                  className="h-10 w-10 rounded-full"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-cyan-500 flex items-center justify-center text-lg font-bold text-tournament-bg">
                  {userName.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-white">{userName}</p>
                <p className="text-xs text-blue-300 font-medium flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Admin
                </p>
              </div>
              {notificationsCount > 0 && (
                <div className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500 text-xs font-bold text-tournament-bg">
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
                    <div className="px-4 py-2 text-xs font-semibold text-blue-300 uppercase tracking-wider">
                      {section.label}
                    </div>
                    {section.items.map((item) => {
                      const ItemIcon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsOpen(false)}
                          className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-muted-2 hover:bg-blue-500/10 hover:text-cyan-300 transition pl-8"
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
                  className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-muted-2 hover:bg-blue-500/10 hover:text-cyan-300 transition"
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
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-cyan-500/30 px-4 py-3 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-500/10 mt-4"
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
