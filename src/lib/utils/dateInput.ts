/** Date in formato `aaaa-mm-gg` (quello degli input data), sempre nel fuso locale. */

export function parseDateInput(value: string): Date | null {
  if (!value) return null;
  // Solo la parte di data: accetta anche un timestamp ISO completo.
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return null;
  // Mezzogiorno: evita che un cambio d'ora sposti la data al giorno prima.
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function toInputDateValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Etichetta `gg/mm/aaaa` per il pulsante che apre il calendario. */
export function formatDateInputLabel(value: string): string {
  const date = parseDateInput(value);
  if (!date) return 'gg/mm/aaaa';
  return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
