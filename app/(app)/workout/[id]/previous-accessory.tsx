import type { WorkoutDetails } from "./workout-types"

export function PreviousAccessory({ previous, freePick = false }: {
  previous: NonNullable<WorkoutDetails["previousAccessoryMap"]>[number] | undefined
  freePick?: boolean
}) {
  if (!previous) return <p className="text-xs text-muted-foreground">No previous sets logged.</p>

  return <div className="space-y-1 text-xs text-muted-foreground">
    <p className="font-medium">
      Last time{freePick ? " for these criteria" : ""} ({previous.date})
      {freePick ? ": " + (previous.exerciseName || "Unnamed exercise") : ""}
      {" — "}{previous.sets.length} logged {previous.sets.length === 1 ? "set" : "sets"}
    </p>
    <ul className="flex flex-wrap gap-x-3 gap-y-1">
      {previous.sets.map((set) => <li key={set.id}>
        {set.isMakeup ? "Makeup" : "Set"} {set.setNumber}: {set.weight != null ? Number(set.weight) + " kg" : "Weight not logged"}
        {set.durationSeconds != null ? " × " + set.durationSeconds + " sec" : set.reps != null ? " × " + set.reps + " reps" : ""}
        {set.missed ? " (missed)" : ""}
      </li>)}
    </ul>
  </div>
}
