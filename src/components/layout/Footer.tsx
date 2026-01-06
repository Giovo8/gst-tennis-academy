"use client";

import Link from "next/link";
import { Facebook, Instagram, Twitter, Youtube } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-white pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Logo centered */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-6">
            <img src="/images/logo-tennis.png" alt="GST Academy" className="h-10 w-10" />
            <span className="text-2xl font-bold" style={{ color: 'var(--secondary)', fontFamily: 'var(--font-urbanist)' }}>Area GST</span>
          </div>
          
          {/* Navigation Links centered */}
          <nav className="flex flex-wrap items-center justify-center gap-6 mb-6">
            <Link 
              href="/bookings" 
              className="text-base transition-opacity hover:opacity-70"
              style={{ color: 'var(--secondary)' }}
            >
              Prenota campo
            </Link>
            <Link 
              href="/services" 
              className="text-base transition-opacity hover:opacity-70"
              style={{ color: 'var(--secondary)' }}
            >
              I nostri corsi
            </Link>
            <Link 
              href="/tornei" 
              className="text-base transition-opacity hover:opacity-70"
              style={{ color: 'var(--secondary)' }}
            >
              Tornei
            </Link>
            <Link 
              href="#contatti" 
              className="text-base transition-opacity hover:opacity-70"
              style={{ color: 'var(--secondary)' }}
            >
              Contattaci
            </Link>
            <Link 
              href="#chi-siamo" 
              className="text-base transition-opacity hover:opacity-70"
              style={{ color: 'var(--secondary)' }}
            >
              Chi siamo
            </Link>
          </nav>

          {/* Social Icons centered */}
          <div className="flex gap-3 justify-center">
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-opacity hover:opacity-70"
              aria-label="Facebook"
            >
              <Facebook className="h-5 w-5" style={{ color: 'var(--secondary)' }} />
            </a>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-opacity hover:opacity-70"
              aria-label="Instagram"
            >
              <Instagram className="h-5 w-5" style={{ color: 'var(--secondary)' }} />
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-opacity hover:opacity-70"
              aria-label="Twitter"
            >
              <Twitter className="h-5 w-5" style={{ color: 'var(--secondary)' }} />
            </a>
            <a
              href="https://youtube.com"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-opacity hover:opacity-70"
              aria-label="YouTube"
            >
              <Youtube className="h-5 w-5" style={{ color: 'var(--secondary)' }} />
            </a>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="pt-6 mt-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            {/* Copyright - Left */}
            <p className="text-sm" style={{ color: 'var(--secondary)' }}>
              © 2025 Area GST. Tutti i diritti riservati.
            </p>

            {/* Bottom Links - Right */}
            <div className="flex flex-wrap gap-4 text-sm">
              <Link 
                href="/privacy" 
                className="underline transition-opacity hover:opacity-70"
                style={{ color: 'var(--secondary)' }}
              >
                Privacy
              </Link>
              <Link 
                href="/terms" 
                className="underline transition-opacity hover:opacity-70"
                style={{ color: 'var(--secondary)' }}
              >
                Termini di servizio
              </Link>
              <Link 
                href="/cookie-policy" 
                className="underline transition-opacity hover:opacity-70"
                style={{ color: 'var(--secondary)' }}
              >
                Impostazioni cookie
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}


