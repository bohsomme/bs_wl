import { notFound } from "next/navigation"
import { getWorkoutWithDetails } from "@/lib/actions/workouts"
import { getExercises } from "@/lib/actions/exercises"
import { WorkoutSession } from "./workout-session"

interface Props {
  params: Promise<{ id: string }>
}

export default async function WorkoutPage({ params }: Props) {
  const { id } = await params
  const workoutId = Number(id)
  if (isNaN(workoutId)) notFound()

  const [details, exercises] = await Promise.all([
    getWorkoutWithDetails(workoutId),
    getExercises(),
  ])

  if (!details) notFound()

  return <WorkoutSession details={details} exercises={exercises} />
}
