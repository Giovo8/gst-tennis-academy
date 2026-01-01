"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { 
  Menu, 
  X, 
  Home, 
  Calendar, 
  Users, 
  Trophy, 
  ClipboardList,
  LogOut,
  Zap
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import NotificationBell from "@/components/notifications/NotificationBell";

interface MaestroNavbarProps {
  userName?: string;
  userAvatar?: string;
  pendingLessonsCount?: number;
}

export default function MaestroNavbar({ 
  userName = "Coach", 
  userAvatar,
  pendingLessonsCount = 0
}: MaestroNavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function getUserId() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    }
    getUserId();
  }, []);

  const menuItems = [
    { href: "/dashboard/maestro", label: "Dashboard", icon: Home },
    { href: "/dashboard/maestro/lezioni", label: "Lezioni", icon: ClipboardList },
    { href: "/dashboard/maestro/calendario", label: "Calendario", icon: Calendar },
    { href: "/dashboard/maestro/atleti", label: "Atleti", icon: Users },
    { href: "/tornei", label: "Tornei", icon: Trophy },
  ];

  const quickActions = [
    { label: "Nuova Lezione", icon: Zap, action: () => router.push("/dashboard/maestro/lezioni?new=true") },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <nav className="border-b border-white/10 bg-[#021627]/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="container py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/dashboard/maestro" aria-label="Dashboard Coach" className="flex items-center gap-3">
            <Image 
              src="/images/logo-tennis.png" 
              alt="GST Tennis Academy" 
              width={36} 
              height={36}
              className="h-9 w-9"
            />
            <span className="text-lg font-bold text-white">GST Academy</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center gap-6">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2 text-sm font-medium text-muted-2 transition hover:text-cyan-300"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Right Section - Desktop */}
          <div className="hidden lg:flex items-center gap-4">
            {/* Quick Actions */}
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  onClick={action.action}
                  className="flex items-center gap-2 rounded-lg bg-cyan-500/20 border border-cyan-500/30 px-3 py-1.5 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-500/30 hover:border-cyan-400"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {action.label}
                </button>
              );
            })}

            {/* Pending Lessons Badge */}
            {pendingLessonsCount > 0 && (
              <Link
                href="/dashboard/maestro/lezioni?filter=pending"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-500/30"
              >
                <ClipboardList className="h-3.5 w-3.5" />
                {pendingLessonsCount} {pendingLessonsCount === 1 ? "Richiesta" : "Richieste"}
              </Link>
            )}

            {/* Notifications */}
            {userId && <NotificationBell userId={userId} />}

            {/* User Avatar */}
            <Link 
              href="/profile" 
              className="flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 transition hover:border-cyan-400 hover:bg-cyan-500/20"
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
                <div className="h-6 w-6 rounded-full bg-cyan-500 flex items-center justify-center text-xs font-bold text-white">
                  {userName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-sm font-medium text-white">{userName}</span>
              <span className="text-xs text-cyan-300 font-semibold">Coach</span>
            </Link>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="rounded-lg border-2 border-red-400/40 p-2 text-red-200 bg-gradient-to-br from-red-500/20 to-rose-500/20 transition-all duration-300 hover:from-red-500/30 hover:to-rose-500/30 hover:border-red-400/60 hover:shadow-lg hover:shadow-red-500/30 hover:scale-105 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden rounded-lg border border-cyan-500/30 p-2 text-white transition hover:bg-cyan-500/10 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Menu"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="lg:hidden border-t border-cyan-500/10 pt-4 mt-4 space-y-2 pb-4 pb-safe-bottom">
            {/* User Info Mobile */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-cyan-500/5 border border-cyan-500/20 mb-4">
              {userAvatar ? (
                <Image 
                  src={userAvatar} 
                  alt={userName} 
                  width={40} 
                  height={40}
                  className="h-10 w-10 rounded-full"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-cyan-500 flex items-center justify-center text-lg font-bold text-white">
                  {userName.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-white">{userName}</p>
                <p className="text-xs text-cyan-300 font-medium">Coach</p>
              </div>
              <div className="ml-auto flex flex-col gap-2">
                {notificationsCount > 0 && (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500 text-xs font-bold text-white">
                    {notificationsCount > 9 ? "9+" : notificationsCount}
                  </div>
                )}
                {pendingLessonsCount > 0 && (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">
                    {pendingLessonsCount}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions Mobile */}
            <div className="space-y-2 mb-4">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.label}
                    onClick={() => {
                      setIsOpen(false);
                      action.action();
                    }}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-cyan-500/20 border border-cyan-500/30 px-4 py-3 text-sm font-semibold text-purple-300 transition hover:bg-cyan-500/30"
                  >
                    <Icon className="h-5 w-5" />
                    {action.label}
                  </button>
                );
              })}
            </div>

            {/* Menu Items Mobile */}
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-muted-2 hover:bg-cyan-500/10 hover:text-cyan-300 transition"
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}

            {/* Logout Mobile */}
            <button
              onClick={() => {
                setIsOpen(false);
                handleLogout();
              }}
              className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-red-400/40 px-4 py-3 text-sm font-semibold text-red-200 bg-gradient-to-r from-red-500/20 to-rose-500/20 transition-all duration-300 hover:from-red-500/30 hover:to-rose-500/30 hover:border-red-400/60 hover:shadow-lg hover:shadow-red-500/30 mt-4"
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
