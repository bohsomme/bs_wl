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
        dayOfWeek: t.dayOfWeek,
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

export async function setActiveProgram(id: number) {
  const userId = await getUserId()
  // deactivate all first
  await db
    .update(program)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(program.userId, userId))
  // activate chosen
  await db
    .update(program)
    .set({ isActive: true, updatedAt: new Date() })
    .where(and(eq(program.id, id), eq(program.userId, userId)))
  revalidatePath("/programs")
  revalidatePath("/")
}

// ── Workout Templates ───────────────────────────────────────────────────────

export async function getWorkoutTemplates(programId: number) {
  return db
    .select()
    .from(workoutTemplate)
    .where(eq(workoutTemplate.programId, programId))
    .orderBy(asc(workoutTemplate.weekNumber), asc(workoutTemplate.dayOfWeek))
}

export async function createWorkoutTemplate(data: {
  programId: number
  name: string
  weekNumber: number
  dayOfWeek: number
}) {
  await getUserId()
  const [t] = await db.insert(workoutTemplate).values(data).returning()
  revalidatePath(`/programs/${data.programId}`)
  return t
}

export async function updateWorkoutTemplate(
  id: number,
  data: Partial<{ name: string; weekNumber: number; dayOfWeek: number }>
) {
  await getUserId()
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
      dayOfWeek: data.targetDay,
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
  weightType: string
  weightValue?: number
  rpeTarget?: number
  notes?: string
}) {
  await getUserId()
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
  await getUserId()
  const [te] = await db
    .update(templateExercise)
    .set({
      ...data,
      weightValue: data.weightValue != null ? String(data.weightValue) : data.weightValue === null ? null : undefined,
      rpeTarget: data.rpeTarget != null ? String(data.rpeTarget) : data.rpeTarget === null ? null : undefined,
    })
    .where(eq(templateExercise.id, id))
    .returning()
  return te
}

export async function deleteTemplateExercise(id: number) {
  await getUserId()
  await db.delete(templateExercise).where(eq(templateExercise.id, id))
}
