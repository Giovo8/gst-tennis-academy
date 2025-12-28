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
    maestro: "bg-cyan-500/20 text-purple-300 border-cyan-500/30",
    gestore: "bg-orange-500/20 text-orange-300 border-blue-500/30",
    admin: "bg-cyan-500/20 text-red-300 border-cyan-500/30",
  };

  if (!user) return null;

  return (
    <nav className="border-b border-blue-400/20 bg-[#021627]/80 backdrop-blur-xl sticky top-0 z-50 shadow-lg shadow-black/20">
      <div className="container py-sm">
        <div className="flex items-center justify-between gap-4 py-sm">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative">
              <img src="/images/logo-tennis.png" alt="GST Academy Logo" className="h-8 w-8 group-hover:scale-110 transition-transform duration-300" />
              <div className="absolute inset-0 bg-blue-400/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-transparent">GST Academy</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-2">
            <Link
              href="/"
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                pathname === "/" 
                  ? "bg-blue-500/20 text-blue-300 shadow-md shadow-blue-500/20" 
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Home className="h-4 w-4" />
              Home
            </Link>
            <Link
              href="/bookings"
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                pathname === "/bookings" 
                  ? "bg-blue-500/20 text-blue-300 shadow-md shadow-blue-500/20" 
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Calendar className="h-4 w-4" />
              Prenotazioni
            </Link>
            <Link
              href={dashboardLink}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                pathname.startsWith("/dashboard") 
                  ? "bg-blue-500/20 text-blue-300 shadow-md shadow-blue-500/20" 
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <User className="h-4 w-4" />
              Dashboard
            </Link>
            {(profile?.role === "admin" || profile?.role === "gestore") && (
              <Link
                href="/dashboard/admin/users"
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                  pathname.startsWith("/dashboard/admin/users") 
                    ? "bg-blue-500/20 text-blue-300 shadow-md shadow-blue-500/20" 
                    : "text-gray-400 hover:text-white hover:bg-white/5"
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
              <div className="flex items-center gap-2 bg-white/5 rounded-xl px-4 py-2 backdrop-blur-xl border border-white/10">
                <span className="text-sm text-gray-300">{profile.full_name || user.email}</span>
                <span className={`rounded-lg border px-3 py-1 text-xs font-semibold backdrop-blur-xl ${
                  roleColors[profile.role] || "bg-gray-500/20 text-gray-300"
                }`}>
                  {profile.role === "admin" && <Shield className="inline h-3 w-3 mr-1" />}
                  {profile.role.toUpperCase()}
                </span>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-xl bg-cyan-500/20 px-4 py-2 text-sm font-semibold text-red-300 border border-cyan-500/30 transition-all duration-300 hover:bg-cyan-500/30 hover:shadow-lg hover:shadow-red-500/20"
            >
              <LogOut className="h-4 w-4" />
              Esci
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden rounded-xl border border-blue-400/20 p-2 text-white transition-all duration-300 hover:bg-blue-500/10 hover:border-blue-400/40"
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden border-t border-blue-400/20 py-4 space-y-2 animate-in slide-in-from-top duration-300">
            <Link
              href="/"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-gray-400 hover:bg-blue-500/10 hover:text-white transition-all duration-300"
            >
              <Home className="h-4 w-4" />
              Home
            </Link>
            <Link
              href="/bookings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-gray-400 hover:bg-blue-500/10 hover:text-white transition-all duration-300"
            >
              <Calendar className="h-4 w-4" />
              <Calendar className="h-4 w-4" />
              Prenotazioni
            </Link>
            <Link
              href={dashboardLink}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-gray-400 hover:bg-blue-500/10 hover:text-white transition-all duration-300"
            >
              <User className="h-4 w-4" />
              Dashboard
            </Link>
            {(profile?.role === "admin" || profile?.role === "gestore") && (
              <Link
                href="/dashboard/admin/users"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-gray-400 hover:bg-blue-500/10 hover:text-white transition-all duration-300"
              >
                <Users className="h-4 w-4" />
                Utenti
              </Link>
            )}
            <div className="border-t border-blue-400/20 pt-3 mt-3">
              {profile && (
                <div className="px-4 py-3 text-sm bg-white/5 rounded-xl mb-2 backdrop-blur-xl border border-white/10">
                  <p className="text-gray-300">{profile.full_name || user.email}</p>
                  <span className={`inline-block mt-2 rounded-lg border px-3 py-1 text-xs font-semibold ${
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
                className="w-full flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-red-300 bg-cyan-500/20 border border-cyan-500/30 hover:bg-cyan-500/30 transition-all duration-300"
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
