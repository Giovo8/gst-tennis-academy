-- Migration: add_tornei_to_homepage_sections.sql
-- Aggiunge la sezione "tornei" alla tabella homepage_sections

INSERT INTO public.homepage_sections (section_key, order_index, active)
VALUES ('tornei', 2, true);

-- Verifica che la sezione sia attiva e ordinata correttamente
SELECT * FROM public.homepage_sections WHERE section_key = 'tornei';