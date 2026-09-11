/** Epley estimate; a completed single is already a measured 1RM. */
export function calculateOneRepMax(weight: number, reps: number): number {
  return reps > 1 ? weight * (1 + reps / 30) : weight
}
