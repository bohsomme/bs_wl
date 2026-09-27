-- Existing logs intentionally remain NULL: their original prescriptions are unknown.
ALTER TABLE workout_log ADD COLUMN IF NOT EXISTS "plannedSnapshot" jsonb;
ALTER TABLE exercise_log ADD COLUMN IF NOT EXISTS "templateExerciseId" integer;

CREATE INDEX IF NOT EXISTS workout_log_user_program_started_idx
  ON workout_log ("userId", "programId", "startedAt");
