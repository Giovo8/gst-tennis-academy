-- ============================================
-- FIX RLS POLICIES - GST Tennis Academy
-- ============================================
-- Eseguire questo script in Supabase SQL Editor
-- per correggere le vulnerabilità RLS identificate
-- ============================================

-- ============================================
-- 1. FIX ORDERS TABLE
-- ============================================
-- Problema: USING (true) espone tutti gli ordini a tutti

-- Rimuovi policy esistente
DROP POLICY IF EXISTS "Public can read orders" ON public.orders;

-- Crea policy corrette
CREATE POLICY "Users can view their orders"
  ON public.orders
  FOR SELECT
  USING (
    customer_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR public.get_my_role() IN ('admin', 'gestore')
  );

CREATE POLICY "Admin can manage orders"
  ON public.orders
  FOR ALL
  USING (public.get_my_role() IN ('admin', 'gestore'));

-- ============================================
-- 2. FIX NOTIFICATIONS TABLE
-- ============================================
-- Problema: WITH CHECK (true) permette a chiunque di creare notifiche

-- Rimuovi policy esistente
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

-- Crea policy corrette (solo utenti autenticati possono creare notifiche)
CREATE POLICY "Authenticated users can create notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Permetti al sistema (admin/gestore) di creare notifiche per tutti
CREATE POLICY "Admin can create notifications for all"
  ON public.notifications
  FOR INSERT
  WITH CHECK (public.get_my_role() IN ('admin', 'gestore'));

-- ============================================
-- 3. FIX PAYMENTS TABLE
-- ============================================
-- Problema: WITH CHECK (true) permette a chiunque di creare pagamenti

-- Rimuovi policy esistente
DROP POLICY IF EXISTS "System can create payments" ON public.payments;

-- Crea policy corrette
CREATE POLICY "Admin can create payments"
  ON public.payments
  FOR INSERT
  WITH CHECK (public.get_my_role() IN ('admin', 'gestore'));

-- Gli utenti possono creare pagamenti solo per sé stessi (per pagamenti self-service)
CREATE POLICY "Users can create own payments"
  ON public.payments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 4. FIX RECRUITMENT_APPLICATIONS TABLE
-- ============================================
-- Aggiungi rate limiting tramite trigger (opzionale)
-- Nota: Questo è un esempio, il vero rate limiting 
-- dovrebbe essere implementato a livello applicativo

-- ============================================
-- 5. VERIFICA POLICIES
-- ============================================
-- Query per verificare le policies attive

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
