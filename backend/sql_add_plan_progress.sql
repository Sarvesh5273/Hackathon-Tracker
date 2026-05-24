-- Add progress columns to plans table
ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS idea_done boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS implementation_done boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS demo_done boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS submitted boolean DEFAULT false;

-- Optional: index for submitted
CREATE INDEX IF NOT EXISTS idx_plans_submitted ON plans(submitted);
