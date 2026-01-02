-- SOLUZIONE 1: Trova l'utente orfano e crea il profilo mancante
-- Esegui questa query nella console Supabase (SQL Editor)

-- Prima, trova l'ID dell'utente orfano
SELECT id, email, raw_user_meta_data
FROM auth.users
WHERE email = 'egidio@gst.it';

-- Poi, crea il profilo mancante (sostituisci USER_ID con l'id trovato sopra)
INSERT INTO public.profiles (id, email, full_name, phone, role)
VALUES (
  'USER_ID_QUI',  -- Sostituisci con l'id trovato nella query precedente
  'egidio@gst.it',
  'Nome Cognome',  -- Puoi anche prendere da raw_user_meta_data->>'full_name'
  NULL,
  'atleta'
)
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;

-- SOLUZIONE 2: Elimina l'utente orfano (più semplice)
-- Vai su: Supabase Dashboard → Authentication → Users
-- Cerca: egidio@gst.it
-- Clicca sui tre puntini → Delete user

-- Dopo averlo eliminato, potrai registrarlo di nuovo correttamente
