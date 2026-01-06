-- ============================================
-- Aggiungi colonne social media alla tabella staff
-- ============================================

-- Aggiungi le colonne per i social media se non esistono
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'staff' 
    AND column_name = 'facebook_url'
  ) THEN
    ALTER TABLE public.staff ADD COLUMN facebook_url TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'staff' 
    AND column_name = 'instagram_url'
  ) THEN
    ALTER TABLE public.staff ADD COLUMN instagram_url TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'staff' 
    AND column_name = 'linkedin_url'
  ) THEN
    ALTER TABLE public.staff ADD COLUMN linkedin_url TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'staff' 
    AND column_name = 'twitter_url'
  ) THEN
    ALTER TABLE public.staff ADD COLUMN twitter_url TEXT;
  END IF;
END $$;

-- Commenti per documentazione
COMMENT ON COLUMN public.staff.facebook_url IS 'URL profilo Facebook del membro dello staff';
COMMENT ON COLUMN public.staff.instagram_url IS 'URL profilo Instagram del membro dello staff';
COMMENT ON COLUMN public.staff.linkedin_url IS 'URL profilo LinkedIn del membro dello staff';
COMMENT ON COLUMN public.staff.twitter_url IS 'URL profilo Twitter del membro dello staff';
