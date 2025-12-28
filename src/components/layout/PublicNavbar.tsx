"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, LogIn, UserPlus } from "lucide-react";
import Image from "next/image";

export default function PublicNavbar() {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { href: "/", label: "Home" },
    { href: "/tornei", label: "Tornei" },
    { href: "/news", label: "News" },
    { href: "/courses", label: "Corsi" },
    { href: "/#contatti", label: "Contatti" },
  ];

  return (
    <nav className="border-b border-white/10 bg-[#021627]/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="container py">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" aria-label="Home - GST Tennis Academy" className="flex items-center gap-3">
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
          <div className="hidden lg:flex items-center gap-8">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-muted-2 transition hover:text-accent"
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* CTA Buttons - Desktop */}
          <div className="hidden lg:flex items-center gap-3">
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:border-accent hover:bg-accent-15"
            >
              <LogIn className="h-4 w-4" />
              Accedi
            </Link>
            <Link
              href="/register"
              className="flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-[#06101f] transition hover:bg-accent-mid shadow-accent"
            >
              <UserPlus className="h-4 w-4" />
              Registrati
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden rounded-lg border border-white/15 p-2 text-white transition hover:bg-white/5"
            aria-label="Menu"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="lg:hidden border-t border-white/10 pt-4 mt-4 space-y-2 pb-4">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="block rounded-lg px-4 py-3 text-sm font-medium text-muted-2 hover:bg-white/5 hover:text-white transition"
              >
                {item.label}
              </Link>
            ))}
            
            {/* Mobile CTA Buttons */}
            <div className="pt-4 space-y-2 border-t border-white/10">
              <Link
                href="/login"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center gap-2 rounded-full border border-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:border-accent hover:bg-accent-15"
              >
                <LogIn className="h-4 w-4" />
                Accedi
              </Link>
              <Link
                href="/register"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center gap-2 rounded-full bg-accent px-4 py-3 text-sm font-semibold text-[#06101f] transition hover:bg-accent-mid shadow-accent"
              >
                <UserPlus className="h-4 w-4" />
                Registrati
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
