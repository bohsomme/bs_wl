"use server"
import { calculateOneRepMax } from "@/lib/strength"

import { db } from "@/lib/db"
import {
  workoutLog,
  exerciseLog,
  setLog,
  workoutTemplate,
  templateExercise,
  templateFunctionalBlock,
  exercise,
  program,
  personalBest,
} from "@/lib/db/schema"
import { asc, desc, eq, and, gte } from "drizzle-orm"
import { getUserId } from "./auth"
import { revalidatePath } from "next/cache"

// ── Next workout calculation ─────────────────────────────────────────────────

export async function getNextWorkout() {
  const userId = await getUserId()

  // Find active program
  const [activeProgram] = await db
    .select()
    .from(program)
    .where(and(eq(program.userId, userId), eq(program.isActive, true)))
    .limit(1)

  if (!activeProgram?.startDate) return null

  // Get all templates for this program
  const templates = await db
    .select()
    .from(workoutTemplate)
    .where(eq(workoutTemplate.programId, activeProgram.id))
    .orderBy(asc(workoutTemplate.weekNumber), asc(workoutTemplate.dayNumber))

  if (templates.length === 0) return null

  // Find the last completed workout in this program
  const [lastLog] = await db
    .select()
    .from(workoutLog)
    .where(
      and(
        eq(workoutLog.userId, userId),
        eq(workoutLog.programId, activeProgram.id),
        eq(workoutLog.status, "completed"),
        activeProgram.assignedAt ? gte(workoutLog.startedAt, activeProgram.assignedAt) : undefined
      )
    )
    .orderBy(desc(workoutLog.completedAt))
    .limit(1)

  const lastIdx = templates.findIndex((t) => t.id === lastLog?.workoutTemplateId)
  const nextTemplate = templates[lastIdx + 1]
  if (!nextTemplate) return null
  const nextDate = new Date(`${activeProgram.startDate}T00:00:00`)
  nextDate.setDate(nextDate.getDate() + (nextTemplate.weekNumber - 1) * 7 + nextTemplate.dayNumber - 1)

  return {
    program: activeProgram,
    template: nextTemplate,
    nextDate,
    weekNumber: nextTemplate.weekNumber,
  }
}

// ── Start / manage workout logs ──────────────────────────────────────────────

export async function startWorkout(data: {
  workoutTemplateId?: number
  programId?: number
  name: string
  readiness?: number
  barFeel?: number
  preNotes?: string
}) {
  for (const rating of [data.readiness, data.barFeel]) {
    if (rating !== undefined && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
      throw new Error("Readiness and bar feel must be whole numbers from 1 to 5.")
    }
  }
  const userId = await getUserId()
  const [log] = await db
    .insert(workoutLog)
    .values({ ...data, userId })
    .returning()
  revalidatePath("/")
  return log
}

export async function updateWorkoutLog(
  id: number,
  data: Partial<{
    readiness: number
    barFeel: number
    preNotes: string
    sessionRpe: number
    postNotes: string
    status: string
    completedAt: Date
  }>
) {
  for (const rating of [data.readiness, data.barFeel]) {
    if (rating !== undefined && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
      throw new Error("Readiness and bar feel must be whole numbers from 1 to 5.")
    }
  }
  const userId = await getUserId()

  // Drop undefined fields so we don't send empty updates to Drizzle.
  const payload: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) payload[key] = value
  }
  if (data.sessionRpe != null) payload.sessionRpe = String(data.sessionRpe)

  // Drizzle throws "No values to set" on an empty update. If there's nothing
  // to change (e.g. the athlete skipped readiness), just return the current
  // row scoped to this user.
  if (Object.keys(payload).length === 0) {
    const [existing] = await db
      .select()
      .from(workoutLog)
      .where(and(eq(workoutLog.id, id), eq(workoutLog.userId, userId)))
    return existing
  }

  const [log] = await db
    .update(workoutLog)
    .set(payload)
    .where(and(eq(workoutLog.id, id), eq(workoutLog.userId, userId)))
    .returning()
  revalidatePath("/log")
  revalidatePath("/")
  return log
}

export async function getActiveWorkout() {
  const userId = await getUserId()
  const [log] = await db
    .select()
    .from(workoutLog)
    .where(and(eq(workoutLog.userId, userId), eq(workoutLog.status, "in_progress")))
    .orderBy(desc(workoutLog.startedAt))
    .limit(1)
  return log ?? null
}

export async function getWorkoutWithDetails(id: number) {
  const userId = await getUserId()
  const [log] = await db
    .select()
    .from(workoutLog)
    .where(and(eq(workoutLog.id, id), eq(workoutLog.userId, userId)))
  if (!log) return null

  const exerciseLogs = await db
    .select({ el: exerciseLog, exercise })
    .from(exerciseLog)
    .innerJoin(exercise, eq(exerciseLog.exerciseId, exercise.id))
    .where(eq(exerciseLog.workoutLogId, id))
    .orderBy(asc(exerciseLog.orderIndex))

  const allSets = await db
    .select()
    .from(setLog)
    .where(
      exerciseLogs.length > 0
        ? eq(setLog.exerciseLogId, exerciseLogs[0].el.id)
        : eq(setLog.exerciseLogId, -1)
    )

  // Fetch sets for all exercise logs
  const setsMap: Record<number, typeof allSets> = {}
  for (const { el } of exerciseLogs) {
    const sets = await db
      .select()
      .from(setLog)
      .where(eq(setLog.exerciseLogId, el.id))
      .orderBy(asc(setLog.setNumber))
    setsMap[el.id] = sets
  }

  // Functional Fitness blocks come from the source template (display-only)
  const functionalBlocks = log.workoutTemplateId
    ? await db
        .select()
        .from(templateFunctionalBlock)
        .where(eq(templateFunctionalBlock.workoutTemplateId, log.workoutTemplateId))
        .orderBy(asc(templateFunctionalBlock.orderIndex))
    : []

  return { log, exerciseLogs, setsMap, functionalBlocks }
}

// ── Exercise logs ────────────────────────────────────────────────────────────

export async function addExerciseLog(data: {
  workoutLogId: number
  exerciseId: number
  orderIndex: number
}) {
  await getUserId()
  const [el] = await db.insert(exerciseLog).values(data).returning()
  return el
}

export async function updateExerciseLog(
  id: number,
  data: Partial<{ topSetRpe: number | null; notes: string | null; skipped: boolean }>
) {
  await getUserId()
  const payload: Record<string, unknown> = { ...data }
  if (data.topSetRpe != null) payload.topSetRpe = String(data.topSetRpe)
  const [el] = await db
    .update(exerciseLog)
    .set(payload)
    .where(eq(exerciseLog.id, id))
    .returning()
  return el
}

// ── Set logs ─────────────────────────────────────────────────────────────────

export async function upsertSetLog(data: {
  exerciseLogId: number
  setNumber: number
  isMakeup?: boolean
  reps?: number
  weight?: number
  rpe?: number
  missed?: boolean
  missReason?: string
}) {
  const userId = await getUserId()

  const payload: Record<string, unknown> = {
    exerciseLogId: data.exerciseLogId,
    setNumber: data.setNumber,
    isMakeup: data.isMakeup ?? false,
    reps: data.reps,
    weight: data.weight != null ? String(data.weight) : null,
    rpe: data.rpe != null ? String(data.rpe) : null,
    missed: data.missed ?? false,
    missReason: data.missed ? data.missReason ?? null : null,
  }

  // Check if set already exists
  const [existing] = await db
    .select()
    .from(setLog)
    .where(
      and(
        eq(setLog.exerciseLogId, data.exerciseLogId),
        eq(setLog.setNumber, data.setNumber),
        eq(setLog.isMakeup, data.isMakeup ?? false)
      )
    )
    .limit(1)

  let savedSet
  if (existing) {
    ;[savedSet] = await db
      .update(setLog)
      .set(payload)
      .where(eq(setLog.id, existing.id))
      .returning()
  } else {
    ;[savedSet] = await db.insert(setLog).values(payload as typeof setLog.$inferInsert).returning()
  }

  // Auto-update PB if applicable
  if (data.reps && data.weight && !data.missed) {
    const [el] = await db
      .select({ exerciseId: exerciseLog.exerciseId, workoutLogId: exerciseLog.workoutLogId })
      .from(exerciseLog)
      .where(eq(exerciseLog.id, data.exerciseLogId))
    if (el) {
      const [wl] = await db
        .select({ userId: workoutLog.userId })
        .from(workoutLog)
        .where(eq(workoutLog.id, el.workoutLogId))
      if (wl) {
        const newEstimate = calculateOneRepMax(data.weight, data.reps)
        const [currentPb] = await db
          .select()
          .from(personalBest)
          .where(
            and(
              eq(personalBest.userId, wl.userId),
              eq(personalBest.exerciseId, el.exerciseId)
            )
          )
          .orderBy(desc(personalBest.createdAt))
          .limit(1)

        if (!currentPb) {
          await db.insert(personalBest).values({
            userId: wl.userId,
            exerciseId: el.exerciseId,
            weight: String(data.weight),
            reps: data.reps,
          })
        } else {
          const existingEstimate =
            calculateOneRepMax(Number(currentPb.weight), currentPb.reps)
          if (newEstimate > existingEstimate) {
            await db.insert(personalBest).values({
              userId: wl.userId,
              exerciseId: el.exerciseId,
              weight: String(data.weight),
              reps: data.reps,
            })
          }
        }
      }
    }
  }

  return savedSet
}

export async function getSetLogs(exerciseLogId: number) {
  await getUserId()
  return db
    .select()
    .from(setLog)
    .where(eq(setLog.exerciseLogId, exerciseLogId))
    .orderBy(asc(setLog.setNumber))
}

// ── Workout log history ───────────────────────────────────────────────────────

export async function getWorkoutLogs() {
  const userId = await getUserId()
  return db
    .select()
    .from(workoutLog)
    .where(and(eq(workoutLog.userId, userId), eq(workoutLog.status, "completed")))
    .orderBy(desc(workoutLog.completedAt))
}

export async function getWorkoutLogDetail(id: number) {
  const userId = await getUserId()
  const [log] = await db
    .select()
    .from(workoutLog)
    .where(and(eq(workoutLog.id, id), eq(workoutLog.userId, userId)))
  if (!log) return null

  const exerciseLogs = await db
    .select({ el: exerciseLog, exercise })
    .from(exerciseLog)
    .innerJoin(exercise, eq(exerciseLog.exerciseId, exercise.id))
    .where(eq(exerciseLog.workoutLogId, id))
    .orderBy(asc(exerciseLog.orderIndex))

  const setsMap: Record<number, Awaited<ReturnType<typeof getSetLogs>>> = {}
  for (const { el } of exerciseLogs) {
    setsMap[el.id] = await db
      .select()
      .from(setLog)
      .where(eq(setLog.exerciseLogId, el.id))
      .orderBy(asc(setLog.setNumber))
  }

  return { log, exerciseLogs, setsMap }
}

// ── Seed workout from template ────────────────────────────────────────────────

export async function seedWorkoutFromTemplate(workoutLogId: number, templateId: number) {
  await getUserId()
  const exercises = await db
    .select({ te: templateExercise, exercise })
    .from(templateExercise)
    .innerJoin(exercise, eq(templateExercise.exerciseId, exercise.id))
    .where(eq(templateExercise.workoutTemplateId, templateId))
    .orderBy(asc(templateExercise.orderIndex))

  const result = []
  for (let i = 0; i < exercises.length; i++) {
    const { te } = exercises[i]
    const [el] = await db
      .insert(exerciseLog)
      .values({
        workoutLogId,
        exerciseId: te.exerciseId,
        orderIndex: te.orderIndex,
      })
      .returning()
    result.push(el)
  }
  return result
}
