import { Facebook, Instagram, Youtube } from "lucide-react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-footer">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-white">GST Tennis Academy</p>
          <p className="text-xs text-muted-2">
            Cresci nel tuo tennis con metodo, dati e community.
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-2">
            <Link href="/lavora-con-noi" className="hover:text-white">
              Lavora con noi
            </Link>
            <Link href="/news" className="hover:text-white">
              News
            </Link>
            <Link href="/annunci" className="hover:text-white">
              Cerco socio
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-white/15 p-2 text-white transition hover:border-white/30 hover:bg-white/5"
          >
            <Instagram className="h-4 w-4" />
          </a>
          <a
            href="https://facebook.com"
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-white/15 p-2 text-white transition hover:border-white/30 hover:bg-white/5"
          >
            <Facebook className="h-4 w-4" />
          </a>
          <a
            href="https://youtube.com"
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-white/15 p-2 text-white transition hover:border-white/30 hover:bg-white/5"
          >
            <Youtube className="h-4 w-4" />
          </a>
        </div>
      </div>
    </footer>
  );
}


