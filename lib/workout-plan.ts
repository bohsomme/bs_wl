import type { Exercise, TemplateExercise, TemplateFunctionalBlock, WorkoutTemplate } from "@/lib/db/schema"

// Dates are strings in JSONB; keep only the fields needed to preserve the plan.
export type WorkoutPlan = {
  capturedAt: string
  template: Pick<WorkoutTemplate, "id" | "name" | "weekNumber" | "dayNumber" | "orderInDay" | "isRestDay">
  exercises: {
    prescription: Omit<TemplateExercise, "createdAt">
    exercise: Pick<Exercise, "id" | "name" | "muscleGroup" | "description"> | null
    estimatedOneRepMaxKg: number | null
  }[]
  functionalBlocks: Omit<TemplateFunctionalBlock, "createdAt">[]
}
