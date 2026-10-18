-- =============================================================================
-- 088 — Rimozione della vecchia chat "conversazioni" e dei contenuti inutilizzati
-- =============================================================================
-- Contesto (ottobre 2026): la pagina /chat, unica a usare la chat basata su
-- conversations/messages, non era più raggiungibile da aprile 2026 ed è stata
-- eliminata insieme alle API /api/conversations e /api/messages. La chat delle
-- dashboard usa internal_messages + chat_groups, che RESTANO.
-- Anche announcements, events, services ed enrollments non sono più letti né
-- scritti da nessuna parte dell'applicazione.
--
-- ⚠️ DISTRUTTIVA: elimina i messaggi storici della vecchia chat e i dati delle
--    tabelle elencate. Prima:
--    1. Backup (Dashboard → Database → Backups, oppure pg_dump).
--    2. Se servono, esportare i dati, ad es.:
--         select count(*) from public.messages;
--         select count(*) from public.announcements;
--    3. Eseguire nel SQL Editor (idempotente).
--    4. Dopo: Dashboard → Storage → bucket "chat-attachments" → Delete bucket
--       (Supabase non consente di cancellare bucket e file via SQL).
-- =============================================================================

BEGIN;

-- Vecchia chat a conversazioni (i trigger cadono con le tabelle)
DROP TABLE IF EXISTS public.message_reads CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversation_participants CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.typing_indicators CASCADE;
DROP TABLE IF EXISTS public.user_presence CASCADE;

-- Contenuti mai usati dall'app attuale
DROP TABLE IF EXISTS public.announcements CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.services CASCADE;
DROP TABLE IF EXISTS public.enrollments CASCADE;

-- Funzioni rimaste senza tabelle o mai richiamate
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
      AND p.proname = ANY (ARRAY[
        'update_conversation_last_message',
        'update_unread_counts',
        'reset_unread_count',
        'get_or_create_conversation',
        'update_user_presence_timestamp',
        'cleanup_old_typing_indicators',
        'increment_announcement_views',
        'auto_unpublish_expired_announcements',
        'get_announcements_with_views'
      ])
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s CASCADE', r.sig);
  END LOOP;
END $$;

-- Policy del bucket allegati della vecchia chat
DROP POLICY IF EXISTS "Authenticated users can upload chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own chat attachments" ON storage.objects;

COMMIT;
