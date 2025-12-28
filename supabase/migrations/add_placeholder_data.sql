-- ==========================================
-- PLACEHOLDER DATA FOR GST TENNIS ACADEMY
-- Dati di esempio per popolamento iniziale
-- ==========================================

-- Verifica e adatta schema se necessario (compatibilità con diverse versioni)
DO $$ 
BEGIN
  -- Rinomina starts_at se esiste start_date (retrocompatibilità)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tournaments' AND column_name='start_date') THEN
    ALTER TABLE tournaments RENAME COLUMN start_date TO starts_at;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tournaments' AND column_name='end_date') THEN
    ALTER TABLE tournaments RENAME COLUMN ends_at TO ends_at;
  END IF;
END $$;

-- Inserisci tornei di esempio (solo se non esistono già)
INSERT INTO public.tournaments (title, description, starts_at, ends_at, max_participants, competition_type, format, match_format, surface_type, category, status)
SELECT * FROM (VALUES
  ('Torneo Primavera 2026', 'Torneo Open maschile e femminile su terra battuta. Tutti i livelli benvenuti.', '2026-04-15 09:00:00+00', '2026-04-20 18:00:00+00', 16, 'torneo', 'eliminazione_diretta', 'best_of_3', 'terra', 'Open', 'Aperto'),
  ('Campionato Interno Estate', 'Campionato round-robin per atleti del club. Tutti giocano contro tutti.', '2026-06-01 10:00:00+00', '2026-07-31 20:00:00+00', 12, 'campionato', 'round_robin', 'best_of_3', 'cemento', 'Club', 'Aperto'),
  ('Torneo Under 16', 'Competizione riservata agli atleti Under 16 del circuito giovanile FITP.', '2026-05-10 08:00:00+00', '2026-05-12 19:00:00+00', 8, 'torneo', 'eliminazione_diretta', 'best_of_3', 'sintetico', 'U16', 'Aperto'),
  ('Torneo Autunnale 2025', 'Torneo concluso - vincitore: Marco Rossi', '2025-10-01 09:00:00+00', '2025-10-07 18:00:00+00', 32, 'torneo', 'girone_eliminazione', 'best_of_3', 'terra', 'Open', 'Concluso')
) AS v(title, description, starts_at, ends_at, max_participants, competition_type, format, match_format, surface_type, category, status)
WHERE NOT EXISTS (
  SELECT 1 FROM public.tournaments WHERE title = v.title
);

-- Inserisci news di esempio (solo se non esistono già)
INSERT INTO public.news (title, date, category, summary, content, published, image_url)
SELECT * FROM (VALUES
  ('Nuovo Campo Indoor Inaugurato', '2026-01-15', 'Struttura', 'Inaugurato il nuovo campo coperto con superficie in resina omologata ITF.', 
   'Siamo orgogliosi di annunciare l''apertura del nostro nuovo campo indoor all''avanguardia. La superficie in resina omologata ITF garantisce prestazioni ottimali tutto l''anno, indipendentemente dalle condizioni meteorologiche. Il campo è dotato di illuminazione professionale LED e sistema di ventilazione avanzato.', 
   true, null),
  ('Clinic con Ex Pro ATP a Marzo', 'Clinic Pro', '2026-03-05', 'Eventi', 'Sessione esclusiva con coach professionista ATP: tecnica avanzata e tattica di match.',
   'Non perdere l''opportunità unica di partecipare alla nostra clinic primaverile con un coach professionista del circuito ATP. Durante le tre giornate intensive lavorerete su: footwork avanzato, costruzione del punto, gestione dei momenti chiave, e mental coaching. Posti limitati a 12 partecipanti. Iscrizioni aperte dal 1° febbraio.',
   true, null),
  ('Risultati Torneo Invernale', '2026-01-20', 'Tornei FITP', 'Grande successo per il torneo invernale con oltre 40 partecipanti.',
   'Si è concluso con grande partecipazione il Torneo Invernale GST Tennis Academy. Complimenti a tutti i partecipanti per il livello tecnico e lo spirito sportivo dimostrato. Primo classificato: Andrea Bianchi. Secondo: Laura Verdi. Terzo: Marco Neri. Appuntamento al prossimo torneo primaverile!',
   true, null),
  ('Nuovi Orari Segreteria', '2026-01-10', 'Comunicazioni', 'Da febbraio la segreteria sarà aperta anche la domenica mattina.',
   'Per venire incontro alle esigenze dei nostri atleti, a partire da febbraio 2026 la segreteria del circolo sarà aperta anche la domenica dalle 9:00 alle 13:00. Potrete effettuare iscrizioni, prenotazioni e richiedere informazioni anche nel weekend. Gli altri orari rimangono invariati: Lun-Ven 8:00-20:00, Sab 8:00-18:00.',
   true, null)
) AS v(title, date, category, summary, content, published, image_url)
WHERE NOT EXISTS (
  SELECT 1 FROM public.news WHERE title = v.title
);

-- Inserisci staff di esempio (solo se non ci sono già membri)
INSERT INTO public.staff (full_name, role, bio, active, order_index, image_url)
SELECT * FROM (VALUES
  ('Giulia Serra', 'Head Coach FITP 3° grado', 'Specialista in tecnica e costruzione pattern di gioco. 15 anni di esperienza nel settore giovanile agonistico.', true, 1, null),
  ('Luca Bernardi', 'Preparatore Atletico', 'Laureato in Scienze Motorie, specializzato in condizionamento fisico per tennisti. Certificazione Functional Training.', true, 2, null),
  ('Marta Riva', 'Mental Coach', 'Psicologa dello sport. Gestione della pressione agonistica, routine pre-gara e focus in match. Collabora con atleti professionisti.', true, 3, null),
  ('Alessandro Conti', 'Maestro FITP 2° grado', 'Esperto in didattica per principianti e intermedi. Specializzato in mini-tennis e scuola tennis per bambini 5-10 anni.', true, 4, null)
) AS v(full_name, role, bio, active, order_index, image_url)
WHERE NOT EXISTS (
  SELECT 1 FROM public.staff
);

-- Inserisci programmi di esempio (solo se non esistono già)
INSERT INTO public.programs (title, focus, points, active, order_index)
SELECT * FROM (VALUES
  ('Junior Academy', 'U10 - U16 | Tecnica & coordinazione', 
   '["Gruppi per età e livello con progressioni mirate","Match play guidato e tornei federali","Report trimestrale con video analysis"]'::jsonb, 
   true, 1),
  ('Agonisti', 'Ranking, circuito FITP & ITF', 
   '["Pianificazione tornei e periodizzazione","Strength & conditioning con test mensili","Mental coaching e gestione pressione"]'::jsonb, 
   true, 2),
  ('Adulti & Club', 'Livelli 3.0 - 5.0 | Performance e divertimento', 
   '["Lesson pack individuali e small group","Video analisi per colpi chiave e pattern","Clinic weekend e sparring dedicato"]'::jsonb, 
   true, 3)
) AS v(title, focus, points, active, order_index)
WHERE NOT EXISTS (
  SELECT 1 FROM public.programs WHERE title = v.title
);

-- Conferma inserimento
DO $$
BEGIN
  RAISE NOTICE 'Placeholder data inseriti con successo!';
  RAISE NOTICE 'Tornei: %', (SELECT COUNT(*) FROM public.tournaments);
  RAISE NOTICE 'News: %', (SELECT COUNT(*) FROM public.news);
  RAISE NOTICE 'Staff: %', (SELECT COUNT(*) FROM public.staff);
  RAISE NOTICE 'Programmi: %', (SELECT COUNT(*) FROM public.programs);
END $$;
