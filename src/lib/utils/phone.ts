import { VALIDATION_RULES } from '@/lib/constants/app';

/**
 * Numero di telefono senza spazi e separatori ("+39 347 123 4567" → "+393471234567",
 * il prefisso "00" diventa "+"). `null` se il numero non è valido.
 */
export function normalizePhone(value: string): string | null {
  const trimmed = value.trim();
  if (!/^\+?[\d\s().\/-]+$/.test(trimmed)) return null;

  const compact = trimmed.replace(/[^\d+]/g, '').replace(/^00/, '+');
  const digits = compact.replace('+', '').length;
  if (digits < VALIDATION_RULES.PHONE_MIN_LENGTH || digits > VALIDATION_RULES.PHONE_MAX_LENGTH) {
    return null;
  }
  return compact;
}

/**
 * Telefono da salvare nella modifica di un profilo. Un numero già presente si può
 * cambiare ma non togliere; chi non l'ha mai indicato può lasciarlo vuoto. Un
 * numero non modificato resta com'è, anche se scritto in un vecchio formato.
 */
export function resolvePhoneUpdate(
  value: string,
  savedPhone: string | null | undefined,
): { phone: string | null; error: string | null } {
  const trimmed = value.trim();
  const saved = savedPhone?.trim() || null;

  if (!trimmed) return { phone: null, error: saved ? 'Telefono obbligatorio' : null };
  if (trimmed === saved) return { phone: saved, error: null };

  const phone = normalizePhone(trimmed);
  return { phone, error: phone ? null : 'Telefono non valido' };
}
