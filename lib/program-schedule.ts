export type ScheduledProgram = {
  id: number
  name: string
  startDate: string
  totalWeeks: number
}

export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

// Date-only arithmetic uses UTC to keep daylight-saving changes out of schedules.
export function dateAt(start: string, offset = 0) {
  const date = new Date(`${start}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + offset)
  return date.toISOString().slice(0, 10)
}

export function programEnd(program: { startDate: string; totalWeeks: number }) {
  return dateAt(program.startDate, program.totalWeeks * 7 - 1)
}

export function findProgramConflicts(
  chosen: ScheduledProgram,
  programs: (Omit<ScheduledProgram, "startDate"> & { startDate: string | null; isActive: boolean })[],
) {
  const end = programEnd(chosen)
  return programs.flatMap((p) => {
    if (p.id === chosen.id || !p.isActive || !p.startDate) return []
    const endDate = programEnd({ ...p, startDate: p.startDate })
    return p.startDate <= end && chosen.startDate <= endDate
      ? [{ id: p.id, name: p.name, startDate: p.startDate, endDate }]
      : []
  }).sort((a, b) => a.id - b.id)
}

export function programStatus(program: { isActive: boolean; startDate: string | null; totalWeeks: number }, today: string) {
  if (!program.isActive || !program.startDate) return null
  if (program.startDate > today) return "Scheduled"
  return programEnd({ ...program, startDate: program.startDate }) < today ? "Ended" : "Current"
}
