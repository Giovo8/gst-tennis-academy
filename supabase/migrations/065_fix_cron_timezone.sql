-- Fix: usa CRON_TZ=Europe/Rome per gestire correttamente l'ora legale italiana.
-- In precedenza si sottraeva sempre 1 ora (UTC+1 invernale), causando lo
-- sfasamento di 1 ora durante l'ora estiva (CEST = UTC+2).
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
