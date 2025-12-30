"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut, Menu, X, Shield, Instagram, Facebook, Youtube } from "lucide-react";
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
    maestro: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    gestore: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    admin: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  };

  if (!user) return null;

  return (
    <nav className="border-b border-white/10 bg-[#021627]/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="container py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
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
          <div className="hidden md:flex items-center gap-3">
            {/* Social Icons */}
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-white/10 p-2 text-white transition hover:border-accent hover:bg-accent-15 hover:text-accent"
              aria-label="Instagram"
            >
              <Instagram className="h-4 w-4" />
            </a>
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-white/10 p-2 text-white transition hover:border-accent hover:bg-accent-15 hover:text-accent"
              aria-label="Facebook"
            >
              <Facebook className="h-4 w-4" />
            </a>
            <a
              href="#youtube"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-white/10 p-2 text-white transition hover:border-accent hover:bg-accent-15 hover:text-accent"
              aria-label="YouTube"
            >
              <Youtube className="h-4 w-4" />
            </a>
            <a
              href="https://wa.me/393762351777"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-white/10 p-2 text-white transition hover:border-accent hover:bg-accent-15 hover:text-accent"
              aria-label="WhatsApp"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
            </a>

            <div className="w-px h-6 bg-white/10"></div>

            {/* User Status */}
            {profile && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xl">
                <div className="text-sm">
                  <span className="text-white font-medium">{profile.full_name || user.email}</span>
                  <span className="mx-2 text-muted-2">•</span>
                  <span className={`font-semibold ${roleColors[profile.role]}`}>
                    {profile.role.toUpperCase()}
                  </span>
                </div>
              </div>
            )}
            
            <Link
              href={dashboardLink}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-400/40 hover:from-blue-500/30 hover:to-cyan-500/30 hover:border-blue-400/60 transition-all duration-300"
            >
              <Shield className="h-4 w-4 text-white" />
              <span className="text-white">Area GST</span>
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-red-500/20 to-rose-500/20 border border-red-400/40 hover:from-red-500/30 hover:to-rose-500/30 hover:border-red-400/60 transition-all duration-300"
            >
              <LogOut className="h-4 w-4 text-white" />
              <span className="text-white">Esci</span>
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
          <div className="md:hidden border-t border-blue-400/20 py-4 space-y-3 animate-in slide-in-from-top duration-300">
            {/* Social Icons */}
            <div className="flex items-center justify-center gap-3 pb-2">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-white/10 p-2.5 text-white transition hover:border-accent hover:bg-accent-15 hover:text-accent"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-white/10 p-2.5 text-white transition hover:border-accent hover:bg-accent-15 hover:text-accent"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="#youtube"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-white/10 p-2.5 text-white transition hover:border-accent hover:bg-accent-15 hover:text-accent"
                aria-label="YouTube"
              >
                <Youtube className="h-5 w-5" />
              </a>
              <a
                href="https://wa.me/393762351777"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-white/10 p-2.5 text-white transition hover:border-accent hover:bg-accent-15 hover:text-accent"
                aria-label="WhatsApp"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
              </a>
            </div>

            {/* User Status */}
            {profile && (
              <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xl text-center">
                <span className="text-sm text-white font-medium">{profile.full_name || user.email}</span>
                <span className="mx-2 text-muted-2">•</span>
                <span className={`text-sm font-semibold ${roleColors[profile.role]}`}>
                  {profile.role.toUpperCase()}
                </span>
              </div>
            )}
            
            <Link
              href={dashboardLink}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-400/40 hover:from-blue-500/30 hover:to-cyan-500/30 hover:border-blue-400/60 transition-all duration-300"
            >
              <Shield className="h-4 w-4 text-white" />
              <span className="text-white">Area GST</span>
            </Link>
            <button
              onClick={() => {
                setIsOpen(false);
                handleLogout();
              }}
              className="w-full flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold bg-gradient-to-r from-red-500/20 to-rose-500/20 border border-red-400/40 hover:from-red-500/30 hover:to-rose-500/30 hover:border-red-400/60 transition-all duration-300"
            >
              <LogOut className="h-4 w-4 text-white" />
              <span className="text-white">Esci</span>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
