'use client';

import { useEffect, useState } from 'react';
import { getCourts } from '@/lib/courts/getCourts';
import { DEFAULT_COURTS } from '@/lib/courts/constants';

/**
 * Campi attivi da `courts_settings` (via getCourts), per i selettori di campo.
 * Parte dai campi di default, così il selettore è subito utilizzabile.
 */
export function useCourts(): string[] {
  const [courts, setCourts] = useState<string[]>(DEFAULT_COURTS);

  useEffect(() => {
    let cancelled = false;
    getCourts().then((list) => {
      if (!cancelled) setCourts(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return courts;
}
