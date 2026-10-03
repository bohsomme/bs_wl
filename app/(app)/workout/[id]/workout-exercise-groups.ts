import type { ExerciseLogRow, WorkoutDetails } from "./workout-types"

// Keep each superset together, even when its members aren't adjacent in the plan.
export function groupWorkoutExercises(rows: ExerciseLogRow[], prescriptions: WorkoutDetails["prescriptionMap"]) {
  const groups: ExerciseLogRow[][] = []
  const supersets = new Map<string, ExerciseLogRow[]>()

  for (const row of rows) {
    const prescription = prescriptions[row.el.id]
    const superset = prescription ? prescription.superset : row.el.superset
    if (!superset) {
      groups.push([row])
      continue
    }

    const key = JSON.stringify([prescription?.section ?? "accessory", superset])
    const group = supersets.get(key)
    if (group) group.push(row)
    else {
      const members = [row]
      supersets.set(key, members)
      groups.push(members)
    }
  }

  return groups
}
