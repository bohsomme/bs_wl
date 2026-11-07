BEGIN;

ALTER TABLE "template_functional_block"
  ADD COLUMN IF NOT EXISTS "isProgrammed" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "workout" text;

ALTER TABLE "workout_log"
  ADD COLUMN IF NOT EXISTS "functionalResults" jsonb;

COMMIT;
