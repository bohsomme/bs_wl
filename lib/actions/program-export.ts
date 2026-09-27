"use server"

import { and, asc, eq, gte, inArray, lt } from "drizzle-orm"
import { db } from "@/lib/db"
import { exercise, exerciseLog, program, setLog, templateExercise, templateFunctionalBlock, workoutLog, workoutTemplate } from "@/lib/db/schema"
import { addDays, buildProgramExport, validateExportRange, type ExportRange } from "@/lib/program-export"
import type { WorkoutPlan } from "@/lib/workout-plan"
import { getUserId } from "./auth"

export async function exportProgramRun(programId: number, range: ExportRange) {
  const userId = await getUserId()
  if (!Number.isSafeInteger(programId) || programId < 1) throw new Error("Invalid program")
  validateExportRange(range)
  return db.transaction(async (tx) => {
    const [owned] = await tx.select().from(program).where(and(eq(program.id, programId), eq(program.userId, userId)))
    if (!owned) throw new Error("Program not found")
    const templates = await tx.select().from(workoutTemplate).where(eq(workoutTemplate.programId, programId))
    const templateIds = templates.map((t) => t.id)
    const prescriptions = templateIds.length ? await tx.select({ te: templateExercise, exercise }).from(templateExercise)
      .leftJoin(exercise, eq(templateExercise.exerciseId, exercise.id))
      .where(inArray(templateExercise.workoutTemplateId, templateIds)).orderBy(asc(templateExercise.orderIndex), asc(templateExercise.id)) : []
    const blocks = templateIds.length ? await tx.select().from(templateFunctionalBlock)
      .where(inArray(templateFunctionalBlock.workoutTemplateId, templateIds)).orderBy(asc(templateFunctionalBlock.orderIndex), asc(templateFunctionalBlock.id)) : []
    // Broad UTC bounds cover all IANA zones, including DST. The builder applies
    // the exact inclusive local dates using Intl, without trusting client offsets.
    const logs = await tx.select().from(workoutLog).where(and(
      eq(workoutLog.userId, userId), eq(workoutLog.programId, programId),
      gte(workoutLog.startedAt, new Date(`${addDays(range.startDate, -1)}T00:00:00Z`)),
      lt(workoutLog.startedAt, new Date(`${addDays(range.endDate, 2)}T00:00:00Z`)),
    ))
    const logIds = logs.map((log) => log.id)
    const exercises = logIds.length ? await tx.select({ el: exerciseLog, exercise }).from(exerciseLog)
      .leftJoin(exercise, eq(exerciseLog.exerciseId, exercise.id)).where(inArray(exerciseLog.workoutLogId, logIds)) : []
    const exerciseIds = exercises.map(({ el }) => el.id)
    const sets = exerciseIds.length ? await tx.select().from(setLog).where(inArray(setLog.exerciseLogId, exerciseIds)) : []
    const currentPlans: WorkoutPlan[] = templates.map((template) => ({
      capturedAt: new Date().toISOString(), template,
      exercises: prescriptions.filter(({ te }) => te.workoutTemplateId === template.id).map(({ te, exercise }) => ({
        prescription: te, exercise, estimatedOneRepMaxKg: null,
      })),
      functionalBlocks: blocks.filter((block) => block.workoutTemplateId === template.id),
    }))
    return buildProgramExport({ program: owned, range, currentPlans, logs, exercises, sets })
  }, { isolationLevel: "repeatable read", accessMode: "read only" })
}
