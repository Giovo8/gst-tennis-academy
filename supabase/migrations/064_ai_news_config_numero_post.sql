ALTER TABLE public.ai_news_config
  ADD COLUMN IF NOT EXISTS numero_post integer NOT NULL DEFAULT 5;
