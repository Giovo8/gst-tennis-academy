import { signupSchema } from '@/lib/validation/schemas';
import { normalizePhone, resolvePhoneUpdate } from '@/lib/utils/phone';

const body = {
  email: 'mario@esempio.it',
  password: 'Password1!',
  fullName: 'Mario Rossi',
  role: 'atleta',
  inviteCode: 'ABC123',
};

function phoneErrors(input: unknown): string[] {
  const res = signupSchema.safeParse(input);
  return res.success ? [] : res.error.issues.map((i) => i.message);
}

describe('normalizePhone', () => {
  it.each([
    ['+39 123 456 7890', '+391234567890'],
    ['0039 347 1234567', '+393471234567'],
    ['347 123 4567', '3471234567'],
    ['(347) 123-4567', '3471234567'],
    [' 3471234567 ', '3471234567'],
  ])('accetta "%s"', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each(['', '   ', '12345', '347123456a', '1234567890123456', '347+1234567'])(
    'rifiuta "%s"',
    (input) => {
      expect(normalizePhone(input)).toBeNull();
    },
  );
});

describe('resolvePhoneUpdate', () => {
  it('non permette di togliere un numero già presente', () => {
    expect(resolvePhoneUpdate(' ', '3471234567').error).toBe('Telefono obbligatorio');
  });

  it.each([null, undefined, '', ' '])('accetta il vuoto per chi non ha un numero (%p)', (saved) => {
    expect(resolvePhoneUpdate('', saved)).toEqual({ phone: null, error: null });
  });

  it("lascia com'è un vecchio numero non modificato", () => {
    expect(resolvePhoneUpdate('06 12345', '06 12345')).toEqual({ phone: '06 12345', error: null });
  });

  it('normalizza un numero nuovo e rifiuta quello non valido', () => {
    expect(resolvePhoneUpdate('+39 347 123 4567', null)).toEqual({
      phone: '+393471234567',
      error: null,
    });
    expect(resolvePhoneUpdate('123', '3471234567').error).toBe('Telefono non valido');
  });
});

describe('signupSchema: telefono obbligatorio', () => {
  it.each([undefined, null, '', '   '])('rifiuta il telefono mancante (%p)', (phone) => {
    expect(phoneErrors({ ...body, phone })).toEqual(['Numero di telefono obbligatorio']);
  });

  it('rifiuta un body senza il campo phone', () => {
    expect(phoneErrors(body)).toEqual(['Numero di telefono obbligatorio']);
  });

  it('rifiuta un numero non valido', () => {
    expect(phoneErrors({ ...body, phone: '123' })).toEqual(['Numero di telefono non valido']);
  });

  it('restituisce il numero normalizzato', () => {
    expect(signupSchema.parse({ ...body, phone: '+39 347 123 4567' }).phone).toBe('+393471234567');
  });
});
