ALTER TABLE "template_exercise"
  ADD COLUMN IF NOT EXISTS "section" text NOT NULL DEFAULT 'main',
  ADD COLUMN IF NOT EXISTS "superset" text,
  ADD COLUMN IF NOT EXISTS "totalRepsMin" integer,
  ADD COLUMN IF NOT EXISTS "totalRepsMax" integer,
  ADD COLUMN IF NOT EXISTS "percentages" jsonb;
