"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { 
  Menu, 
  X, 
  Home, 
  Calendar, 
  Trophy, 
  User, 
  CreditCard,
  LogOut 
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import NotificationBell from "@/components/notifications/NotificationBell";

interface AtletaNavbarProps {
  userName?: string;
  userAvatar?: string;
  subscriptionType?: "basic" | "premium" | "vip" | null;
}

export default function AtletaNavbar({ 
  userName = "Atleta", 
  userAvatar,
  subscriptionType
}: AtletaNavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [notificationsCount, setNotificationsCount] = useState(0);
  const router = useRouter();

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

  const menuItems = [
    { href: "/dashboard/atleta", label: "Dashboard", icon: Home },
    { href: "/bookings", label: "Prenotazioni", icon: Calendar },
    { href: "/tornei", label: "Tornei", icon: Trophy },
    { href: "/profile", label: "Profilo", icon: User },
  ];

  const subscriptionBadges = {
    basic: { label: "Basic", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    premium: { label: "Premium", color: "bg-primary/20 text-primary-light border-primary/30" },
    vip: { label: "VIP", color: "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border-cyan-500/30" }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <nav className="border-b border-white/10 bg-secondary/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="container py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/dashboard/atleta" aria-label="Dashboard Atleta" className="flex items-center gap-3">
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
          <div className="hidden lg:flex items-center gap-6">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2 text-sm font-medium text-muted-2 transition hover:text-blue-400"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Right Section - Desktop */}
          <div className="hidden lg:flex items-center gap-4">
            {/* Subscription Badge */}
            {subscriptionType && (
              <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${subscriptionBadges[subscriptionType].color}`}>
                <CreditCard className="inline h-3 w-3 mr-1" />
                {subscriptionBadges[subscriptionType].label}
              </div>
            )}

            {/* Notifications */}
            {userId && <NotificationBell userId={userId} />}

            {/* User Avatar */}
            <Link 
              href="/profile" 
              className="flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 transition hover:border-blue-400 hover:bg-blue-500/20"
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
                <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold text-white">
                  {userName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-sm font-medium text-white">{userName}</span>
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
                <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-lg font-bold text-white">
                  {userName.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-white">{userName}</p>
                {subscriptionType && (
                  <p className={`text-xs font-medium ${subscriptionBadges[subscriptionType].color.split(' ')[1]}`}>
                    {subscriptionBadges[subscriptionType].label}
                  </p>
                )}
              </div>
              {notificationsCount > 0 && (
                <div className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">
                  {notificationsCount > 9 ? "9+" : notificationsCount}
                </div>
              )}
            </div>

            {/* Menu Items Mobile */}
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-muted-2 hover:bg-blue-500/10 hover:text-blue-400 transition"
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
