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
    <nav className="bg-white sticky top-0 z-50 safe-top">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Left Side - Mobile Menu Button on mobile, Navigation Links on desktop */}
          <div className="flex items-center gap-4">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="lg:hidden p-2 transition min-h-[48px] min-w-[48px] flex items-center justify-center touch-manipulation"
              style={{ color: 'var(--secondary)' }}
              aria-label={isOpen ? "Chiudi menu" : "Apri menu"}
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>

            {/* Desktop Navigation Links */}
            <div className="hidden lg:flex items-center gap-6 xl:gap-8">
              <Link
                href="/tornei"
                className="font-semibold transition-colors"
                style={{ color: 'var(--secondary)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--secondary)'}
              >
                Tornei
              </Link>
              <Link
                href="/news"
                className="font-semibold transition-colors"
                style={{ color: 'var(--secondary)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--secondary)'}
              >
                News
              </Link>
              <Link
                href="/lavora-con-noi"
                className="font-semibold transition-colors"
                style={{ color: 'var(--secondary)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--secondary)'}
              >
                Lavora con Noi
              </Link>
            </div>
          </div>

          {/* Center - Logo */}
          <Link href="/" aria-label="Home - GST Tennis Academy" className="flex items-center min-w-0 flex-shrink absolute left-1/2 transform -translate-x-1/2">
            <Image 
              src="/images/logo-tennis.png" 
              alt="GST Tennis Academy" 
              width={48} 
              height={48}
              priority
              className="h-10 w-10 sm:h-12 sm:w-12"
            />
          </Link>

          {/* Right Side - Area GST Button */}
          <div className="flex items-center">
            <Link
              href={getDashboardLink()}
              className="px-4 py-2 rounded-lg text-white font-semibold text-xs sm:text-sm transition-all whitespace-nowrap flex items-center justify-center"
              style={{ backgroundColor: 'var(--secondary)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--secondary-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--secondary)'}
            >
              Area GST
            </Link>
          </div>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="lg:hidden mt-2 pt-3 sm:pt-4 space-y-2 sm:space-y-3 pb-3 sm:pb-4 animate-in slide-in-from-top duration-300">
            {/* Navigation Links */}
            <div className="space-y-2 px-2">
              <Link
                href="/tornei"
                onClick={() => setIsOpen(false)}
                className="block px-4 py-3 rounded-lg font-semibold transition-colors min-h-[48px] touch-manipulation"
                style={{ color: 'var(--secondary)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                Tornei
              </Link>
              <Link
                href="/news"
                onClick={() => setIsOpen(false)}
                className="block px-4 py-3 rounded-lg font-semibold transition-colors min-h-[48px] touch-manipulation"
                style={{ color: 'var(--secondary)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                News
              </Link>
              <Link
                href="/lavora-con-noi"
                onClick={() => setIsOpen(false)}
                className="block px-4 py-3 rounded-lg font-semibold transition-colors min-h-[48px] touch-manipulation"
                style={{ color: 'var(--secondary)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                Lavora con Noi
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
