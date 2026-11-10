/** Helper di presentazione delle news, condivisi da sito pubblico e dashboard. */

/** Una news è visibile se `is_published` è true (o, sulle righe legacy, `stato = 'pubblicata'`). */
export function isPublishedNews(
  item: { is_published?: boolean | null; stato?: string | null } | null | undefined,
): boolean {
  if (!item) return false;
  if (typeof item.is_published === 'boolean') return item.is_published;
  return String(item.stato ?? '').toLowerCase() === 'pubblicata';
}

/** Toglie i puntini di sospensione finali lasciati dai titoli troncati delle vecchie news. */
export function normalizeLegacyTitle(title: string): string {
  return title.replace(/\s*\.\.\.$/, '').trim();
}

/** Data della news con giorno e mese in maiuscolo, es. "Lun 03 Mar 2026". */
export function formatNewsDate(dateString: string | undefined): string {
  if (!dateString) return '';
  const formatted = new Intl.DateTimeFormat('it-IT', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateString));
  return formatted.replace(/\b([a-zàáèéìíòóùú])/g, (c) => c.toUpperCase());
}
