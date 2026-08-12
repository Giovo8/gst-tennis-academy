-- =============================================================================
-- 082_security_events.sql
-- Registro degli eventi di sicurezza (tentativi di accesso negati, blocchi CSRF,
-- rate limit superati) consultabile da /dashboard/admin/platform-logs.
--
-- Perché non loggare tutte le richieste: i piani free di Vercel mostrano solo
-- l'ultima ora di log, ma scrivere una riga per ogni chiamata su un DB Supabase
-- free (500 MB) trasformerebbe un attacco volumetrico in un secondo problema di
-- quota. Qui finiscono solo le anomalie, che in condizioni normali sono poche
-- decine di righe al giorno.
--
-- Nota: le richieste a /_next/image NON passano da qui (il matcher in
-- src/middleware.ts le esclude), quindi l'abuso dell'endpoint di ottimizzazione
-- immagini non è osservabile da questa tabella: va filtrato a monte nel Firewall.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Categoria dell'evento, es. 'auth.token_mancante', 'csrf.origin_rifiutata'.
  tipo TEXT NOT NULL,
  severita TEXT NOT NULL DEFAULT 'warning'
    CHECK (severita IN ('info', 'warning', 'critical')),
  path TEXT,
  method TEXT,
  status_code INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  -- Valorizzato solo quando l'utente era identificabile (es. ruolo insufficiente).
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  dettagli JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- La pagina admin ordina per data decrescente e filtra per tipo; il raggruppamento
-- per IP serve a riconoscere un singolo aggressore che martella più endpoint.
CREATE INDEX IF NOT EXISTS idx_security_events_created_at
  ON public.security_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_tipo
  ON public.security_events (tipo, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_ip
  ON public.security_events (ip_address, created_at DESC);

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'security_events'
      AND policyname = 'Admin gestore can read security_events'
  ) THEN
    CREATE POLICY "Admin gestore can read security_events"
      ON public.security_events
      FOR SELECT
      USING (public.get_my_role() IN ('admin', 'gestore'));
  END IF;
END $$;

-- Nessuna policy di INSERT: le scritture arrivano esclusivamente dal server con
-- la service role key, che bypassa la RLS. Un client autenticato non deve poter
-- inquinare il registro con eventi falsi.

-- =============================================================================
-- Retention: 90 giorni
-- =============================================================================

CREATE OR REPLACE FUNCTION public.purge_security_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.security_events
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;

-- pg_cron è già in uso nel progetto per i cron delle AI news (vedi 063).
-- Rischedulare è idempotente: prima si rimuove l'eventuale job omonimo.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-security-events') THEN
      PERFORM cron.unschedule('purge-security-events');
    END IF;

    -- Ogni notte alle 03:30 UTC, fuori dalle fasce di generazione news.
    PERFORM cron.schedule(
      'purge-security-events',
      '30 3 * * *',
      'SELECT public.purge_security_events();'
    );
  END IF;
END $$;

COMMENT ON TABLE public.security_events IS
  'Anomalie di sicurezza (401/403/429/CSRF). Retention 90 giorni via pg_cron.';
