export type PercentageTarget = { min: number; max?: number }

type ExerciseTarget = {
  repsMin: number
  repsMax?: number | null
  durationSecondsMin?: number | null
  durationSecondsMax?: number | null
}

export function exerciseTarget(p: ExerciseTarget) {
  const timed = p.durationSecondsMin != null
  return {
    timed,
    min: timed ? p.durationSecondsMin! : p.repsMin,
    max: (timed ? p.durationSecondsMax : p.repsMax) ?? null,
    unit: timed ? "sec" : "reps",
  }
}

export function describeExerciseTarget(p: ExerciseTarget) {
  const target = exerciseTarget(p)
  return `${formatTarget({ min: target.min, max: target.max ?? undefined })} ${target.unit}`
}

export function validateDurationTarget(p: {
  durationSecondsMin?: number | null
  durationSecondsMax?: number | null
  totalRepsMin?: number | null
  totalRepsMax?: number | null
}) {
  const min = p.durationSecondsMin, max = p.durationSecondsMax
  if ((min != null && (!Number.isInteger(min) || min < 1)) ||
    (max != null && (min == null || !Number.isInteger(max) || max < min))) {
    throw new Error("Enter positive whole seconds with the maximum at least the minimum.")
  }
  if (min != null && (p.totalRepsMin != null || p.totalRepsMax != null)) {
    throw new Error("Timed exercises cannot have a total reps target.")
  }
}

export function parsePercentages(value: string): PercentageTarget[] {
  return value.split(",").map((part) => {
    const match = part.trim().match(/^(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?$/)
    if (!match) throw new Error("Use percentages such as 75, 75-80, or 70, 75, 80.")
    const min = Number(match[1]), max = match[2] ? Number(match[2]) : undefined
    if (min <= 0 || min > 150 || (max !== undefined && (max < min || max > 150))) throw new Error("Percentages must be ordered and between 0 and 150.")
    return { min, ...(max === undefined ? {} : { max }) }
  })
}

export function percentageAt(te: { weightValue: string | null; percentages: PercentageTarget[] | null }, set: number): PercentageTarget | undefined {
  return te.percentages?.[set - 1] ?? te.percentages?.[te.percentages.length - 1]
    ?? (te.weightValue == null ? undefined : { min: Number(te.weightValue) })
}

export function formatTarget(target: PercentageTarget) {
  return target.max != null && target.max !== target.min ? `${target.min}-${target.max}` : String(target.min)
}

export function weightTarget(target: PercentageTarget, pb: number) {
  const kg = (percent: number) => Number((pb * percent / 100).toFixed(2))
  return formatTarget({ min: kg(target.min), max: target.max == null ? undefined : kg(target.max) })
}

export function rangeStatus(value: number, min: number, max: number | null) {
  return value < min ? "Below" : value > (max ?? min) ? "Above" : "Within"
}
