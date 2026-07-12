"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

type PublicNavbarProps = {
  home?: boolean;
};

export default function PublicNavbar({ home = false }: PublicNavbarProps) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

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
            }
          });
      } else {
        setUserRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const getDashboardLink = () => {
    if (!userRole) return "/login";
    if (userRole === "admin" || userRole === "gestore") return "/dashboard/admin";
    if (userRole === "maestro") return "/dashboard/maestro";
    if (userRole === "atleta") return "/dashboard/atleta";
    return "/dashboard";
  };

  return (
    <>
    <nav
      className={home
        ? "bg-secondary fixed top-4 left-6 right-6 z-50 border border-black/10 rounded-lg shadow-none [transform:translateZ(0)] lg:sticky lg:top-0 lg:mx-0 lg:mt-0 lg:border lg:border-black/10 lg:rounded-none lg:shadow-sm"
        : "bg-white fixed top-4 left-6 right-6 lg:sticky lg:top-4 lg:left-auto lg:right-auto lg:mx-6 lg:mt-4 z-50 shadow-sm rounded-xl border border-black/10 [transform:translateZ(0)]"
      }
    >
      <div className={home ? "relative max-w-7xl mx-auto px-4" : "relative max-w-7xl mx-auto px-3 sm:px-6 lg:px-8"}>
        <div className={home ? "relative flex items-center h-16" : "relative flex items-center h-[4.5rem] lg:h-[5rem]"}>
          {/* Logo + title, left aligned on all breakpoints */}
          <Link
            href="/"
            aria-label="Home - GST Tennis Academy"
            className="flex items-center gap-1.5 lg:gap-2 min-w-0"
          >
            <Image 
              src="/images/logo-tennis.png" 
              alt="GST Tennis Academy" 
              width={48} 
              height={48}
              priority
              className={home ? "h-7 w-7 lg:h-8 lg:w-8" : "h-8 w-8"}
            />
            <span className={home ? "text-base lg:text-lg font-bold leading-none text-white whitespace-nowrap" : "text-lg font-bold leading-none text-secondary"}>GST Academy</span>
          </Link>

          <Link
            href={getDashboardLink()}
            className={home
              ? "ml-auto inline-flex !h-9 !min-h-0 items-center justify-center px-4 !py-0 rounded-lg text-sm font-semibold text-secondary bg-white hover:bg-white/90 transition-colors"
              : "ml-auto inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold text-white bg-secondary hover:bg-secondary/90 transition-colors"
            }
          >
            {user ? "Area GST" : "Accedi"}
          </Link>
        </div>
      </div>
    </nav>
    <div className={home ? "h-16 lg:hidden" : "h-[4.5rem] lg:hidden"} aria-hidden="true" />
    </>
  );
}
