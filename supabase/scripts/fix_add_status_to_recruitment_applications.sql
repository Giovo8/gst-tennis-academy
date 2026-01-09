-- Aggiungi la colonna status a recruitment_applications
ALTER TABLE public.recruitment_applications ADD COLUMN status text NOT NULL DEFAULT 'pending';

-- (Opzionale) Aggiorna le policy se vuoi permettere update della status da parte di admin/gestore
-- create policy "Gestore/Admin can update application status"
--   on public.recruitment_applications
--   for update
--   using (public.get_my_role() in ('gestore', 'admin'));
