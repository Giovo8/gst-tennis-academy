"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X, LogOut, LayoutDashboard, Shield, Instagram, Facebook, Youtube } from "lucide-react";
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
    <nav className="bg-white sticky top-0 z-50 border-b border-frozen-100 safe-top shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo - Left */}
          <Link href="/" aria-label="Home - GST Tennis Academy" className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink">
            <Image 
              src="/images/logo-tennis.png" 
              alt="GST Tennis Academy" 
              width={36} 
              height={36}
              priority
              className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0"
            />
            <span className="text-base sm:text-lg font-bold text-frozen-900 truncate">GST Academy</span>
          </Link>

          {/* Right Side - Desktop */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Social Icons */}
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-lg flex items-center justify-center text-frozen-700 hover:text-frozen-500 hover:bg-frozen-50 transition-colors"
              aria-label="Instagram"
            >
              <Instagram className="h-5 w-5" />
            </a>
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-lg flex items-center justify-center text-frozen-700 hover:text-frozen-500 hover:bg-frozen-50 transition-colors"
              aria-label="Facebook"
            >
              <Facebook className="h-5 w-5" />
            </a>
            <a
              href="https://wa.me/393762351777"
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-lg flex items-center justify-center text-frozen-700 hover:text-frozen-500 hover:bg-frozen-50 transition-colors"
              aria-label="WhatsApp"
            >
              <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
            </a>

            <div className="w-px h-6 bg-frozen-200"></div>

            {user && userRole && (
              <>
                <Link
                  href={`/dashboard/${userRole.toLowerCase()}/profile`}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all h-[38px] hover:shadow-md ${
                    userRole === 'atleta' 
                      ? 'border-frozen-500 text-frozen-500 bg-frozen-50 hover:bg-frozen-100' 
                      : userRole === 'maestro'
                      ? 'border-frozen-500 text-frozen-500 bg-frozen-50 hover:bg-frozen-100'
                      : userRole === 'admin' || userRole === 'gestore'
                      ? 'border-frozen-600 text-frozen-600 bg-frozen-50 hover:bg-frozen-100'
                      : 'border-frozen-700 text-frozen-800 bg-frozen-50 hover:bg-frozen-100'
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
              className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-frozen-500 text-white font-semibold text-sm hover:bg-frozen-600 transition-all shadow-sm hover:shadow-md h-[38px]"
            >
              <Shield className="h-[18px] w-[18px]" />
              <span>Area GST</span>
            </Link>

            {/* Logout Button */}
            {user && (
              <button
                onClick={handleLogout}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-frozen-700 hover:text-frozen-500 hover:bg-frozen-50 transition-colors"
                aria-label="Esci"
              >
                <LogOut className="h-[18px] w-[18px]" />
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden rounded-lg p-2.5 text-frozen-900 transition hover:bg-frozen-50 min-h-[48px] min-w-[48px] flex items-center justify-center touch-manipulation"
            aria-label={isOpen ? "Chiudi menu" : "Apri menu"}
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="lg:hidden border-t border-frozen-100 mt-2 pt-4 space-y-3 pb-4 animate-in slide-in-from-top duration-300">
            {/* User Info */}
            {user && userRole && (
              <div className="flex items-center justify-center gap-2 py-3 px-4 border-y border-frozen-100 mx-2 rounded-lg bg-frozen-50">
                <p className="text-sm text-frozen-800 font-medium truncate">{userFullName || user.email}</p>
                <p className={`text-xs font-semibold uppercase ${
                  userRole === 'atleta' ? 'text-frozen-500' :
                  userRole === 'maestro' ? 'text-frozen-600' :
                  userRole === 'admin' || userRole === 'gestore' ? 'text-frozen-700' :
                  'text-frozen-700'
                }`}>{userRole}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 px-2">
              <Link
                href={getDashboardLink()}
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-sm font-semibold bg-frozen-500 text-white hover:bg-frozen-600 shadow-sm min-h-[48px] touch-manipulation"
              >
                <Shield className="h-5 w-5" />
                <span>Area GST</span>
              </Link>

              {user && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    handleLogout();
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold text-frozen-500 hover:text-frozen-600 bg-frozen-50 hover:bg-frozen-100 rounded-xl min-h-[48px] touch-manipulation"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Esci</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
