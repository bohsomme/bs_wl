import { notFound, redirect } from "next/navigation"
import { getWorkoutWithDetails } from "@/lib/actions/workouts"
import { getExercises, getPersonalBests } from "@/lib/actions/exercises"
import { WorkoutSession } from "./workout-session"
import { calculateOneRepMax } from "@/lib/strength"

interface Props {
  params: Promise<{ id: string }>
}

export default async function WorkoutPage({ params }: Props) {
  const { id } = await params
  const workoutId = Number(id)
  if (isNaN(workoutId)) notFound()

  const [details, exercises, personalBests] = await Promise.all([
    getWorkoutWithDetails(workoutId),
    getExercises(),
    getPersonalBests(),
  ])

  if (!details) notFound()
  if (details.log.status === "completed") redirect(`/log/${workoutId}`)

  const pbWeights: Record<number, string> = {}
  for (const { pb } of personalBests.sort((a, b) =>
    a.pb.createdAt.getTime() - b.pb.createdAt.getTime() || a.pb.id - b.pb.id
  )) {
    pbWeights[pb.exerciseId] = String(calculateOneRepMax(Number(pb.weight), pb.reps))
  }

  return <WorkoutSession details={details} exercises={exercises} pbWeights={pbWeights} />
}
