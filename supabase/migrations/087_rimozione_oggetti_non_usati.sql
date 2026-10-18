-- =============================================================================
-- 087 — Rimozione oggetti DB non più usati dall'applicazione
-- =============================================================================
-- Allinea un database esistente (produzione) a supabase/schema.sql, che dalla
-- compattazione dell'ottobre 2026 NON contiene più questi oggetti.
--
-- ⚠️ DISTRUTTIVA: elimina tabelle e colonne con gli eventuali dati contenuti.
--    1. Fare un backup (Dashboard → Database → Backups, oppure pg_dump).
--    2. Verificare che le tabelle siano davvero inutilizzate/vuote, ad es.:
--         select 'orders', count(*) from public.orders union all
--         select 'email_campaigns', count(*) from public.email_campaigns;
--    3. Eseguire nel SQL Editor. Tutto è idempotente (IF EXISTS).
--
-- Criterio: nessun riferimento in src/ né in supabase/functions/ (query,
-- RPC, canali realtime, storage) al momento della compattazione.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Trigger su tabelle che restano
-- -----------------------------------------------------------------------------
-- Statistiche atleta da tornei (tabella athlete_stats mai letta dall'app)
DROP TRIGGER IF EXISTS trigger_sync_athlete_stats ON public.tournament_participants;
-- Prezzo applicato alle prenotazioni (modulo Contabilità rimosso)
DROP TRIGGER IF EXISTS trg_set_booking_prezzo_applicato ON public.bookings;

-- -----------------------------------------------------------------------------
-- 2. Colonne del modulo Contabilità (rimosso dal codice)
-- -----------------------------------------------------------------------------
ALTER TABLE public.bookings DROP COLUMN IF EXISTS prezzo_applicato;
ALTER TABLE public.courts_settings DROP COLUMN IF EXISTS hourly_rate;

-- -----------------------------------------------------------------------------
-- 3. Tabelle non usate
-- -----------------------------------------------------------------------------
-- Contabilità / listino prezzi
DROP TABLE IF EXISTS public.listino_prezzi CASCADE;
DROP TABLE IF EXISTS public.soglie_orario_notturno CASCADE;
-- Vecchio e-commerce / abbonamenti
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.subscription_credits CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.event_registrations CASCADE;
-- Vecchio sistema chat (sostituito da conversations/messages e chat_groups)
DROP TABLE IF EXISTS public.chat_room_members CASCADE;
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.chat_rooms CASCADE;
-- Email marketing mai implementato lato app (restano email_logs / email_log)
DROP TABLE IF EXISTS public.email_campaigns CASCADE;
DROP TABLE IF EXISTS public.email_templates CASCADE;
DROP TABLE IF EXISTS public.email_settings CASCADE;
DROP TABLE IF EXISTS public.email_unsubscribes CASCADE;
-- Varie
DROP TABLE IF EXISTS public.announcement_views CASCADE;
DROP TABLE IF EXISTS public.athlete_stats CASCADE;
DROP TABLE IF EXISTS public.daily_notes CASCADE;
DROP TABLE IF EXISTS public.promo_banner_settings CASCADE;
DROP TABLE IF EXISTS public.system_settings CASCADE;
-- Residui degli script di setup iniziali (dicembre 2025), se presenti
DROP TABLE IF EXISTS public.hero_content CASCADE;
DROP TABLE IF EXISTS public.hero_images CASCADE;
DROP TABLE IF EXISTS public.homepage_sections CASCADE;
DROP TABLE IF EXISTS public.gallery_items CASCADE;
DROP TABLE IF EXISTS public.coach_notes CASCADE;
DROP TABLE IF EXISTS public.course_sections CASCADE;
DROP TABLE IF EXISTS public.programs CASCADE;

-- -----------------------------------------------------------------------------
-- 4. Funzioni orfane (tutte le firme)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
      AND p.proname = ANY (ARRAY[
        -- legate alle tabelle rimosse sopra
        'increment_announcement_views',
        'get_announcements_with_views',
        'sync_athlete_stats_from_tournaments',
        'initialize_athlete_stats_for_user',
        'update_email_campaigns_updated_at',
        'is_user_unsubscribed',
        'get_email_stats',
        'prevent_listino_prezzi_mutation',
        'prevent_soglie_orario_notturno_mutation',
        'set_booking_prezzo_applicato',
        'update_promo_banner_timestamp',
        'consume_group_credit',
        'reset_weekly_credits',
        -- mai richiamate (né da app, né da trigger, policy o cron)
        'auto_unpublish_expired_announcements',
        'calculate_standings',
        'cleanup_old_typing_indicators',
        'update_participant_stats_from_match',
        'is_court_blocked',
        'log_activity',
        'validate_invite_code'
      ])
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s CASCADE', r.sig);
  END LOOP;
END $$;

COMMIT;
