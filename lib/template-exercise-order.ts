type OrderedExercise = { te: { id: number; section: string; superset: string | null } }

/** Match workout navigation: keep superset members together in their saved order. */
export function groupTemplateExercises<T extends OrderedExercise>(rows: T[]): T[][] {
  const groups: T[][] = []
  const supersets = new Map<string, T[]>()
  for (const row of rows) {
    const name = row.te.section === "accessory" ? row.te.superset : null
    if (!name) { groups.push([row]); continue }
    const group = supersets.get(name)
    if (group) group.push(row)
    else { const members = [row]; supersets.set(name, members); groups.push(members) }
  }
  return groups
}

export function moveTemplateExercise<T extends OrderedExercise>(rows: T[], id: number, direction: -1 | 1): number[] | null {
  const row = rows.find((row) => row.te.id === id)
  if (!row) return null
  const groups = groupTemplateExercises(rows.filter((entry) => entry.te.section === row.te.section))
  const groupIndex = groups.findIndex((group) => group.some((entry) => entry.te.id === id))
  const group = groups[groupIndex]
  const index = group.findIndex((entry) => entry.te.id === id)
  const target = index + direction
  if (target >= 0 && target < group.length) {
    ;[group[index], group[target]] = [group[target], group[index]]
  } else {
    const targetGroup = groupIndex + direction
    if (targetGroup < 0 || targetGroup >= groups.length) return null
    ;[groups[groupIndex], groups[targetGroup]] = [groups[targetGroup], groups[groupIndex]]
  }
  return groups.flat().map((entry) => entry.te.id)
}
