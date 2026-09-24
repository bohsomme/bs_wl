ALTER TABLE workout_template ADD COLUMN IF NOT EXISTS "isRestDay" boolean NOT NULL DEFAULT false;
