import { getExercises, getPersonalBests } from "@/lib/actions/exercises"
import { ExerciseLibrary } from "./exercise-library"

export default async function ExercisesPage() {
  const [exercises, pbs] = await Promise.all([getExercises(), getPersonalBests()])
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Exercises &amp; Personal Bests</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage the exercise library and track your personal records.
        </p>
      </div>
      <ExerciseLibrary initialExercises={exercises} initialPbs={pbs} />
    </div>
  )
}
