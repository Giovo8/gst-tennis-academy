'use client';

import { useState, useSyncExternalStore } from 'react';
import { Smartphone } from 'lucide-react';

const STORAGE_KEY = 'gst-rotate-hint-dismissed';

const noopSubscribe = () => () => {};

function readDismissed() {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Avviso a schermo intero che invita a ruotare lo smartphone in orizzontale.
 * Visibile solo su dispositivi touch stretti in verticale (media query CSS):
 * ruotando il telefono sparisce da solo. Una volta chiuso non ricompare
 * per il resto della sessione del browser.
 */
export default function RotateDeviceHint() {
  // Lato server (e in idratazione) risulta "chiuso": niente mismatch SSR
  const storedDismissed = useSyncExternalStore(noopSubscribe, readDismissed, () => true);
  const [dismissed, setDismissed] = useState(false);

  if (storedDismissed || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // storage non disponibile (es. navigazione privata): basta nasconderlo
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rotate-hint-title"
      className="fixed inset-0 z-[200] hidden flex-col items-center justify-center gap-4 bg-secondary px-8 text-center text-white [@media(orientation:portrait)_and_(max-width:767px)_and_(pointer:coarse)]:flex"
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10">
        <Smartphone className="rotate-hint-icon h-10 w-10" strokeWidth={1.8} />
      </div>
      {/* !font-sans: la regola globale h1–h6 imporrebbe Urbanist, le card della dashboard usano Inter */}
      <h2 id="rotate-hint-title" className="!font-sans text-lg font-bold">
        Ruota il telefono
      </h2>
      <p className="max-w-xs text-sm leading-relaxed text-white/85">
        Per un&apos;esperienza migliore usa il telefono in orizzontale: avrai più spazio per
        prenotazioni, calendario e statistiche.
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="mt-2 rounded-lg bg-white px-5 py-2.5 text-sm font-bold text-secondary transition-colors hover:bg-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--secondary)]"
      >
        Continua in verticale
      </button>
    </div>
  );
}
