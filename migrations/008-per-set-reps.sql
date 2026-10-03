-- Ordered rep targets for individual sets; null retains shared reps or time.
ALTER TABLE template_exercise ADD COLUMN IF NOT EXISTS "repsBySet" jsonb;
