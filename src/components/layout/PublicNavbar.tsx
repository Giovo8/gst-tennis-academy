"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export default function PublicNavbar() {
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
    <nav className="bg-white sticky top-2 z-50 safe-top shadow-sm mx-6 mt-2 rounded-xl border border-gray-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo - left */}
          <Link href="/" aria-label="Home - GST Tennis Academy" className="flex items-center gap-2 flex-shrink-0">
            <Image 
              src="/images/logo-tennis.png" 
              alt="GST Tennis Academy" 
              width={48} 
              height={48}
              priority
              className="h-8 w-8"
            />
            <span className="text-lg font-bold text-secondary">GST Academy</span>
          </Link>

          {/* Area GST Button - right */}
          <Link
            href={getDashboardLink()}
            className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium text-white bg-secondary shadow-sm hover:opacity-90 transition-all whitespace-nowrap"
          >
            Area GST
          </Link>
        </div>


      </div>
    </nav>
  );
}
