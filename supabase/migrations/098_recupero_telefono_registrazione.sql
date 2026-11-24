-- =============================================================================
-- 098 — Recupero del telefono indicato in registrazione
-- =============================================================================
-- Contesto (novembre 2026): POST /api/auth/signup salvava il telefono solo nei
-- metadata dell'account (auth.users.raw_user_meta_data->>'phone') e non in
-- profiles.phone. Qui si copia nei soli profili senza telefono, nel formato di
-- src/lib/utils/phone.ts (senza separatori, "00" iniziale -> "+").
-- I numeri già presenti nei profili non vengono toccati.
--
-- Per vedere prima quali profili verranno aggiornati:
--   select p.full_name, p.email, au.raw_user_meta_data->>'phone' as telefono
--   from public.profiles p join auth.users au on au.id = p.id
--   where coalesce(btrim(p.phone), '') = ''
--     and coalesce(btrim(au.raw_user_meta_data->>'phone'), '') <> '';
-- Idempotente.
-- =============================================================================

BEGIN;

UPDATE public.profiles p
SET phone = src.phone
FROM (
  SELECT
    id,
    regexp_replace(
      regexp_replace(raw_user_meta_data->>'phone', '[^0-9+]', '', 'g'),
      '^00', '+'
    ) AS phone
  FROM auth.users
) src
WHERE src.id = p.id
  AND COALESCE(btrim(p.phone), '') = ''
  AND src.phone ~ '^[+]?[0-9]{10,15}$';

COMMIT;
