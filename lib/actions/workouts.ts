"use server"
import { calculateOneRepMax } from "@/lib/strength"
import type { WorkoutPlan } from "@/lib/workout-plan"

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
import { asc, desc, eq, and, gte, gt, sql, inArray } from "drizzle-orm"
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
    .where(and(eq(workoutTemplate.programId, activeProgram.id), eq(workoutTemplate.isRestDay, false)))
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
  if (data.workoutTemplateId) {
    const log = await db.transaction(async (tx) => {
      const [owned] = await tx.select({ t: workoutTemplate }).from(workoutTemplate)
        .innerJoin(program, eq(workoutTemplate.programId, program.id))
        .where(and(eq(workoutTemplate.id, data.workoutTemplateId!), eq(program.userId, userId)))
      if (!owned || owned.t.isRestDay) throw new Error("Choose a workout, not a rest day.")
      if (data.programId != null && data.programId !== owned.t.programId) throw new Error("Workout does not belong to this program")
      const rows = await tx.select({ te: templateExercise, exercise }).from(templateExercise)
        .leftJoin(exercise, eq(templateExercise.exerciseId, exercise.id))
        .where(eq(templateExercise.workoutTemplateId, owned.t.id))
        .orderBy(asc(templateExercise.orderIndex), asc(templateExercise.id))
      const blocks = await tx.select().from(templateFunctionalBlock)
        .where(eq(templateFunctionalBlock.workoutTemplateId, owned.t.id)).orderBy(asc(templateFunctionalBlock.orderIndex))
      const bests = await tx.select().from(personalBest).where(eq(personalBest.userId, userId))
        .orderBy(asc(personalBest.createdAt), asc(personalBest.id))
      const pbWeights = new Map(bests.map((pb) => [pb.exerciseId, calculateOneRepMax(Number(pb.weight), pb.reps)]))
      const { id, name, weekNumber, dayNumber, orderInDay, isRestDay } = owned.t
      const plannedSnapshot: WorkoutPlan = {
        capturedAt: new Date().toISOString(),
        template: { id, name, weekNumber, dayNumber, orderInDay, isRestDay },
        exercises: rows.map(({ te, exercise: ex }) => {
          const { createdAt: _createdAt, ...prescription } = te
          return {
            prescription,
            exercise: ex ? { id: ex.id, name: ex.name, muscleGroup: ex.muscleGroup, description: ex.description } : null,
            estimatedOneRepMaxKg: te.exerciseId == null ? null : pbWeights.get(te.exerciseId) ?? null,
          }
        }),
        functionalBlocks: blocks.map(({ createdAt: _createdAt, ...block }) => block),
      }
      const [saved] = await tx.insert(workoutLog).values({ ...data, userId, programId: owned.t.programId, plannedSnapshot }).returning()
      // Seed atomically from the same plan that will be shown and exported.
      if (rows.length) await tx.insert(exerciseLog).values(rows.map(({ te }) => ({
        workoutLogId: saved.id, templateExerciseId: te.id, exerciseId: te.exerciseId,
        freePickCriteria: te.freePickCriteria, superset: te.superset, orderIndex: te.orderIndex,
      })))
      return saved
    }, { isolationLevel: "repeatable read" })
    revalidatePath("/dashboard")
    return log
  }
  if (data.programId) {
    const [owned] = await db.select({ id: program.id }).from(program).where(and(eq(program.id, data.programId), eq(program.userId, userId)))
    if (!owned) throw new Error("Program not found")
  }
  const [log] = await db
    .insert(workoutLog)
    .values({ ...data, userId })
    .returning()
  revalidatePath("/dashboard")
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
    functionalNotes: string
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
  revalidatePath(`/log/${id}`)
  revalidatePath(`/workout/${id}`)
  revalidatePath("/dashboard")
  return log
}

export async function deleteWorkoutLog(id: number) {
  const userId = await getUserId()
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Invalid workout ID")

  await db.transaction(async (tx) => {
    const [owned] = await tx.select({ id: workoutLog.id }).from(workoutLog)
      .where(and(eq(workoutLog.id, id), eq(workoutLog.userId, userId)))
      .for("update")
    if (!owned) throw new Error("Workout not found")

    const exercises = tx.select({ id: exerciseLog.id }).from(exerciseLog)
      .where(eq(exerciseLog.workoutLogId, id))
    await tx.delete(setLog).where(inArray(setLog.exerciseLogId, exercises))
    await tx.delete(exerciseLog).where(eq(exerciseLog.workoutLogId, id))
    await tx.delete(workoutLog).where(and(eq(workoutLog.id, id), eq(workoutLog.userId, userId)))
  })

  revalidatePath("/log")
  revalidatePath(`/log/${id}`)
  revalidatePath(`/workout/${id}`)
  revalidatePath("/dashboard")
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
    .leftJoin(exercise, eq(exerciseLog.exerciseId, exercise.id))
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

  const prescriptions = log.plannedSnapshot
    ? log.plannedSnapshot.exercises.map(({ prescription }) => ({ ...prescription, createdAt: new Date(log.plannedSnapshot!.capturedAt) }))
    : log.workoutTemplateId
    ? await db
        .select()
        .from(templateExercise)
        .where(eq(templateExercise.workoutTemplateId, log.workoutTemplateId))
    : []

  const prescriptionMap: Record<number, typeof templateExercise.$inferSelect> = {}
  for (const { el } of exerciseLogs) {
    // Snapshot IDs distinguish repeated lifts; older logs use identity and position.
    const prescription = prescriptions.find(
      (te) => el.templateExerciseId != null
        ? te.id === el.templateExerciseId
        : !log.plannedSnapshot && te.exerciseId === el.exerciseId && te.orderIndex === el.orderIndex
    )
    if (prescription) prescriptionMap[el.id] = prescription
  }

  // Prefer the saved plan; older workouts still use the source template.
  const functionalBlocks = log.plannedSnapshot
    ? log.plannedSnapshot.functionalBlocks.map((block) => ({ ...block, createdAt: new Date(log.plannedSnapshot!.capturedAt) }))
    : log.workoutTemplateId
    ? await db
        .select()
        .from(templateFunctionalBlock)
        .where(eq(templateFunctionalBlock.workoutTemplateId, log.workoutTemplateId))
        .orderBy(asc(templateFunctionalBlock.orderIndex))
    : []

  return { log, exerciseLogs, prescriptionMap, setsMap, functionalBlocks }
}

// ── Exercise logs ────────────────────────────────────────────────────────────

export async function addExerciseLog(data: {
  workoutLogId: number
  exerciseId: number
  orderIndex: number
}) {
  const userId = await getUserId()
  const [owned] = await db.select().from(workoutLog).where(and(eq(workoutLog.id, data.workoutLogId), eq(workoutLog.userId, userId), eq(workoutLog.status, "in_progress")))
  if (!owned) throw new Error("Active workout not found")
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
  exerciseName?: string
  isMakeup?: boolean
  reps?: number
  weight?: number
  rpe?: number
  missed?: boolean
  missReason?: string
}) {
  const userId = await getUserId()
  if (data.weight != null && (!Number.isFinite(data.weight) || data.weight < 0)) throw new Error("Enter one valid weight in kg.")
  if (data.reps != null && (!Number.isInteger(data.reps) || data.reps < 0)) throw new Error("Enter whole-number reps, zero or greater.")

  const [owned] = await db.select({ el: exerciseLog }).from(exerciseLog)
    .innerJoin(workoutLog, eq(exerciseLog.workoutLogId, workoutLog.id))
    .where(and(eq(exerciseLog.id, data.exerciseLogId), eq(workoutLog.userId, userId)))
  if (!owned) throw new Error("Exercise not found")
  if (owned.el.exerciseId == null) {
    if (!data.exerciseName?.trim()) throw new Error("Enter the exercise you chose.")
    if (data.reps == null || data.weight == null) throw new Error("Enter reps and weight for your free-pick exercise (use 0 kg for bodyweight).")
    await db.update(exerciseLog).set({ exerciseName: data.exerciseName.trim() }).where(eq(exerciseLog.id, data.exerciseLogId))
  }

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
    if (el?.exerciseId != null) {
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

export async function removeWorkoutSet(exerciseLogId: number, setNumber: number, isMakeup: boolean) {
  const userId = await getUserId()
  if (!Number.isInteger(setNumber) || setNumber < 1) throw new Error("Invalid set number")
  await db.transaction(async (tx) => {
    const [owned] = await tx.select({ id: exerciseLog.id }).from(exerciseLog)
      .innerJoin(workoutLog, eq(exerciseLog.workoutLogId, workoutLog.id))
      .where(and(eq(exerciseLog.id, exerciseLogId), eq(workoutLog.userId, userId)))
    if (!owned) throw new Error("Exercise not found")
    await tx.delete(setLog).where(and(eq(setLog.exerciseLogId, exerciseLogId), eq(setLog.setNumber, setNumber), eq(setLog.isMakeup, isMakeup)))
    await tx.update(setLog).set({ setNumber: sql`${setLog.setNumber} - 1` })
      .where(and(eq(setLog.exerciseLogId, exerciseLogId), gt(setLog.setNumber, setNumber), eq(setLog.isMakeup, isMakeup)))
  })
  revalidatePath("/log")
  revalidatePath("/dashboard")
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
    .leftJoin(exercise, eq(exerciseLog.exerciseId, exercise.id))
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
  const userId = await getUserId()
  return db.transaction(async (tx) => {
    const [owned] = await tx.select().from(workoutLog)
      .where(and(eq(workoutLog.id, workoutLogId), eq(workoutLog.userId, userId))).for("update")
    if (!owned || owned.workoutTemplateId !== templateId || owned.status !== "in_progress") throw new Error("Active workout not found")
    const existing = await tx.select().from(exerciseLog).where(eq(exerciseLog.workoutLogId, workoutLogId)).orderBy(asc(exerciseLog.orderIndex))
    // Older clients still call this after startWorkout. New workouts are already
    // seeded atomically; a retry must never duplicate exercises or reread edits.
    if (owned.plannedSnapshot || existing.length) return existing
    const [template] = await tx.select({ id: workoutTemplate.id }).from(workoutTemplate)
      .innerJoin(program, eq(workoutTemplate.programId, program.id))
      .where(and(eq(workoutTemplate.id, templateId), eq(program.userId, userId)))
    if (!template) throw new Error("Workout not found")
    const exercises = await tx
      .select({ te: templateExercise, exercise })
      .from(templateExercise)
      .leftJoin(exercise, eq(templateExercise.exerciseId, exercise.id))
      .where(eq(templateExercise.workoutTemplateId, templateId))
      .orderBy(asc(templateExercise.orderIndex))

    const result = []
    for (let i = 0; i < exercises.length; i++) {
      const { te } = exercises[i]
      const [el] = await tx
        .insert(exerciseLog)
        .values({
          workoutLogId,
          templateExerciseId: te.id,
          exerciseId: te.exerciseId,
          freePickCriteria: te.freePickCriteria,
          superset: te.superset,
          orderIndex: te.orderIndex,
        })
        .returning()
      result.push(el)
    }
    return result
  })
}
