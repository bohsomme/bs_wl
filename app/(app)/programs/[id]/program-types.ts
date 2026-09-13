import type { Exercise, Program, TemplateExercise, WorkoutTemplate } from "@/lib/db/schema"

export interface TemplateExerciseRow {
  te: TemplateExercise
  exercise: Exercise | null
}

export interface ProgramBuilderProps {
  program: Program
  initialTemplates: WorkoutTemplate[]
  exercises: Exercise[]
}
