"use server"

import { db } from "@/lib/db"
import { exercise, personalBest } from "@/lib/db/schema"
import { asc, desc, eq, and } from "drizzle-orm"
import { getUserId } from "./auth"
import { revalidatePath } from "next/cache"

export async function getExercises() {
  return db.select().from(exercise).orderBy(asc(exercise.name))
}

export async function addExercise(data: {
  name: string
  muscleGroup?: string
  description?: string
}) {
  await getUserId() // must be logged in
  const [ex] = await db.insert(exercise).values(data).returning()
  revalidatePath("/exercises")
  return ex
}

export async function deleteExercise(id: number) {
  await getUserId()
  await db.delete(exercise).where(eq(exercise.id, id))
  revalidatePath("/exercises")
}

export async function getPersonalBests() {
  const userId = await getUserId()
  return db
    .select({
      pb: personalBest,
      exercise: exercise,
    })
    .from(personalBest)
    .innerJoin(exercise, eq(personalBest.exerciseId, exercise.id))
    .where(eq(personalBest.userId, userId))
    .orderBy(asc(exercise.name))
}

export async function setPersonalBest(data: {
  exerciseId: number
  weight: number
  reps: number
  setAt?: Date
}) {
  const userId = await getUserId()
  // Check if current PB is higher (1RM estimate: weight * (1 + reps/30))
  const existing = await db
    .select()
    .from(personalBest)
    .where(and(eq(personalBest.userId, userId), eq(personalBest.exerciseId, data.exerciseId)))
    .orderBy(desc(personalBest.createdAt))
    .limit(1)

  const newEstimate = data.weight * (1 + data.reps / 30)
  if (existing.length > 0) {
    const existingEstimate =
      Number(existing[0].weight) * (1 + Number(existing[0].reps) / 30)
    if (newEstimate <= existingEstimate) return null
  }

  const [pb] = await db
    .insert(personalBest)
    .values({
      userId,
      exerciseId: data.exerciseId,
      weight: String(data.weight),
      reps: data.reps,
      setAt: data.setAt ?? new Date(),
    })
    .returning()
  revalidatePath("/exercises")
  return pb
}

export async function upsertPersonalBest(data: {
  exerciseId: number
  weight: number
  reps: number
}) {
  const userId = await getUserId()
  const [pb] = await db
    .insert(personalBest)
    .values({
      userId,
      exerciseId: data.exerciseId,
      weight: String(data.weight),
      reps: data.reps,
    })
    .returning()
  revalidatePath("/exercises")
  return pb
}
