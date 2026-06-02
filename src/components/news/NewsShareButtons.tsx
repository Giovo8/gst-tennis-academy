"use client";

import { useMemo, useState } from "react";
import { Check, Facebook, Link2 } from "lucide-react";

type Props = {
  url: string;
  title: string;
};

function XBrandIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M18.901 1.154h3.68l-8.04 9.188 9.458 12.504h-7.406l-5.8-7.584-6.63 7.584H.48l8.6-9.83L0 1.154h7.594l5.243 6.932L18.9 1.154Zm-1.29 19.49h2.04L6.486 3.24H4.298L17.61 20.644Z" />
    </svg>
  );
}

function WhatsAppBrandIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M19.05 4.91A9.81 9.81 0 0 0 12.06 2C6.64 2 2.24 6.4 2.24 11.82c0 1.73.45 3.43 1.3 4.94L2 22l5.4-1.42a9.77 9.77 0 0 0 4.67 1.2h.01c5.41 0 9.81-4.4 9.82-9.82A9.76 9.76 0 0 0 19.05 4.9Zm-6.98 15.2h-.01a8.15 8.15 0 0 1-4.16-1.14l-.3-.18-3.2.84.86-3.12-.2-.32a8.13 8.13 0 0 1-1.24-4.36c0-4.5 3.66-8.16 8.17-8.16a8.1 8.1 0 0 1 5.78 2.4 8.11 8.11 0 0 1 2.39 5.78c0 4.5-3.66 8.16-8.16 8.16Zm4.48-6.1c-.24-.12-1.4-.7-1.62-.78-.21-.08-.36-.12-.52.12-.15.23-.6.78-.73.94-.13.16-.27.18-.5.06-.24-.12-1-.37-1.9-1.2-.71-.62-1.2-1.4-1.34-1.63-.14-.24-.01-.37.1-.49.1-.1.24-.27.35-.4.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.43-.06-.12-.52-1.26-.72-1.73-.19-.45-.38-.38-.52-.39h-.44c-.16 0-.4.06-.61.3-.21.23-.8.78-.8 1.9s.82 2.2.93 2.35c.12.16 1.6 2.45 3.88 3.44.54.24.96.38 1.29.48.54.17 1.03.14 1.42.08.43-.06 1.4-.57 1.6-1.12.2-.55.2-1.02.14-1.12-.05-.1-.2-.16-.43-.28Z" />
    </svg>
  );
}

export default function NewsShareButtons({ url, title }: Props) {
  const [copied, setCopied] = useState(false);

  const links = useMemo(() => {
    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title);

    return {
      whatsapp: `https://wa.me/?text=${encodedUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      x: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    };
  }, [url, title]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div>
      <p className="mb-3 text-sm font-semibold text-secondary">Condividi su</p>
      <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <a
          href={links.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white p-0 text-sm font-medium text-secondary hover:bg-gray-50 sm:h-auto sm:w-auto sm:gap-2 sm:px-3 sm:py-2"
          aria-label="Condividi su WhatsApp"
        >
          <WhatsAppBrandIcon className="h-4 w-4" />
          <span className="hidden sm:inline">WhatsApp</span>
        </a>
        <a
          href={links.facebook}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white p-0 text-sm font-medium text-secondary hover:bg-gray-50 sm:h-auto sm:w-auto sm:gap-2 sm:px-3 sm:py-2"
          aria-label="Condividi su Facebook"
        >
          <Facebook className="h-4 w-4" />
          <span className="hidden sm:inline">Facebook</span>
        </a>
        <a
          href={links.x}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white p-0 text-sm font-medium text-secondary hover:bg-gray-50 sm:h-auto sm:w-auto sm:gap-2 sm:px-3 sm:py-2"
          aria-label="Condividi su X"
        >
          <XBrandIcon className="h-4 w-4" />
          <span className="hidden sm:inline">X</span>
        </a>
        <button
          type="button"
          onClick={copyLink}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white p-0 text-sm font-medium text-secondary hover:bg-gray-50 sm:h-auto sm:w-auto sm:gap-2 sm:px-3 sm:py-2"
          aria-label="Copia link della notizia"
        >
          {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
          <span className="hidden sm:inline">{copied ? "Copiato" : "Copia link"}</span>
        </button>
      </div>
    </div>
  );
}
