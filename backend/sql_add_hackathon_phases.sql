-- Add missing columns for extended hackathon timeline support
ALTER TABLE hackathons
  ADD COLUMN IF NOT EXISTS registration_open_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS submission_open_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS phases jsonb;

CREATE INDEX IF NOT EXISTS idx_hackathons_phases ON hackathons USING GIN (phases);
