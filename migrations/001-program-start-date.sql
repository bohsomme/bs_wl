BEGIN;
ALTER TABLE program ADD COLUMN IF NOT EXISTS "startDate" text;
ALTER TABLE program ADD COLUMN IF NOT EXISTS "assignedAt" timestamptz;
-- Preserve Monday?Saturday as Days 1?6; Sunday becomes Day 7.
UPDATE workout_template SET "dayOfWeek" = 7 WHERE "dayOfWeek" = 0;
COMMIT;
