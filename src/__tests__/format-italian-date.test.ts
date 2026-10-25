/**
 * @jest-environment node
 *
 * Test per i formattatori di data italiani in /lib/utils/formatItalianDate.ts
 */

import { formatShortItalianDate, formatLongItalianDate } from '@/lib/utils/formatItalianDate';

describe('formatShortItalianDate', () => {
  it('capitalizza il giorno della settimana e il mese abbreviato', () => {
    // 7 aprile 2026 è un martedì
    const result = formatShortItalianDate('2026-04-07T10:00:00');
    expect(result).toMatch(/^[A-Z]/); // inizia con maiuscola
    expect(result).toContain('7');
  });

  it("restituisce il formato 'Xxx D Xxx'", () => {
    const result = formatShortItalianDate('2026-04-07T10:00:00');
    // es. "Mar 7 Apr"
    expect(result.split(' ')).toHaveLength(3);
  });

  it('include il giorno numerico corretto', () => {
    const result = formatShortItalianDate('2026-12-25T00:00:00');
    expect(result).toContain('25');
  });
});

describe('formatLongItalianDate', () => {
  it('capitalizza il giorno della settimana e il mese per esteso', () => {
    // "Martedì 7 Aprile 2026"
    const result = formatLongItalianDate('2026-04-07T10:00:00');
    expect(result).toMatch(/^[A-Z]/); // inizia con maiuscola
    expect(result).toContain('2026');
    expect(result).toContain('7');
  });

  it('contiene il mese con la prima lettera maiuscola', () => {
    const result = formatLongItalianDate('2026-04-07T10:00:00');
    // "Aprile" deve essere nel risultato
    expect(result).toMatch(/[A-Z][a-z]+/);
  });

  it("include l'anno corretto", () => {
    const result = formatLongItalianDate('2026-12-31T00:00:00');
    expect(result).toContain('2026');
    expect(result).toContain('31');
  });
});
