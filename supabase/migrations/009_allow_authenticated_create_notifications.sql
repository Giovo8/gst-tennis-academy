-- Rimuovi tutte le policy esistenti per ricominciare da zero
DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their notifications" ON public.notifications;

-- Crea la tabella notifications se non esiste
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  link text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Abilita RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policy per visualizzare le proprie notifiche
CREATE POLICY "Users can view their notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy per permettere a TUTTI gli utenti autenticati di creare notifiche per QUALSIASI utente
CREATE POLICY "Authenticated users can create notifications"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Policy per aggiornare le proprie notifiche (mark as read)
CREATE POLICY "Users can update their notifications"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Indici per migliorare le performance
CREATE INDEX IF NOT EXISTS notifications_user_idx ON public.notifications (user_id, is_read);
CREATE INDEX IF NOT EXISTS notifications_created_idx ON public.notifications (created_at);
