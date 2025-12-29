import { Facebook, Instagram, Youtube } from "lucide-react";
import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#050a14] border-t border-white/5">
      <div className="container py-lg">
        {/* Main Footer Content */}
        <div className="flex flex-col items-center text-center space-y-6">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3">
              <img src="/images/logo-tennis.png" alt="GST Academy" className="h-10 w-10" />
              <span className="text-lg font-bold text-white">GST Tennis Academy</span>
            </div>
            <p className="text-sm text-muted-2 leading-relaxed max-w-md">
              Cresci nel tuo tennis con metodo, dati e community.
            </p>
          </div>

          {/* Social Icons */}
          <div className="flex items-center gap-3">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-white/10 p-2.5 text-muted-2 transition hover:border-accent hover:bg-accent-15 hover:text-accent"
              aria-label="Instagram"
            >
              <Instagram className="h-5 w-5" />
            </a>
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-white/10 p-2.5 text-muted-2 transition hover:border-accent hover:bg-accent-15 hover:text-accent"
              aria-label="Facebook"
            >
              <Facebook className="h-5 w-5" />
            </a>
            <a
              href="#youtube"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-white/10 p-2.5 text-muted-2 transition hover:border-accent hover:bg-accent-15 hover:text-accent"
              aria-label="YouTube"
            >
              <Youtube className="h-5 w-5" />
            </a>
            <a
              href="https://wa.me/393762351777"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-white/10 p-2.5 text-muted-2 transition hover:border-accent hover:bg-accent-15 hover:text-accent"
              aria-label="WhatsApp"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
            </a>
          </div>

          {/* Lavora con noi */}
          <div>
            <Link href="/lavora-con-noi" className="text-sm text-muted-2 hover:text-accent transition-colors">
              Lavora con noi
            </Link>
          </div>

          {/* Bottom Copyright */}
          <div className="border-t border-white/5 pt-6 w-full">
            <p className="text-xs text-muted-2 text-center">
              © {currentYear} GST Tennis Academy. Tutti i diritti riservati.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}


