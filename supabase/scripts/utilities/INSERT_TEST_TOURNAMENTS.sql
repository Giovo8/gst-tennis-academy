-- Inserisci alcuni tornei di test per verificare la visualizzazione
-- Esegui questo script nella console SQL di Supabase

INSERT INTO public.tournaments (
  title,
  description,
  starts_at,
  ends_at,
  category,
  level,
  max_participants,
  status,
  format,
  match_format,
  surface_type,
  entry_fee,
  prize_money
) VALUES
(
  'Torneo Primaverile 2026',
  'Torneo singolare maschile e femminile aperto a tutti i livelli. Finale in programma domenica.',
  '2026-02-15 09:00:00+00',
  '2026-02-16 18:00:00+00',
  'Singolare',
  'intermedio',
  32,
  'Aperto',
  'eliminazione_diretta',
  'best_of_3',
  'terra',
  25.00,
  500.00
),
(
  'Campionato Sociale 2026',
  'Campionato riservato ai soci del circolo. Sistema a gironi seguito da fase eliminatoria.',
  '2026-03-01 09:00:00+00',
  '2026-03-31 18:00:00+00',
  'Singolare',
  'agonistico',
  16,
  'Aperto',
  'girone_ed_eliminazione',
  'best_of_3',
  'terra',
  30.00,
  1000.00
),
(
  'Torneo Doppio Misto',
  'Torneo di doppio misto. Iscrizioni a coppie.',
  '2026-02-22 10:00:00+00',
  '2026-02-23 17:00:00+00',
  'Doppio',
  'principiante',
  16,
  'Aperto',
  'eliminazione_diretta',
  'best_of_1',
  'cemento',
  40.00,
  300.00
),
(
  'Torneo Under 18',
  'Torneo riservato agli Under 18. Categoria giovanile.',
  '2026-04-05 09:00:00+00',
  '2026-04-06 18:00:00+00',
  'Singolare',
  'principiante',
  24,
  'Aperto',
  'eliminazione_diretta',
  'best_of_3',
  'terra',
  15.00,
  200.00
),
(
  'Torneo Veterani',
  'Torneo riservato agli over 45. Atmosfera amichevole e competitiva.',
  '2026-05-10 10:00:00+00',
  '2026-05-11 17:00:00+00',
  'Singolare',
  'avanzato',
  20,
  'In Corso',
  'eliminazione_diretta',
  'best_of_3',
  'erba',
  20.00,
  400.00
);

-- Verifica l'inserimento
SELECT id, title, status, starts_at, max_participants 
FROM public.tournaments 
ORDER BY starts_at;
