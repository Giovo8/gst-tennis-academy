-- Modulo AI News Generator
-- Aggiunge campi compatibili con la tabella news esistente e crea le tabelle di configurazione.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

ALTER TABLE public.news
  ADD COLUMN IF NOT EXISTS stato text,
  ADD COLUMN IF NOT EXISTS ai_generated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fonte_url text,
  ADD COLUMN IF NOT EXISTS fonte_nome text;

-- Backfill stato in base alla logica preesistente su is_published.
UPDATE public.news
SET stato = CASE WHEN is_published THEN 'pubblicata' ELSE 'bozza' END
WHERE stato IS NULL;

ALTER TABLE public.news
  ALTER COLUMN stato SET DEFAULT 'bozza';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'news_stato_check'
  ) THEN
    ALTER TABLE public.news
      ADD CONSTRAINT news_stato_check
      CHECK (stato IN ('bozza', 'pubblicata', 'scartata'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS news_stato_idx ON public.news (stato);
CREATE INDEX IF NOT EXISTS news_ai_generated_idx ON public.news (ai_generated);
CREATE INDEX IF NOT EXISTS news_fonte_url_idx ON public.news (fonte_url);

CREATE TABLE IF NOT EXISTS public.ai_news_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pubblicazione_auto boolean NOT NULL DEFAULT false,
  aggiornato_a timestamptz NOT NULL DEFAULT now(),
  aggiornato_da uuid REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.ai_news_fonti (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  url text NOT NULL UNIQUE,
  attiva boolean NOT NULL DEFAULT true,
  categoria text,
  creato_a timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_news_cron (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  ora integer NOT NULL CHECK (ora >= 0 AND ora <= 23),
  minuto integer NOT NULL DEFAULT 0 CHECK (minuto IN (0, 15, 30, 45)),
  categoria text,
  prompt_custom text,
  attivo boolean NOT NULL DEFAULT true,
  ultimo_eseguito timestamptz,
  creato_a timestamptz NOT NULL DEFAULT now()
);

-- Log esecuzioni per la sezione "Ultime generazioni".
CREATE TABLE IF NOT EXISTS public.ai_news_generation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  eseguito_a timestamptz NOT NULL DEFAULT now(),
  tipo text NOT NULL CHECK (tipo IN ('manuale', 'cron')),
  cron_id uuid REFERENCES public.ai_news_cron(id) ON DELETE SET NULL,
  generate integer NOT NULL DEFAULT 0,
  skippate integer NOT NULL DEFAULT 0,
  errori jsonb NOT NULL DEFAULT '[]'::jsonb
);

ALTER TABLE public.ai_news_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_news_fonti ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_news_cron ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_news_generation_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'ai_news_config' AND policyname = 'Admin gestore can manage ai_news_config'
  ) THEN
    CREATE POLICY "Admin gestore can manage ai_news_config"
      ON public.ai_news_config
      FOR ALL
      USING (public.get_my_role() IN ('admin', 'gestore'))
      WITH CHECK (public.get_my_role() IN ('admin', 'gestore'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'ai_news_fonti' AND policyname = 'Admin gestore can manage ai_news_fonti'
  ) THEN
    CREATE POLICY "Admin gestore can manage ai_news_fonti"
      ON public.ai_news_fonti
      FOR ALL
      USING (public.get_my_role() IN ('admin', 'gestore'))
      WITH CHECK (public.get_my_role() IN ('admin', 'gestore'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'ai_news_cron' AND policyname = 'Admin gestore can manage ai_news_cron'
  ) THEN
    CREATE POLICY "Admin gestore can manage ai_news_cron"
      ON public.ai_news_cron
      FOR ALL
      USING (public.get_my_role() IN ('admin', 'gestore'))
      WITH CHECK (public.get_my_role() IN ('admin', 'gestore'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'ai_news_generation_logs' AND policyname = 'Admin gestore can read ai_news_generation_logs'
  ) THEN
    CREATE POLICY "Admin gestore can read ai_news_generation_logs"
      ON public.ai_news_generation_logs
      FOR SELECT
      USING (public.get_my_role() IN ('admin', 'gestore'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'ai_news_generation_logs' AND policyname = 'Service role can insert ai_news_generation_logs'
  ) THEN
    CREATE POLICY "Service role can insert ai_news_generation_logs"
      ON public.ai_news_generation_logs
      FOR INSERT
      WITH CHECK (public.get_my_role() IN ('admin', 'gestore'));
  END IF;
END $$;

-- Fonti predefinite non eliminabili via API (blocco applicativo).
INSERT INTO public.ai_news_fonti (nome, url, categoria, attiva)
VALUES
  ('Gazzetta dello Sport', 'https://www.gazzetta.it/rss/tennis.xml', 'tornei', true),
  ('ATP Tour', 'https://www.atptour.com/en/media/rss-feed/xml-feed', 'tornei', true),
  ('Ubitennis', 'https://www.ubitennis.com/feed/', 'generale', true)
ON CONFLICT (url) DO NOTHING;

-- Crea la riga di configurazione base se assente.
INSERT INTO public.ai_news_config (pubblicazione_auto)
SELECT false
WHERE NOT EXISTS (SELECT 1 FROM public.ai_news_config);

-- Sincronizzazione singolo cron con pg_cron.
CREATE OR REPLACE FUNCTION public.ai_news_sync_cron_job(
  p_cron_id uuid,
  p_attivo boolean,
  p_ora integer,
  p_minuto integer,
  p_supabase_url text,
  p_service_key text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job_name text;
  v_offset   integer;
  v_ora_utc  integer;
  v_schedule text;
  v_sql text;
BEGIN
  v_job_name := 'ai-news-' || p_cron_id::text;

  BEGIN
    PERFORM cron.unschedule(v_job_name);
  EXCEPTION WHEN OTHERS THEN
    -- Se non esiste, ignoriamo.
    NULL;
  END;

  IF NOT p_attivo THEN
    RETURN;
  END IF;

  -- Calcola l'offset UTC corrente di Rome (es. +2 in estate, +1 in inverno).
  v_offset  := ROUND(
    EXTRACT(EPOCH FROM (
      now() AT TIME ZONE 'Europe/Rome' - now() AT TIME ZONE 'UTC'
    )) / 3600
  )::integer;
  v_ora_utc := ((p_ora - v_offset) + 24) % 24;
  v_schedule := format('%s %s * * *', p_minuto, v_ora_utc);

  v_sql := format(
    'SELECT net.http_post(
      url := %L,
      headers := %L::jsonb,
      body := %L::jsonb
    )',
    p_supabase_url || '/functions/v1/genera-news',
    '{"Authorization": "Bearer ' || p_service_key || '", "Content-Type": "application/json"}',
    '{"cron_id": "' || p_cron_id::text || '"}'
  );

  PERFORM cron.schedule(v_job_name, v_schedule, v_sql);
END;
$$;

GRANT EXECUTE ON FUNCTION public.ai_news_sync_cron_job(uuid, boolean, integer, integer, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ai_news_sync_cron_job(uuid, boolean, integer, integer, text, text) TO service_role;
