-- Migration: Add support for Championships and enhanced Tournament structure
-- Author: GST Tennis Academy
-- Date: 2025-12-28

-- Create ENUM type for competition types
CREATE TYPE competition_type AS ENUM ('torneo', 'campionato');

-- Create ENUM type for competition formats
CREATE TYPE competition_format AS ENUM (
  'eliminazione_diretta',  -- Single/Double elimination
  'round_robin',            -- Round-robin (all-play-all)
  'girone_eliminazione'     -- Group stage + elimination brackets
);

-- Add new columns to tournaments table
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS competition_type competition_type DEFAULT 'torneo' NOT NULL,
  ADD COLUMN IF NOT EXISTS format competition_format DEFAULT 'eliminazione_diretta' NOT NULL,
  ADD COLUMN IF NOT EXISTS rounds_data JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS groups_data JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS standings JSONB DEFAULT '[]'::jsonb;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tournaments_competition_type ON tournaments(competition_type);
CREATE INDEX IF NOT EXISTS idx_tournaments_format ON tournaments(format);
CREATE INDEX IF NOT EXISTS idx_tournaments_starts_at ON tournaments(starts_at);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);

-- Add comments for documentation
COMMENT ON COLUMN tournaments.competition_type IS 'Type of competition: torneo (tournament) or campionato (championship)';
COMMENT ON COLUMN tournaments.format IS 'Format of the competition: eliminazione_diretta, round_robin, or girone_eliminazione';
COMMENT ON COLUMN tournaments.rounds_data IS 'JSON array storing bracket/round information for elimination tournaments';
COMMENT ON COLUMN tournaments.groups_data IS 'JSON array storing group stage data for group-based competitions';
COMMENT ON COLUMN tournaments.standings IS 'JSON array storing standings/rankings for championships and round-robin';

-- Update existing tournaments to have default values
UPDATE tournaments
SET 
  competition_type = 'torneo',
  format = 'eliminazione_diretta'
WHERE competition_type IS NULL;

-- Add validation constraint for max_participants based on format
ALTER TABLE tournaments
  ADD CONSTRAINT check_max_participants_format CHECK (
    (format = 'eliminazione_diretta' AND max_participants IN (2, 4, 8, 16, 32, 64, 128)) OR
    (format IN ('round_robin', 'girone_eliminazione') AND max_participants >= 3)
  );

-- Create function to calculate standings for round-robin
CREATE OR REPLACE FUNCTION calculate_standings(tournament_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  standings_result JSONB;
BEGIN
  -- This function will be implemented to calculate wins, losses, points
  -- For now, return empty array
  SELECT '[]'::jsonb INTO standings_result;
  RETURN standings_result;
END;
$$;

-- Update RLS policies to include new columns
-- The existing policies should already cover these columns via SELECT *
-- But we explicitly grant access to ensure consistency

-- Refresh existing policies (if needed, uncomment these lines)
-- DROP POLICY IF EXISTS "tournaments_select_all" ON tournaments;
-- DROP POLICY IF EXISTS "tournaments_insert_authorized" ON tournaments;
-- DROP POLICY IF EXISTS "tournaments_update_authorized" ON tournaments;

-- Ensure policies allow access to new columns (policies should already exist)
-- These are redundant if using SELECT * in existing policies, but included for clarity

-- Grant additional permissions if needed
GRANT SELECT ON tournaments TO authenticated;
GRANT INSERT ON tournaments TO authenticated;
GRANT UPDATE ON tournaments TO authenticated;

-- Add trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_tournaments_updated_at'
  ) THEN
    CREATE TRIGGER update_tournaments_updated_at
      BEFORE UPDATE ON tournaments
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END
$$;

-- Migration completed successfully
