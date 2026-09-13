ALTER TABLE template_exercise ALTER COLUMN "exerciseId" DROP NOT NULL;
ALTER TABLE template_exercise ADD COLUMN "freePickCriteria" text;
ALTER TABLE exercise_log ALTER COLUMN "exerciseId" DROP NOT NULL;
ALTER TABLE exercise_log ADD COLUMN "freePickCriteria" text;
ALTER TABLE exercise_log ADD COLUMN "exerciseName" text;
ALTER TABLE exercise_log ADD COLUMN superset text;
