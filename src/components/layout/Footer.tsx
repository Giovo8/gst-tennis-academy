"use client";

import Link from "next/link";
import { Facebook, Instagram, Mail, Youtube } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-white pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Logo centered */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-6">
            <img src="/images/logo-tennis.png" alt="GST Academy" className="h-10 w-10" />
            <span className="text-2xl font-bold" style={{ color: 'var(--secondary)', fontFamily: 'var(--font-urbanist)' }}>GST Academy</span>
          </div>
          
          {/* Social Icons centered */}
          <div className="flex gap-3 justify-center">
            <a
              href="https://www.facebook.com/TnnisTimeOut/"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-opacity hover:opacity-70"
              aria-label="Facebook"
            >
              <Facebook className="h-5 w-5" style={{ color: 'var(--secondary)' }} />
            </a>
            <a
              href="https://www.instagram.com/gst_tennis"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-opacity hover:opacity-70"
              aria-label="Instagram"
            >
              <Instagram className="h-5 w-5" style={{ color: 'var(--secondary)' }} />
            </a>
            <a
              href="https://wa.me/393791958651"
              target="_blank"
              rel="noreferrer"
              className="transition-opacity hover:opacity-70"
              aria-label="WhatsApp"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--secondary)' }}>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
            </a>
            <a
              href="mailto:info@gstennisacademy.it"
              className="transition-opacity hover:opacity-70"
              aria-label="Email"
            >
              <Mail className="h-5 w-5" style={{ color: 'var(--secondary)' }} />
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
              © 2026 GST Academy. Tutti i diritti riservati.
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


