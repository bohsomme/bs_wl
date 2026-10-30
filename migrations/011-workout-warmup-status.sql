ALTER TABLE "workout_log"
  ADD COLUMN IF NOT EXISTS "warmupStatus" text
  CHECK ("warmupStatus" IN ('completed', 'skipped'));
