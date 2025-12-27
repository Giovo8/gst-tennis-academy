"use client";

import Link from "next/link";
import { Instagram, Facebook, Youtube, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";

const navItems = [
  { label: "Programmi", href: "#programmi" },
  { label: "Allenatori", href: "#staff" },
  { label: "Struttura", href: "#struttura" },
  { label: "News", href: "#news" },
  { label: "Contatti", href: "#contatti" },
];

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserRole(session.user.id);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserRole(session.user.id);
      } else {
        setUserRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserRole = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();
    
    if (data?.role) {
      setUserRole(data.role);
    }
  };

  const getDashboardUrl = () => {
    switch (userRole) {
      case "admin":
      case "gestore":
        return "/dashboard/admin";
      case "maestro":
        return "/dashboard/maestro";
      case "atleta":
      default:
        return "/dashboard/atleta";
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <header className="border-b border-white/10 bg-[#021627]/95 backdrop-blur-sm sticky top-0 z-50">
      <a href="#content" className="sr-only focus:not-sr-only">
        Salta al contenuto
      </a>
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" aria-label="Home - GST Tennis Academy" className="flex items-center gap-3">
            <Image 
              src="/images/logo-tennis.png" 
              alt="GST Tennis Academy Logo" 
              width={36} 
              height={36}
              className="h-9 w-9"
            />
            <span className="text-lg font-bold text-white">GST Academy</span>
          </Link>

          {/* Desktop Menu */}
          <nav role="navigation" className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-muted transition hover:text-white focus:outline-none focus-ring-accent"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            {/* Social Icons - Desktop Only */}
            <div className="hidden lg:flex items-center gap-2 text-muted">
              <a
                href="https://www.instagram.com/gst_tennis/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="rounded-full border border-white/15 p-2 transition hover:border-white/30 hover:bg-white/5"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href="https://www.facebook.com/TnnisTimeOut/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="rounded-full border border-white/15 p-2 transition hover:border-white/30 hover:bg-white/5"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href="#youtube"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                className="rounded-full border border-white/15 p-2 transition hover:border-white/30 hover:bg-white/5"
              >
                <Youtube className="h-4 w-4" />
              </a>
              <a
                href="https://wa.me/393762351777"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="rounded-full border border-white/15 p-2 transition hover:border-white/30 hover:bg-white/5"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
              </a>
            </div>

            {user ? (
              <>
                <Link
                  href={getDashboardUrl()}
                  className="rounded-full bg-[#2f7de1] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2563c7]"
                >
                  Area GST
                </Link>
                <button
                  onClick={handleLogout}
                  className="hidden md:inline-flex rounded-full border border-white/15 p-2 text-white transition hover:border-white/30 hover:bg-white/5"
                  aria-label="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="rounded-full bg-[#2f7de1] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2563c7]"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

