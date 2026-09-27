-- A non-null duration target prescribes seconds instead of reps.
-- Existing prescriptions and logs continue to use reps.
ALTER TABLE template_exercise ADD COLUMN IF NOT EXISTS "durationSecondsMin" integer;
ALTER TABLE template_exercise ADD COLUMN IF NOT EXISTS "durationSecondsMax" integer;
ALTER TABLE set_log ADD COLUMN IF NOT EXISTS "durationSeconds" integer;
