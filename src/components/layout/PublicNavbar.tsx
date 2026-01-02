"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X, LogOut, LayoutDashboard, Instagram, Facebook, Youtube, Shield } from "lucide-react";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export default function PublicNavbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userFullName, setUserFullName] = useState<string | null>(null);

  useEffect(() => {
    // Check current user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        // Get user role and full name
        supabase
          .from("profiles")
          .select("role, full_name")
          .eq("id", user.id)
          .single()
          .then(({ data }) => {
            if (data) {
              setUserRole(data.role);
              setUserFullName(data.full_name);
            }
          });
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        supabase
          .from("profiles")
          .select("role, full_name")
          .eq("id", session.user.id)
          .single()
          .then(({ data }) => {
            if (data) {
              setUserRole(data.role);
              setUserFullName(data.full_name);
            }
          });
      } else {
        setUserRole(null);
        setUserFullName(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const getDashboardLink = () => {
    if (!userRole) return "/login";
    if (userRole === "admin" || userRole === "gestore") return "/dashboard/admin";
    if (userRole === "maestro") return "/dashboard/maestro";
    if (userRole === "atleta") return "/dashboard/atleta";
    return "/dashboard";
  };

  // Handle protected links - redirect to login with return URL
  const handleProtectedLink = (targetPath: string) => (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      window.location.href = `/login?redirect=${encodeURIComponent(targetPath)}`;
    }
  };

  return (
    <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo - Left */}
          <Link href="/" aria-label="Home - GST Tennis Academy" className="flex items-center gap-3">
            <Image 
              src="/images/logo-tennis.png" 
              alt="GST Tennis Academy" 
              width={36} 
              height={36}
              className="h-9 w-9"
            />
            <span className="text-lg font-bold text-gray-900">GST Academy</span>
          </Link>

          {/* Right Side - Desktop */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Social Icons */}
            <div className="flex items-center gap-1">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-[18px] w-[18px]" />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-[18px] w-[18px]" />
              </a>
              <a
                href="https://wa.me/393762351777"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                aria-label="WhatsApp"
              >
                <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
              </a>
            </div>

            {/* User Status */}
            {user && userRole && (
              <>
                <div className="w-px h-6 bg-gray-200 mx-1"></div>
                <Link
                  href={`/dashboard/${userRole.toLowerCase()}/profile`}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-sm transition-colors h-[38px] ${
                    userRole === 'atleta' 
                      ? 'border-cyan-500 text-cyan-600 bg-cyan-50 hover:bg-cyan-100' 
                      : userRole === 'maestro'
                      ? 'border-purple-500 text-purple-600 bg-purple-50 hover:bg-purple-100'
                      : userRole === 'admin' || userRole === 'gestore'
                      ? 'border-orange-500 text-orange-600 bg-orange-50 hover:bg-orange-100'
                      : 'border-gray-500 text-gray-600 bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <span className="font-medium">{userFullName || user.email?.split('@')[0]}</span>
                  <span className="opacity-50">•</span>
                  <span className="font-bold uppercase tracking-wide">{userRole}</span>
                </Link>
              </>
            )}

            {/* Area GST Button - Dashboard Style */}
            <Link
              href={getDashboardLink()}
              className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium text-sm hover:from-cyan-600 hover:to-blue-600 transition-all shadow-sm h-[38px]"
            >
              <Shield className="h-[18px] w-[18px]" />
              <span>Area GST</span>
            </Link>

            {/* Logout Button */}
            {user && (
              <button
                onClick={handleLogout}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                aria-label="Esci"
              >
                <LogOut className="h-[18px] w-[18px]" />
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden rounded-lg p-2 text-gray-900 transition hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Menu"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="lg:hidden border-t border-gray-100 pt-4 mt-4 space-y-3 pb-4 pb-safe-bottom">
            {/* User Info */}
            {user && userRole && (
              <div className="text-center py-3 border-b border-gray-100">
                <p className="text-sm text-gray-700 font-medium">{userFullName || user.email}</p>
                <p className="text-xs text-cyan-600 font-semibold uppercase mt-1">{userRole}</p>
              </div>
            )}

            {/* Mobile Links */}
            <div className="space-y-2">
              <Link
                href={getDashboardLink()}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-full text-sm font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm"
              >
                <Shield className="h-4 w-4" />
                <span>Area GST</span>
              </Link>

              <a
                href="#contatti"
                className="block text-center py-3 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Contatti
              </a>

              {user && (
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-red-600"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Esci</span>
                </button>
              )}
            </div>

            {/* Mobile Social */}
            <div className="pt-3 space-y-3 border-t border-gray-100">
              <div className="flex items-center justify-center gap-3 pb-2">
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-gray-200 p-2.5 text-gray-600 transition hover:border-cyan-500 hover:bg-cyan-50 hover:text-cyan-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Instagram"
                >
                  <Instagram className="h-5 w-5" />
                </a>
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-gray-200 p-2.5 text-gray-600 transition hover:border-cyan-500 hover:bg-cyan-50 hover:text-cyan-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Facebook"
                >
                  <Facebook className="h-5 w-5" />
                </a>
                <a
                  href="#youtube"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-gray-200 p-2.5 text-gray-600 transition hover:border-cyan-500 hover:bg-cyan-50 hover:text-cyan-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="YouTube"
                >
                  <Youtube className="h-5 w-5" />
                </a>
                <a
                  href="https://wa.me/393762351777"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-gray-200 p-2.5 text-gray-600 transition hover:border-green-500 hover:bg-green-50 hover:text-green-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="WhatsApp"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                </a>
              </div>

              {/* User Status (shown when logged in) */}
              {user && userRole && (
                <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xl text-center">
                  <span className="text-xs text-white font-medium truncate max-w-[200px] inline-block">{userFullName || user.email}</span>
                  <span className="mx-1.5 text-muted-2">•</span>
                  <span className="text-xs text-blue-300 font-semibold">
                    {userRole.toUpperCase()}
                  </span>
                </div>
              )}

              {/* Area GST Button */}
              <Link
                href={getDashboardLink()}
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-400/40 hover:from-blue-500/30 hover:to-cyan-500/30 hover:border-blue-400/60 transition-all duration-300"
              >
                <Shield className="h-4 w-4 text-white" />
                <span className="text-white">Area GST</span>
              </Link>

              {/* Logout Button (shown when logged in) */}
              {user && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold bg-gradient-to-r from-red-500/20 to-rose-500/20 border border-red-400/40 hover:from-red-500/30 hover:to-rose-500/30 hover:border-red-400/60 transition-all duration-300"
                >
                  <LogOut className="h-4 w-4 text-white" />
                  <span className="text-white">Esci</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
