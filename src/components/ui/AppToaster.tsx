'use client';

import { Toaster } from 'sonner';
import { Check, Info, TriangleAlert, X } from 'lucide-react';

/**
 * Toaster globale: stile allineato al centro notifiche (card bianca + badge colorato).
 * Stili in globals.css (sezione "Toast"). Testi brevi, senza description.
 */
export default function AppToaster() {
  return (
    <Toaster
      position="bottom-center"
      closeButton
      mobileOffset={{ bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}
      icons={{
        success: <Check strokeWidth={2.5} />,
        error: <X strokeWidth={2.5} />,
        warning: <TriangleAlert strokeWidth={2.5} />,
        info: <Info strokeWidth={2.5} />,
      }}
    />
  );
}
