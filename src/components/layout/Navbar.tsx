"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Home, Calendar, User, LogOut, Menu, X, Shield, Users } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { type UserRole } from "@/lib/roles";

export default function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<{ role: UserRole; full_name: string } | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUser(user);
      const { data: profileData } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", user.id)
        .single();
      if (profileData) setProfile(profileData);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const dashboardLink = profile?.role 
    ? `/dashboard/${profile.role === "admin" || profile.role === "gestore" ? "admin" : profile.role}`
    : "/";

  const roleColors: Record<UserRole, string> = {
    atleta: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    maestro: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    gestore: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    admin: "bg-red-500/20 text-red-300 border-red-500/30",
  };

  if (!user) return null;

  return (
    <nav className="border-b border-white/10 bg-[#021627]/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="container py-sm">
        <div className="flex items-center justify-between gap-4 py-sm">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <img src="/images/logo-tennis.png" alt="GST Academy Logo" className="h-8 w-8" />
            <span className="text-lg font-bold text-white">GST Academy</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/"
              className={`flex items-center gap-2 text-sm font-medium transition ${
                pathname === "/" ? "text-accent" : "text-muted hover:text-white"
              }`}
            >
              <Home className="h-4 w-4" />
              Home
            </Link>
            <Link
              href="/bookings"
              className={`flex items-center gap-2 text-sm font-medium transition ${
                pathname === "/bookings" ? "text-accent" : "text-muted hover:text-white"
              }`}
            >
              <Calendar className="h-4 w-4" />
              Prenotazioni
            </Link>
            <Link
              href={dashboardLink}
              className={`flex items-center gap-2 text-sm font-medium transition ${
                pathname.startsWith("/dashboard") ? "text-accent" : "text-muted hover:text-white"
              }`}
            >
              <User className="h-4 w-4" />
              Dashboard
            </Link>
            {(profile?.role === "admin" || profile?.role === "gestore") && (
              <Link
                href="/dashboard/admin/users"
                className={`flex items-center gap-2 text-sm font-medium transition ${
                  pathname.startsWith("/dashboard/admin/users") ? "text-accent" : "text-muted hover:text-white"
                }`}
              >
                <Users className="h-4 w-4" />
                Utenti
              </Link>
            )}
          </div>

          {/* User Info & Logout */}
          <div className="hidden md:flex items-center gap-3">
            {profile && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted">{profile.full_name || user.email}</span>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  roleColors[profile.role] || "bg-gray-500/20 text-gray-300"
                }`}>
                  {profile.role.toUpperCase()}
                </span>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-full bg-red-600/20 px py-sm text-sm font-semibold text-red-300 transition hover:bg-red-600/30"
            >
              <LogOut className="h-4 w-4" />
              Esci
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden rounded-lg border border-white/15 p-2 text-white transition hover:bg-white/5"
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden border-t border-white/10 py-4 space-y-2">
            <Link
              href="/"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-muted hover:bg-white/5 hover:text-white"
            >
              <Home className="h-4 w-4" />
              Home
            </Link>
            <Link
              href="/bookings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-muted hover:bg-white/5 hover:text-white"
            >
              <Calendar className="h-4 w-4" />
              Prenotazioni
            </Link>
            <Link
              href={dashboardLink}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-muted hover:bg-white/5 hover:text-white"
            >
              <User className="h-4 w-4" />
              Dashboard
            </Link>
            {(profile?.role === "admin" || profile?.role === "gestore") && (
              <Link
                href="/dashboard/admin/users"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-muted hover:bg-white/5 hover:text-white"
              >
                <Users className="h-4 w-4" />
                Utenti
              </Link>
            )}
            <div className="border-t border-white/10 pt-2 mt-2">
              {profile && (
                <div className="px-4 py-2 text-sm text-muted">
                  <p>{profile.full_name || user.email}</p>
                  <span className={`inline-block mt-1 rounded-full border px-3 py-1 text-xs font-semibold ${
                    roleColors[profile.role] || "bg-gray-500/20 text-gray-300"
                  }`}>
                    {profile.role.toUpperCase()}
                  </span>
                </div>
              )}
              <button
                onClick={() => {
                  setIsOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-600/20"
              >
                <LogOut className="h-4 w-4" />
                Esci
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
