import { Facebook, Instagram, Youtube, Mail, MapPin, Phone, Twitter } from "lucide-react";
import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-secondary border-t border-white/10 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* About Section */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img src="/images/logo-tennis.png" alt="GST Academy" className="h-10 w-10" />
              <span className="text-lg font-bold text-white">GST Tennis Academy</span>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              La tua accademia di tennis di riferimento per allenamenti professionali, tornei e corsi per tutti i livelli.
            </p>
            <div className="flex gap-3">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-blue-500/10 hover:bg-primary text-blue-400 hover:text-white transition-all"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-pink-500/10 hover:bg-pink-600 text-pink-400 hover:text-white transition-all"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-sky-500/10 hover:bg-sky-500 text-sky-400 hover:text-white transition-all"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="#youtube"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white transition-all"
                aria-label="YouTube"
              >
                <Youtube className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">Link Rapidi</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/courses" className="text-gray-400 hover:text-primary transition-colors">
                  Corsi
                </Link>
              </li>
              <li>
                <Link href="/bookings" className="text-gray-400 hover:text-primary transition-colors">
                  Prenotazioni
                </Link>
              </li>
              <li>
                <Link href="/tornei" className="text-gray-400 hover:text-primary transition-colors">
                  Tornei
                </Link>
              </li>
              <li>
                <Link href="/news" className="text-gray-400 hover:text-primary transition-colors">
                  News
                </Link>
              </li>
              <li>
                <Link href="/annunci" className="text-gray-400 hover:text-primary transition-colors">
                  Bacheca Annunci
                </Link>
              </li>
              <li>
                <Link href="/lavora-con-noi" className="text-gray-400 hover:text-primary transition-colors">
                  Lavora con Noi
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">Informazioni Legali</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/privacy" className="text-gray-400 hover:text-blue-400 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-400 hover:text-blue-400 transition-colors">
                  Termini e Condizioni
                </Link>
              </li>
              <li>
                <Link href="/cookie-policy" className="text-gray-400 hover:text-blue-400 transition-colors">
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link href="/refund-policy" className="text-gray-400 hover:text-blue-400 transition-colors">
                  Politica di Rimborso
                </Link>
              </li>
              <li>
                <Link href="/accessibility" className="text-gray-400 hover:text-blue-400 transition-colors">
                  Accessibilità
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">Contatti</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2 text-gray-400">
                <MapPin className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <span>
                  Via dello Sport 123<br />
                  00100 Roma, Italia
                </span>
              </li>
              <li className="flex items-center gap-2 text-gray-400">
                <Phone className="h-5 w-5 text-blue-400 flex-shrink-0" />
                <a href="tel:+393762351777" className="hover:text-blue-400 transition-colors">
                  +39 376 235 1777
                </a>
              </li>
              <li className="flex items-center gap-2 text-gray-400">
                <Mail className="h-5 w-5 text-blue-400 flex-shrink-0" />
                <a href="mailto:info@gsttennisacademy.it" className="hover:text-blue-400 transition-colors">
                  info@gsttennisacademy.it
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-400">
            <p>
              © {currentYear} GST Tennis Academy. Tutti i diritti riservati.
            </p>
            <div className="flex gap-6">
              <Link href="/sitemap" className="hover:text-blue-400 transition-colors">
                Mappa del Sito
              </Link>
              <Link href="/faq" className="hover:text-blue-400 transition-colors">
                FAQ
              </Link>
              <Link href="/support" className="hover:text-blue-400 transition-colors">
                Supporto
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}


