-- =============================================================================
-- 096 — Chat: sicurezza dei gruppi, realtime dei gruppi e messaggi non letti
-- =============================================================================
-- Contesto (ottobre 2026), problemi della chat delle dashboard (internal_messages
-- + chat_groups):
--   1. chat_groups e chat_group_members avevano la RLS disattivata (029):
--      chiunque fosse loggato poteva leggerle e scriverle con la chiave anon,
--      ad esempio iscrivendosi da solo a un gruppo altrui.
--   2. La policy INSERT di internal_messages controllava solo il mittente: si
--      poteva scrivere in un gruppo senza esserne membri, saltando l'API.
--   3. La policy SELECT ammetteva solo mittente/destinatario: i messaggi di
--      gruppo (recipient_id null) non arrivavano in realtime agli altri membri.
--   4. Il destinatario poteva modificare qualsiasi colonna di un messaggio
--      ricevuto (anche il testo), non solo is_read.
--   5. Non c'era modo di sapere quali messaggi di gruppo fossero già letti.
--
-- L'app (pagina chat, /api/chat-groups, pallino nella nav) richiede questa
-- migrazione: applicarla PRIMA del deploy del codice corrispondente.
--
-- Prima di eseguirla, controllare che su internal_messages non ci siano policy
-- create a mano con altri nomi (resterebbero attive in OR con quelle nuove):
--   select policyname, cmd from pg_policies where tablename = 'internal_messages';
-- Idempotente: si può rieseguire.
-- =============================================================================

BEGIN;

-- 1. Ultima lettura di ciascun membro di un gruppo -----------------------------
-- I membri esistenti partono da "tutto letto", per non accendere badge su
-- messaggi vecchi.
ALTER TABLE public.chat_group_members
  ADD COLUMN IF NOT EXISTS last_read_at timestamptz NOT NULL DEFAULT now();

-- 2. Appartenenza a un gruppo ---------------------------------------------------
-- SECURITY DEFINER: legge chat_group_members senza passare dalla sua RLS, così
-- le policy che la usano non si richiamano a vicenda (la ricorsione infinita
-- che in 029 aveva portato a disattivare la RLS).
CREATE OR REPLACE FUNCTION public.is_chat_group_member(p_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_group_members
    WHERE group_id = p_group_id
      AND user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_chat_group_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_chat_group_member(uuid) TO authenticated;

-- 3. RLS su gruppi e membri -----------------------------------------------------
-- Lettura solo ai membri. Nessuna policy di scrittura: creazione, uscita e
-- gestione membri passano da /api/chat-groups (service role, bypassa la RLS).
ALTER TABLE public.chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_groups_select_membri" ON public.chat_groups;
CREATE POLICY "chat_groups_select_membri"
  ON public.chat_groups
  FOR SELECT
  TO authenticated
  USING (public.is_chat_group_member(id));

DROP POLICY IF EXISTS "chat_group_members_select_membri" ON public.chat_group_members;
CREATE POLICY "chat_group_members_select_membri"
  ON public.chat_group_members
  FOR SELECT
  TO authenticated
  USING (public.is_chat_group_member(group_id));

-- 4. Policy di internal_messages -------------------------------------------------
-- Lettura: messaggi diretti propri + messaggi dei gruppi di cui si è membri
-- (vale anche per il realtime, che applica la stessa RLS).
DROP POLICY IF EXISTS "Users can read their own messages" ON public.internal_messages;
DROP POLICY IF EXISTS "internal_messages_select" ON public.internal_messages;
CREATE POLICY "internal_messages_select"
  ON public.internal_messages
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = sender_id
    OR auth.uid() = recipient_id
    OR (group_id IS NOT NULL AND public.is_chat_group_member(group_id))
  );

-- Scrittura: a proprio nome, verso un destinatario (diretto) oppure in un
-- gruppo di cui si è membri.
DROP POLICY IF EXISTS "Users can send messages" ON public.internal_messages;
DROP POLICY IF EXISTS "internal_messages_insert" ON public.internal_messages;
CREATE POLICY "internal_messages_insert"
  ON public.internal_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND (
      (group_id IS NULL AND recipient_id IS NOT NULL)
      OR (
        group_id IS NOT NULL
        AND recipient_id IS NULL
        AND public.is_chat_group_member(group_id)
      )
    )
  );

-- Modifica: la policy "Recipients can mark messages as read" resta (solo il
-- destinatario), ma i client possono aggiornare soltanto is_read.
-- updated_at continua a essere aggiornato dal trigger.
REVOKE UPDATE ON public.internal_messages FROM anon, authenticated;
GRANT UPDATE (is_read) ON public.internal_messages TO authenticated;

-- 5. Lettura dei gruppi e conteggio non letti -------------------------------------
CREATE OR REPLACE FUNCTION public.mark_chat_group_read(p_group_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.chat_group_members
  SET last_read_at = now()
  WHERE group_id = p_group_id
    AND user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.mark_chat_group_read(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_chat_group_read(uuid) TO authenticated;

-- Messaggi non letti dell'utente corrente: diretti + gruppi (pallino "Chat").
CREATE OR REPLACE FUNCTION public.get_unread_chat_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    (
      SELECT count(*)
      FROM public.internal_messages m
      WHERE m.recipient_id = auth.uid()
        AND m.group_id IS NULL
        AND m.is_read = false
    )
    +
    (
      SELECT count(*)
      FROM public.internal_messages m
      JOIN public.chat_group_members gm
        ON gm.group_id = m.group_id
       AND gm.user_id = auth.uid()
      WHERE m.sender_id <> auth.uid()
        AND m.created_at > gm.last_read_at
    )
  )::integer;
$$;

REVOKE ALL ON FUNCTION public.get_unread_chat_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_unread_chat_count() TO authenticated;

-- 6. Realtime ---------------------------------------------------------------------
-- La chat ascolta gli INSERT su internal_messages, la campanella INSERT e
-- UPDATE su notifications: entrambe devono stare nella publication.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['internal_messages', 'notifications'] LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

COMMIT;
