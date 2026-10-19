import { toast } from 'sonner';
import logger from '@/lib/logger/secure-logger';

/**
 * Helper per i toast di errore.
 *
 * Regole dei testi (vedi anche AppToaster): brevi (2-4 parole), niente description,
 * niente "con successo", niente prefisso "Errore:".
 *
 * Il messaggio restituito da API/Supabase viene mostrato solo se è già breve e
 * in italiano (es. "Slot già prenotato"); altrimenti si usa il testo di riserva
 * e il dettaglio finisce nel logger.
 */

export const SESSION_EXPIRED = 'Sessione scaduta, accedi di nuovo';

// Messaggi inglesi noti restituiti dalle API → testo breve in italiano
const KNOWN: Record<string, string> = {
  'tournament is full': 'Torneo al completo',
  'tournament not found': 'Torneo non trovato',
  unauthorized: SESSION_EXPIRED,
  'non autorizzato': SESSION_EXPIRED,
  forbidden: 'Operazione non consentita',
  'failed to fetch': 'Connessione assente',
  'load failed': 'Connessione assente',
  'networkerror when attempting to fetch resource.': 'Connessione assente',
};

const TECHNICAL =
  /\b(error|failed|forbidden|unauthorized|not found|missing|invalid|violates|duplicate|null|undefined|fetch|network|column|relation|constraint|row-level|policy|jwt|token|schema|function|syntax|status|code)\b|[{}[\]_]|https?:/i;

function rawMessage(err: unknown): string {
  if (!err) return '';
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message;
  if (typeof err === 'object') {
    const obj = err as { error?: unknown; message?: unknown };
    if (typeof obj.error === 'string') return obj.error;
    if (typeof obj.message === 'string') return obj.message;
  }
  return '';
}

/** Testo da mostrare all'utente per un errore, con fallback se il messaggio non è adatto. */
export function errorText(err: unknown, fallback: string): string {
  const msg = rawMessage(err).trim();
  if (!msg) return fallback;

  const known = KNOWN[msg.toLowerCase()];
  if (known) return known;

  if (msg.length > 60 || msg.includes('\n') || TECHNICAL.test(msg) || /^errore\b/i.test(msg)) {
    return fallback;
  }
  return msg.replace(/[.!]+$/, '');
}

/** Mostra un toast di errore breve; il dettaglio tecnico va nel logger. */
export function toastError(err: unknown, fallback: string): void {
  const text = errorText(err, fallback);
  if (text === fallback && err) logger.warn(fallback, { detail: rawMessage(err) });
  toast.error(text);
}
