import { Flag, GraduationCap, Shield, Wrench, type LucideIcon } from 'lucide-react';

const TYPE_BACKGROUNDS: Record<string, string> = {
  'Corso Adulti': '#023047',
  'Corsi Tennis': '#05384c',
  Manutenzione: 'var(--color-frozen-lake-900)',
  Evento: 'var(--color-frozen-lake-900)',
  Altro: 'var(--secondary)',
};

/** Tipo, icona e colore della card di un blocco campo, ricavati dal testo di `reason`. */
export function getBlockStyle(reason?: string): {
  type: string;
  icon: LucideIcon;
  background: string;
} {
  const reasonText = (reason || '').trim();
  const reasonLower = reasonText.toLowerCase();

  let type = reasonText ? 'Altro' : 'Blocco';
  let icon: LucideIcon = Shield;

  if (reasonLower.includes('corso adulti')) {
    type = 'Corso Adulti';
    icon = GraduationCap;
  } else if (reasonLower.includes('corsi') || reasonLower.includes('tennis')) {
    type = 'Corsi Tennis';
    icon = GraduationCap;
  } else if (reasonLower.includes('manutenzione')) {
    type = 'Manutenzione';
    icon = Wrench;
  } else if (reasonLower.includes('evento')) {
    type = 'Evento';
    icon = Flag;
  }

  return { type, icon, background: TYPE_BACKGROUNDS[type] ?? 'var(--color-frozen-lake-800)' };
}

/** Titolo da mostrare per un blocco: il motivo, senza il prefisso generico "Altro". */
export function getBlockTitle(reason?: string): string {
  const text = (reason || '').trim();
  if (!text) return 'Blocco campo';

  const altroWithParens = text.match(/^Altro\s*\(([^)]+)\)(?:\s*-\s*(.+))?$/i);
  if (altroWithParens) {
    const custom = (altroWithParens[1] || '').trim();
    const notes = (altroWithParens[2] || '').trim();
    if (custom && notes) return `${custom} - ${notes}`;
    return custom || notes || 'Altro';
  }

  const altroSimple = text.match(/^Altro\s*-\s*(.+)$/i);
  if (altroSimple) {
    return (altroSimple[1] || '').trim() || 'Altro';
  }

  return text;
}
