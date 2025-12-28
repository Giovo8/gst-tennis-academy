-- Migration: Announcements/Bacheca System
-- Description: Sistema bacheca annunci per GST Tennis Academy
-- Date: 2025-12-28

-- Step 1: Create announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  announcement_type VARCHAR(50) NOT NULL DEFAULT 'announcement',
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  priority VARCHAR(20) DEFAULT 'medium',
  expiry_date TIMESTAMPTZ,
  visibility VARCHAR(50) DEFAULT 'all',
  is_published BOOLEAN DEFAULT true,
  is_pinned BOOLEAN DEFAULT false,
  view_count INT DEFAULT 0,
  image_url TEXT,
  link_url TEXT,
  link_text VARCHAR(100),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT announcements_type_check CHECK (announcement_type IN ('announcement', 'partner', 'event', 'news', 'tournament', 'lesson', 'promotion')),
  CONSTRAINT announcements_priority_check CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  CONSTRAINT announcements_visibility_check CHECK (visibility IN ('all', 'atleti', 'maestri', 'admin', 'gestore', 'public'))
);

-- Step 2: Create announcement_views table (for tracking views)
CREATE TABLE IF NOT EXISTS announcement_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address VARCHAR(45),
  user_agent TEXT,
  
  UNIQUE(announcement_id, user_id)
);

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_announcements_type ON announcements(announcement_type);
CREATE INDEX IF NOT EXISTS idx_announcements_priority ON announcements(priority DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_visibility ON announcements(visibility);
CREATE INDEX IF NOT EXISTS idx_announcements_published ON announcements(is_published, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_expiry ON announcements(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_announcements_author ON announcements(author_id);

CREATE INDEX IF NOT EXISTS idx_announcement_views_announcement ON announcement_views(announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcement_views_user ON announcement_views(user_id);

-- Step 4: RLS Policies for announcements
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Public and authenticated users can view published announcements based on visibility
CREATE POLICY "announcements_select_public" ON announcements
  FOR SELECT USING (
    is_published = true
    AND (expiry_date IS NULL OR expiry_date > NOW())
    AND (
      visibility = 'all'
      OR visibility = 'public'
      OR (
        auth.uid() IS NOT NULL
        AND (
          visibility IN ('atleti', 'maestri', 'admin', 'gestore')
          AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (
              visibility = 'all'
              OR profiles.user_role = visibility
              OR (visibility = 'atleti' AND profiles.user_role IN ('atleta', 'maestro', 'admin', 'gestore'))
              OR (visibility = 'maestri' AND profiles.user_role IN ('maestro', 'admin', 'gestore'))
            )
          )
        )
      )
    )
  );

-- Admin/gestore can view all announcements (including drafts)
CREATE POLICY "announcements_select_admin" ON announcements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_role IN ('admin', 'gestore')
    )
  );

-- Only admin/gestore can insert announcements
CREATE POLICY "announcements_insert_admin" ON announcements
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_role IN ('admin', 'gestore')
    )
  );

-- Only admin/gestore can update announcements
CREATE POLICY "announcements_update_admin" ON announcements
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_role IN ('admin', 'gestore')
    )
  );

-- Only admin/gestore can delete announcements
CREATE POLICY "announcements_delete_admin" ON announcements
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_role IN ('admin', 'gestore')
    )
  );

-- Step 5: RLS Policies for announcement_views
ALTER TABLE announcement_views ENABLE ROW LEVEL SECURITY;

-- Users can view their own view records
CREATE POLICY "announcement_views_select_own" ON announcement_views
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_role IN ('admin', 'gestore')
    )
  );

-- Authenticated users can insert their own view records
CREATE POLICY "announcement_views_insert_authenticated" ON announcement_views
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR user_id IS NULL -- Allow anonymous views
  );

-- Step 6: Create function to increment view count
CREATE OR REPLACE FUNCTION increment_announcement_views()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE announcements
  SET view_count = view_count + 1
  WHERE id = NEW.announcement_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create trigger for view count
DROP TRIGGER IF EXISTS trigger_increment_announcement_views ON announcement_views;
CREATE TRIGGER trigger_increment_announcement_views
  AFTER INSERT ON announcement_views
  FOR EACH ROW
  EXECUTE FUNCTION increment_announcement_views();

-- Step 8: Create function to auto-unpublish expired announcements
CREATE OR REPLACE FUNCTION auto_unpublish_expired_announcements()
RETURNS void AS $$
BEGIN
  UPDATE announcements
  SET is_published = false
  WHERE is_published = true
  AND expiry_date IS NOT NULL
  AND expiry_date <= NOW();
END;
$$ LANGUAGE plpgsql;

-- Step 9: Create function to get announcements with user view status
CREATE OR REPLACE FUNCTION get_announcements_with_views(user_uuid UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  title VARCHAR,
  content TEXT,
  announcement_type VARCHAR,
  author_id UUID,
  author_name TEXT,
  priority VARCHAR,
  expiry_date TIMESTAMPTZ,
  visibility VARCHAR,
  is_published BOOLEAN,
  is_pinned BOOLEAN,
  view_count INT,
  image_url TEXT,
  link_url TEXT,
  link_text VARCHAR,
  created_at TIMESTAMPTZ,
  has_viewed BOOLEAN,
  days_until_expiry INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.title,
    a.content,
    a.announcement_type,
    a.author_id,
    p.full_name AS author_name,
    a.priority,
    a.expiry_date,
    a.visibility,
    a.is_published,
    a.is_pinned,
    a.view_count,
    a.image_url,
    a.link_url,
    a.link_text,
    a.created_at,
    CASE 
      WHEN user_uuid IS NOT NULL THEN 
        EXISTS (
          SELECT 1 FROM announcement_views av 
          WHERE av.announcement_id = a.id 
          AND av.user_id = user_uuid
        )
      ELSE false
    END AS has_viewed,
    CASE 
      WHEN a.expiry_date IS NOT NULL THEN 
        EXTRACT(DAY FROM a.expiry_date - NOW())::INT
      ELSE NULL
    END AS days_until_expiry
  FROM announcements a
  LEFT JOIN profiles p ON a.author_id = p.id
  WHERE a.is_published = true
  AND (a.expiry_date IS NULL OR a.expiry_date > NOW())
  ORDER BY 
    a.is_pinned DESC,
    CASE a.priority
      WHEN 'urgent' THEN 4
      WHEN 'high' THEN 3
      WHEN 'medium' THEN 2
      ELSE 1
    END DESC,
    a.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Step 10: Add comments for documentation
COMMENT ON TABLE announcements IS 'Bacheca annunci GST Tennis Academy (eventi, partner, promozioni, news)';
COMMENT ON TABLE announcement_views IS 'Tracciamento visualizzazioni annunci per analytics';

COMMENT ON COLUMN announcements.announcement_type IS 'Tipo: announcement, partner, event, news, tournament, lesson, promotion';
COMMENT ON COLUMN announcements.priority IS 'Priorità: low, medium, high, urgent (influisce ordinamento)';
COMMENT ON COLUMN announcements.visibility IS 'Visibilità: all, atleti, maestri, admin, gestore, public';
COMMENT ON COLUMN announcements.is_pinned IS 'Se true, appare sempre in cima alla bacheca';
COMMENT ON COLUMN announcements.expiry_date IS 'Data scadenza annuncio (auto-unpublish dopo questa data)';
COMMENT ON COLUMN announcements.link_url IS 'URL esterno (es: form iscrizione torneo, sito partner)';

-- Migration completed successfully!
-- Next steps: Create API endpoints for announcements management
