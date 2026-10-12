export function validateSetLog(data: {
  exerciseName?: string
  reps?: number
  durationSeconds?: number
  weight?: number
}, freePick = false): string | null {
  if (data.weight != null && (!Number.isFinite(data.weight) || data.weight < 0)) return "Enter one valid weight in kg."
  if (data.reps != null && (!Number.isInteger(data.reps) || data.reps < 0)) return "Enter whole-number reps, zero or greater."
  if (data.durationSeconds != null && (!Number.isInteger(data.durationSeconds) || data.durationSeconds < 0)) return "Enter whole-number seconds, zero or greater."
  if (data.durationSeconds != null && data.reps != null) return "Log either seconds or reps for a set."
  if (freePick) {
    if (!data.exerciseName?.trim()) return "Enter the exercise you chose."
    if (data.weight == null) return "Enter a weight in kg for your free-pick exercise (use 0 kg for bodyweight)."
    if (data.reps == null && data.durationSeconds == null) return "Enter reps or seconds for your free-pick exercise."
  }
  return null
}
