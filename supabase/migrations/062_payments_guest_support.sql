-- Migration 062: Support guest participants in payments table
ALTER TABLE public.payments
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS guest_name text;

-- Either user_id or guest_name must be set
ALTER TABLE public.payments
  ADD CONSTRAINT check_payment_identity
  CHECK (user_id IS NOT NULL OR guest_name IS NOT NULL);
