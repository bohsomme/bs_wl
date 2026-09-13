import type { Exercise, ExerciseLog, SetLog, TemplateExercise, TemplateFunctionalBlock, WorkoutLog } from "@/lib/db/schema"

export type ExerciseLogRow = {
  el: ExerciseLog
  exercise: Exercise | null
}

export type WorkoutDetails = {
  log: WorkoutLog
  exerciseLogs: ExerciseLogRow[]
  prescriptionMap: Record<number, TemplateExercise>
  setsMap: Record<number, SetLog[]>
  functionalBlocks?: TemplateFunctionalBlock[]
}

export interface WorkoutSessionProps {
  details: WorkoutDetails
  exercises: Exercise[]
  pbWeights: Record<number, string>
}

export type Phase = "readiness" | "exercises" | "finish"
