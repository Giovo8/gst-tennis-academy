-- Migration: Aggiunge tariffa oraria configurabile per campo
-- Description: Colonna hourly_rate su courts_settings, usata dalla sezione Contabilità
--              per calcolare i ricavi virtuali delle prenotazioni (tariffa × durata).
-- Date: 2026-07-14

ALTER TABLE courts_settings
  ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(10,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN courts_settings.hourly_rate IS
  'Tariffa oraria del campo in EUR, usata per calcolare i ricavi virtuali delle prenotazioni';
