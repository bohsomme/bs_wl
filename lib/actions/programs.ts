"use server"

import { db } from "@/lib/db"
import { program, workoutTemplate, templateExercise, templateFunctionalBlock } from "@/lib/db/schema"
import { asc, eq, and } from "drizzle-orm"
import { getUserId } from "./auth"
import { revalidatePath } from "next/cache"

export async function getPrograms() {
  const userId = await getUserId()
  return db
    .select()
    .from(program)
    .where(eq(program.userId, userId))
    .orderBy(asc(program.createdAt))
}

export async function getProgram(id: number) {
  const userId = await getUserId()
  const [p] = await db
    .select()
    .from(program)
    .where(and(eq(program.id, id), eq(program.userId, userId)))
  return p ?? null
}

export async function createProgram(data: {
  name: string
  description?: string
  totalWeeks: number
}) {
  const userId = await getUserId()
  const [p] = await db
    .insert(program)
    .values({ ...data, userId })
    .returning()
  revalidatePath("/programs")
  return p
}

export async function updateProgram(
  id: number,
  data: Partial<{ name: string; description: string; totalWeeks: number; isActive: boolean }>
) {
  const userId = await getUserId()
  const [p] = await db
    .update(program)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(program.id, id), eq(program.userId, userId)))
    .returning()
  revalidatePath("/programs")
  return p
}

export async function deleteProgram(id: number) {
  const userId = await getUserId()
  // cascade: delete workout templates + their exercises first
  const templates = await db
    .select()
    .from(workoutTemplate)
    .where(eq(workoutTemplate.programId, id))
  for (const t of templates) {
    await db.delete(templateExercise).where(eq(templateExercise.workoutTemplateId, t.id))
    await db.delete(templateFunctionalBlock).where(eq(templateFunctionalBlock.workoutTemplateId, t.id))
  }
  await db.delete(workoutTemplate).where(eq(workoutTemplate.programId, id))
  await db.delete(program).where(and(eq(program.id, id), eq(program.userId, userId)))
  revalidatePath("/programs")
}

export async function duplicateProgram(id: number) {
  const userId = await getUserId()
  const [source] = await db
    .select()
    .from(program)
    .where(and(eq(program.id, id), eq(program.userId, userId)))
  if (!source) throw new Error("Program not found")

  const [newProgram] = await db
    .insert(program)
    .values({
      userId,
      name: `${source.name} (Copy)`,
      description: source.description,
      totalWeeks: source.totalWeeks,
      isActive: false,
    })
    .returning()

  const templates = await db
    .select()
    .from(workoutTemplate)
    .where(eq(workoutTemplate.programId, id))

  for (const t of templates) {
    const [newTemplate] = await db
      .insert(workoutTemplate)
      .values({
        programId: newProgram.id,
        name: t.name,
        weekNumber: t.weekNumber,
        dayNumber: t.dayNumber,
        orderInDay: t.orderInDay,
      })
      .returning()

    const exercises = await db
      .select()
      .from(templateExercise)
      .where(eq(templateExercise.workoutTemplateId, t.id))

    for (const ex of exercises) {
      await db.insert(templateExercise).values({
        workoutTemplateId: newTemplate.id,
        exerciseId: ex.exerciseId,
        orderIndex: ex.orderIndex,
        section: ex.section,
        superset: ex.superset,
        totalRepsMin: ex.totalRepsMin,
        totalRepsMax: ex.totalRepsMax,
        percentages: ex.percentages,
        setsMin: ex.setsMin,
        setsMax: ex.setsMax,
        repsMin: ex.repsMin,
        repsMax: ex.repsMax,
        weightType: ex.weightType,
        weightValue: ex.weightValue,
        rpeTarget: ex.rpeTarget,
        notes: ex.notes,
      })
    }

    const blocks = await db
      .select()
      .from(templateFunctionalBlock)
      .where(eq(templateFunctionalBlock.workoutTemplateId, t.id))

    for (const b of blocks) {
      await db.insert(templateFunctionalBlock).values({
        workoutTemplateId: newTemplate.id,
        orderIndex: b.orderIndex,
        kind: b.kind,
        title: b.title,
        source: b.source,
        details: b.details,
        durationMin: b.durationMin,
      })
    }
  }

  revalidatePath("/programs")
  return newProgram
}

export async function setActiveProgram(id: number, startDate: string) {
  const userId = await getUserId()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !Number.isFinite(Date.parse(startDate)) || new Date(startDate).toISOString().slice(0, 10) !== startDate) throw new Error("Choose a valid start date")
  await db.transaction(async (tx) => {
    const [chosen] = await tx.select().from(program).where(and(eq(program.id, id), eq(program.userId, userId)))
    if (!chosen) throw new Error("Program not found")
    await tx.update(program).set({ isActive: false, updatedAt: new Date() }).where(eq(program.userId, userId))
    await tx.update(program).set({ isActive: true, startDate, assignedAt: new Date(), updatedAt: new Date() }).where(and(eq(program.id, id), eq(program.userId, userId)))
  })
  revalidatePath("/programs")
  revalidatePath("/")
}

// ── Workout Templates ───────────────────────────────────────────────────────

export async function getWorkoutTemplates(programId: number) {
  return db
    .select()
    .from(workoutTemplate)
    .where(eq(workoutTemplate.programId, programId))
    .orderBy(asc(workoutTemplate.weekNumber), asc(workoutTemplate.dayNumber))
}

export async function createWorkoutTemplate(data: {
  programId: number
  name: string
  weekNumber: number
  dayNumber: number
}) {
  await getUserId()
  if (!Number.isInteger(data.dayNumber) || data.dayNumber < 1 || data.dayNumber > 7) throw new Error("Choose Day 1-7")
  const [t] = await db.insert(workoutTemplate).values(data).returning()
  revalidatePath(`/programs/${data.programId}`)
  return t
}

export async function updateWorkoutTemplate(
  id: number,
  data: Partial<{ name: string; weekNumber: number; dayNumber: number }>
) {
  await getUserId()
  if (data.dayNumber !== undefined && (!Number.isInteger(data.dayNumber) || data.dayNumber < 1 || data.dayNumber > 7)) throw new Error("Choose Day 1-7")
  const [t] = await db
    .update(workoutTemplate)
    .set(data)
    .where(eq(workoutTemplate.id, id))
    .returning()
  return t
}

export async function deleteWorkoutTemplate(id: number, programId: number) {
  await getUserId()
  await db.delete(templateExercise).where(eq(templateExercise.workoutTemplateId, id))
  await db.delete(templateFunctionalBlock).where(eq(templateFunctionalBlock.workoutTemplateId, id))
  await db.delete(workoutTemplate).where(eq(workoutTemplate.id, id))
  revalidatePath(`/programs/${programId}`)
}

// Duplicate a whole training day (template) to another week/day, copying its
// exercises and functional-fitness blocks.
export async function duplicateWorkoutTemplate(data: {
  templateId: number
  targetWeek: number
  targetDay: number
  programId: number
}) {
  await getUserId()

  const [source] = await db
    .select()
    .from(workoutTemplate)
    .where(eq(workoutTemplate.id, data.templateId))
  if (!source) throw new Error("Workout not found")

  const [newTemplate] = await db
    .insert(workoutTemplate)
    .values({
      programId: source.programId,
      name: source.name,
      weekNumber: data.targetWeek,
      dayNumber: data.targetDay,
      orderInDay: source.orderInDay,
    })
    .returning()

  const exercises = await db
    .select()
    .from(templateExercise)
    .where(eq(templateExercise.workoutTemplateId, data.templateId))

  for (const ex of exercises) {
    await db.insert(templateExercise).values({
      workoutTemplateId: newTemplate.id,
      exerciseId: ex.exerciseId,
      orderIndex: ex.orderIndex,
      section: ex.section,
      superset: ex.superset,
      totalRepsMin: ex.totalRepsMin,
      totalRepsMax: ex.totalRepsMax,
      percentages: ex.percentages,
      setsMin: ex.setsMin,
      setsMax: ex.setsMax,
      repsMin: ex.repsMin,
      repsMax: ex.repsMax,
      weightType: ex.weightType,
      weightValue: ex.weightValue,
      rpeTarget: ex.rpeTarget,
      notes: ex.notes,
    })
  }

  const blocks = await db
    .select()
    .from(templateFunctionalBlock)
    .where(eq(templateFunctionalBlock.workoutTemplateId, data.templateId))

  for (const b of blocks) {
    await db.insert(templateFunctionalBlock).values({
      workoutTemplateId: newTemplate.id,
      orderIndex: b.orderIndex,
      kind: b.kind,
      title: b.title,
      source: b.source,
      details: b.details,
      durationMin: b.durationMin,
    })
  }

  revalidatePath(`/programs/${data.programId}`)
  return newTemplate
}

// ── Functional Fitness blocks ────────────────────────────────────────────────

export async function getFunctionalBlocks(workoutTemplateId: number) {
  return db
    .select()
    .from(templateFunctionalBlock)
    .where(eq(templateFunctionalBlock.workoutTemplateId, workoutTemplateId))
    .orderBy(asc(templateFunctionalBlock.orderIndex))
}

export async function addFunctionalBlock(data: {
  workoutTemplateId: number
  kind: string
  title?: string
  source?: string
  details?: string
  durationMin?: number
  orderIndex?: number
}) {
  await getUserId()
  const [block] = await db
    .insert(templateFunctionalBlock)
    .values({
      workoutTemplateId: data.workoutTemplateId,
      kind: data.kind,
      title: data.title || null,
      source: data.source || null,
      details: data.details || null,
      durationMin: data.durationMin ?? null,
      orderIndex: data.orderIndex ?? 0,
    })
    .returning()
  return block
}

export async function deleteFunctionalBlock(id: number) {
  await getUserId()
  await db.delete(templateFunctionalBlock).where(eq(templateFunctionalBlock.id, id))
}

// ── Template Exercises ──────────────────────────────────────────────────────

export async function getTemplateExercises(workoutTemplateId: number) {
  const { exercise } = await import("@/lib/db/schema")
  return db
    .select({ te: templateExercise, exercise })
    .from(templateExercise)
    .innerJoin(exercise, eq(templateExercise.exerciseId, exercise.id))
    .where(eq(templateExercise.workoutTemplateId, workoutTemplateId))
    .orderBy(asc(templateExercise.orderIndex))
}

export async function addTemplateExercise(data: {
  workoutTemplateId: number
  exerciseId: number
  orderIndex?: number
  setsMin: number
  setsMax?: number
  repsMin: number
  repsMax?: number
  section?: string
  superset?: string
  totalRepsMin?: number
  totalRepsMax?: number
  percentages?: import("@/lib/prescription").PercentageTarget[]
  weightType: string
  weightValue?: number
  rpeTarget?: number
  notes?: string
}) {
  await getUserId()
  for (const [min, max] of [[data.setsMin, data.setsMax], [data.repsMin, data.repsMax], [data.totalRepsMin, data.totalRepsMax]]) {
    if ((min != null && (!Number.isInteger(min) || min < 1)) || (max != null && (min == null || !Number.isInteger(max) || max < min))) throw new Error("Enter valid, ordered set and rep ranges.")
  }
  if (data.percentages) {
    const { parsePercentages, formatTarget } = await import("@/lib/prescription")
    parsePercentages(data.percentages.map(formatTarget).join(","))
    if (data.percentages.length !== 1 && data.percentages.length !== (data.setsMax ?? data.setsMin)) throw new Error("Specify a percentage for every possible set.")
  }
  if (data.rpeTarget != null && (!Number.isFinite(data.rpeTarget) || data.rpeTarget < 1 || data.rpeTarget > 10)) throw new Error("RPE must be between 1 and 10.")
  const [te] = await db
    .insert(templateExercise)
    .values({
      ...data,
      weightValue: data.weightValue != null ? String(data.weightValue) : null,
      rpeTarget: data.rpeTarget != null ? String(data.rpeTarget) : null,
    })
    .returning()
  return te
}

export async function updateTemplateExercise(
  id: number,
  data: Partial<{
    exerciseId: number
    section: string
    superset: string | null
    totalRepsMin: number | null
    totalRepsMax: number | null
    percentages: import("@/lib/prescription").PercentageTarget[] | null
    setsMin: number
    setsMax: number | null
    repsMin: number
    repsMax: number | null
    weightType: string
    weightValue: number | null
    rpeTarget: number | null
    notes: string | null
    orderIndex: number
  }>
) {
  const userId = await getUserId()
  const [existing] = await db.select({ te: templateExercise, programId: program.id })
    .from(templateExercise)
    .innerJoin(workoutTemplate, eq(templateExercise.workoutTemplateId, workoutTemplate.id))
    .innerJoin(program, eq(workoutTemplate.programId, program.id))
    .where(and(eq(templateExercise.id, id), eq(program.userId, userId)))
  if (!existing) throw new Error("Exercise not found")
  const next = { ...existing.te, ...data }
  for (const [min, max] of [[next.setsMin, next.setsMax], [next.repsMin, next.repsMax], [next.totalRepsMin, next.totalRepsMax]]) {
    if ((min != null && (!Number.isInteger(min) || min < 1)) || (max != null && (min == null || !Number.isInteger(max) || max < min))) throw new Error("Enter valid, ordered set and rep ranges.")
  }
  if (next.percentages) {
    const { parsePercentages, formatTarget } = await import("@/lib/prescription")
    parsePercentages(next.percentages.map(formatTarget).join(","))
    if (next.percentages.length !== 1 && next.percentages.length !== (next.setsMax ?? next.setsMin)) throw new Error("Specify a percentage for every possible set.")
  }
  if (next.rpeTarget != null && (!Number.isFinite(Number(next.rpeTarget)) || Number(next.rpeTarget) < 1 || Number(next.rpeTarget) > 10)) throw new Error("RPE must be between 1 and 10.")
  const [te] = await db
    .update(templateExercise)
    .set({
      ...data,
      weightValue: data.weightValue != null ? String(data.weightValue) : data.weightValue === null ? null : undefined,
      rpeTarget: data.rpeTarget != null ? String(data.rpeTarget) : data.rpeTarget === null ? null : undefined,
    })
    .where(eq(templateExercise.id, id))
    .returning()
  revalidatePath(`/programs/${existing.programId}`)
  return te
}

export async function deleteTemplateExercise(id: number) {
  await getUserId()
  await db.delete(templateExercise).where(eq(templateExercise.id, id))
}
