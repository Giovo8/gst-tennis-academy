import {
  createFeedbackRispostaSchema,
  createFeedbackSchema,
  updateFeedbackSchema,
} from '@/lib/validation/schemas';

describe('createFeedbackSchema', () => {
  it('accetta categoria valida e messaggio, rimuovendo gli spazi ai bordi', () => {
    const res = createFeedbackSchema.safeParse({
      categoria: 'suggerimento',
      titolo: 'Titolo valido',
      messaggio: '  Aggiungete il tema scuro  ',
    });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.messaggio).toBe('Aggiungete il tema scuro');
  });

  it('rifiuta messaggi troppo corti o troppo lunghi', () => {
    expect(
      createFeedbackSchema.safeParse({
        categoria: 'altro',
        titolo: 'Titolo valido',
        messaggio: '  ok ',
      }).success,
    ).toBe(false);
    expect(
      createFeedbackSchema.safeParse({
        categoria: 'altro',
        titolo: 'Titolo valido',
        messaggio: 'a'.repeat(2001),
      }).success,
    ).toBe(false);
  });

  it('rifiuta categorie non previste', () => {
    expect(
      createFeedbackSchema.safeParse({
        categoria: 'spam',
        titolo: 'Titolo valido',
        messaggio: 'messaggio valido',
      }).success,
    ).toBe(false);
  });
});

describe('createFeedbackSchema titolo', () => {
  it('richiede un titolo di 3-100 caratteri', () => {
    const base = { categoria: 'altro', messaggio: 'messaggio valido' };
    expect(createFeedbackSchema.safeParse(base).success).toBe(false);
    expect(createFeedbackSchema.safeParse({ ...base, titolo: 'ab' }).success).toBe(false);
    expect(createFeedbackSchema.safeParse({ ...base, titolo: 'a'.repeat(101) }).success).toBe(
      false,
    );
    expect(createFeedbackSchema.safeParse({ ...base, titolo: 'Tema scuro' }).success).toBe(true);
  });
});

describe('updateFeedbackSchema', () => {
  it('accetta solo gli stati previsti', () => {
    expect(updateFeedbackSchema.safeParse({ stato: 'archiviato' }).success).toBe(true);
    expect(updateFeedbackSchema.safeParse({ stato: 'cancellato' }).success).toBe(false);
  });
});

describe('createFeedbackRispostaSchema', () => {
  it('rifiuta risposte vuote o troppo lunghe', () => {
    expect(createFeedbackRispostaSchema.safeParse({ messaggio: '   ' }).success).toBe(false);
    expect(createFeedbackRispostaSchema.safeParse({ messaggio: 'a'.repeat(2001) }).success).toBe(
      false,
    );
    expect(createFeedbackRispostaSchema.safeParse({ messaggio: 'Grazie!' }).success).toBe(true);
  });
});
