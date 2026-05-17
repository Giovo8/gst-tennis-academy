-- Migration 052: Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  payment_type text NOT NULL, -- 'subscription', 'booking', 'course', 'event', 'product'
  reference_id uuid,          -- ID of related booking/course/event/product
  payment_method text,        -- 'stripe', 'cash', 'bank_transfer'
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
  stripe_payment_id text,
  metadata jsonb,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their payments"
  ON public.payments
  FOR SELECT
  USING (auth.uid() = user_id OR public.get_my_role() IN ('admin', 'gestore'));

CREATE POLICY "Admin can create payments"
  ON public.payments
  FOR INSERT
  WITH CHECK (public.get_my_role() IN ('admin', 'gestore'));

CREATE POLICY "Users can create own payments"
  ON public.payments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin can update payments"
  ON public.payments
  FOR UPDATE
  USING (public.get_my_role() IN ('admin', 'gestore'));

CREATE POLICY "Admin can delete payments"
  ON public.payments
  FOR DELETE
  USING (public.get_my_role() IN ('admin', 'gestore'));

CREATE INDEX IF NOT EXISTS payments_user_idx ON public.payments (user_id);
CREATE INDEX IF NOT EXISTS payments_status_idx ON public.payments (status);
CREATE INDEX IF NOT EXISTS payments_type_idx ON public.payments (payment_type);
CREATE INDEX IF NOT EXISTS payments_reference_idx ON public.payments (reference_id);
CREATE INDEX IF NOT EXISTS payments_created_idx ON public.payments (created_at);
