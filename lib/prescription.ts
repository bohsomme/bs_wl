export type PercentageTarget = { min: number; max?: number }

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
