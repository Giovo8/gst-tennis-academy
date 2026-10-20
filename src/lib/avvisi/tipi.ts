import { CalendarDays, CalendarX, Megaphone, TriangleAlert, type LucideIcon } from 'lucide-react';
import type { AVVISO_TIPI } from '@/lib/validation/schemas';

export type AvvisoTipo = (typeof AVVISO_TIPI)[number];

/** Etichetta, icona e colore di sfondo per tipo di avviso (Bacheca e admin). */
export const AVVISO_TIPO_UI: Record<AvvisoTipo, { label: string; icon: LucideIcon; bg: string }> = {
  generale: { label: 'Avviso', icon: Megaphone, bg: 'var(--secondary)' },
  evento: { label: 'Evento', icon: CalendarDays, bg: '#023b52' },
  chiusura: { label: 'Chiusura', icon: CalendarX, bg: '#02283a' },
  importante: { label: 'Importante', icon: TriangleAlert, bg: '#056c94' },
};

export function avvisoTipoUi(tipo: string | null | undefined) {
  return AVVISO_TIPO_UI[(tipo as AvvisoTipo) ?? 'generale'] ?? AVVISO_TIPO_UI.generale;
}

/** Data di oggi (YYYY-MM-DD) nel fuso dell'accademia. */
export function oggiRoma() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' });
}

export function formatDataAvviso(value: string) {
  return new Date(value).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
