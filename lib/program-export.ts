import type { Exercise, ExerciseLog, Program, SetLog, WorkoutLog } from "@/lib/db/schema"
import type { WorkoutPlan } from "@/lib/workout-plan"

export type ExportRange = { startDate: string; endDate: string; timeZone: string }

export function validateExportRange(range: ExportRange) {
  for (const date of [range.startDate, range.endDate]) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) {
      throw new Error("Choose valid start and end dates")
    }
  }
  if (range.endDate < range.startDate) throw new Error("End date must be on or after start date")
  try { new Intl.DateTimeFormat("en-US", { timeZone: range.timeZone }).format() }
  catch { throw new Error("Choose a valid time zone") }
}

export function dateInZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date)
  const part = (type: string) => parts.find((p) => p.type === type)!.value
  return `${part("year")}-${part("month")}-${part("day")}`
}

export function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

const numeric = (value: string | null) => value == null ? null : Number(value)
const rangeValue = (min: number | null, max: number | null) => min == null ? null : max == null || max === min ? min : { min, max }

function plannedExercise(row: WorkoutPlan["exercises"][number]) {
  const p = row.prescription
  return {
    template_exercise_id: p.id,
    exercise_id: p.exerciseId,
    name: row.exercise?.name ?? null,
    muscle_group: row.exercise?.muscleGroup ?? null,
    description: row.exercise?.description ?? null,
    free_pick_criteria: p.freePickCriteria,
    order_index: p.orderIndex,
    section: p.section,
    superset: p.superset,
    sets: rangeValue(p.setsMin, p.setsMax),
    reps: p.durationSecondsMin != null ? null : rangeValue(p.repsMin, p.repsMax),
    duration_seconds: rangeValue(p.durationSecondsMin ?? null, p.durationSecondsMax ?? null),
    total_reps: rangeValue(p.totalRepsMin, p.totalRepsMax),
    weight_type: p.weightType,
    weight_value: numeric(p.weightValue),
    weight_kg: p.weightType === "fixed" ? numeric(p.weightValue) : null,
    percent: p.weightType === "pb_percent" && !p.percentages?.length ? numeric(p.weightValue) : null,
    percentages: p.percentages,
    reference_one_rep_max_kg: row.estimatedOneRepMaxKg,
    rpe: numeric(p.rpeTarget),
    notes: p.notes,
  }
}

function plannedBlocks(plan: WorkoutPlan | undefined) {
  return (plan?.functionalBlocks ?? []).map((b) => ({
    template_block_id: b.id, order_index: b.orderIndex, kind: b.kind, title: b.title,
    source: b.source, details: b.details, duration_minutes: b.durationMin,
  }))
}

type LoggedExercise = { el: ExerciseLog; exercise: Exercise | null }
type ExportData = {
  program: Program
  range: ExportRange
  currentPlans: WorkoutPlan[]
  logs: WorkoutLog[]
  exercises: LoggedExercise[]
  sets: SetLog[]
  exportedAt?: Date
}

export function buildProgramExport(data: ExportData) {
  const { program, range } = data
  validateExportRange(range)
  const logs = data.logs.filter((log) => {
    const date = dateInZone(log.startedAt, range.timeZone)
    return log.programId === program.id && date >= range.startDate && date <= range.endDate
  }).sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime() || a.id - b.id)
  const exercisesByLog = new Map<number, LoggedExercise[]>()
  for (const row of data.exercises) {
    const rows = exercisesByLog.get(row.el.workoutLogId) ?? []
    rows.push(row)
    exercisesByLog.set(row.el.workoutLogId, rows)
  }
  const setsByExercise = new Map<number, SetLog[]>()
  for (const set of data.sets) {
    const rows = setsByExercise.get(set.exerciseLogId) ?? []
    rows.push(set)
    setsByExercise.set(set.exerciseLogId, rows)
  }
  const currentPlans = new Map(data.currentPlans.map((plan) => [plan.template.id, plan]))
  const warnings = new Set<string>()
  warnings.add("Runs are selected by workout start date in the specified time zone; program assignment history is not stored. Check that the selected dates cover only the intended run.")
  warnings.add("programmed_sessions contains the current full program, including rest days and sessions with no logs. Its schedule uses the selected start date as Day 1; it is not a historical snapshot of the whole run.")

  const sessions = logs.map((log) => {
    const plan = log.plannedSnapshot ?? currentPlans.get(log.workoutTemplateId ?? -1)
    const planSource = log.plannedSnapshot ? "workout_start_snapshot" : plan ? "current_template" : "unavailable"
    if (planSource === "current_template") warnings.add("Some older workouts use current templates. Original prescriptions were not saved and may have changed; legacy exercise matches use exercise identity and position.")
    if (planSource === "unavailable") warnings.add("Some workouts have no available prescription, for example because their template was deleted. Their logs are still included.")
    const rows = [...(exercisesByLog.get(log.id) ?? [])].sort((a, b) => a.el.orderIndex - b.el.orderIndex || a.el.id - b.el.id)
    const used = new Set<number>()
    const serializeExercise = (row: LoggedExercise | undefined, planned: WorkoutPlan["exercises"][number] | undefined, match: string) => {
      const el = row?.el
      const sets = [...(el ? setsByExercise.get(el.id) ?? [] : [])].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id - b.id)
      return {
        exercise_log_id: el?.id ?? null,
        exercise_id: el?.exerciseId ?? planned?.prescription.exerciseId ?? null,
        name: el?.exerciseName ?? planned?.exercise?.name ?? row?.exercise?.name ?? null,
        muscle_group: planned?.exercise?.muscleGroup ?? row?.exercise?.muscleGroup ?? null,
        description: planned?.exercise?.description ?? row?.exercise?.description ?? null,
        free_pick_criteria: el?.freePickCriteria ?? planned?.prescription.freePickCriteria ?? null,
        order_index: el?.orderIndex ?? planned?.prescription.orderIndex ?? null,
        superset: el?.superset ?? planned?.prescription.superset ?? null,
        planned: planned ? plannedExercise(planned) : null,
        plan_match: match,
        status: el?.skipped ? "skipped" : sets.length ? "logged" : "not_logged",
        skipped: el?.skipped ?? null,
        top_set_rpe: el ? numeric(el.topSetRpe) : null,
        notes: el?.notes ?? null,
        created_at: el?.createdAt.toISOString() ?? null,
        sets: sets.map((set) => ({
          set_log_id: set.id, set_number: set.setNumber, is_makeup: set.isMakeup,
          weight_kg: numeric(set.weight), reps: set.reps, duration_seconds: set.durationSeconds ?? null, rpe: numeric(set.rpe),
          missed: set.missed, miss_reason: set.missReason, created_at: set.createdAt.toISOString(),
        })),
      }
    }
    const exercises = (plan?.exercises ?? []).map((planned) => {
      const p = planned.prescription
      const candidates = rows.filter(({ el }) => !used.has(el.id) && (el.templateExerciseId != null
        ? el.templateExerciseId === p.id
        : !log.plannedSnapshot && el.exerciseId === p.exerciseId && el.orderIndex === p.orderIndex
          && (p.exerciseId != null || el.freePickCriteria === p.freePickCriteria)))
      const matched = candidates.length === 1 ? candidates[0] : undefined
      if (matched) used.add(matched.el.id)
      return serializeExercise(matched, planned, matched ? matched.el.templateExerciseId != null ? "template_exercise_id" : "legacy_identity_and_position" : "no_log_match")
    })
    for (const row of rows) if (!used.has(row.el.id)) exercises.push(serializeExercise(row, undefined, "no_plan_match"))
    exercises.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
    return {
      workout_log_id: log.id,
      workout_template_id: log.workoutTemplateId,
      date: dateInZone(log.startedAt, range.timeZone),
      session: log.name,
      status: log.status,
      started_at: log.startedAt.toISOString(),
      completed_at: log.completedAt?.toISOString() ?? null,
      planned: plan ? {
        name: plan.template.name, week: plan.template.weekNumber, day: plan.template.dayNumber,
        order_in_day: plan.template.orderInDay, is_rest_day: plan.template.isRestDay,
        scheduled_date: addDays(range.startDate, (plan.template.weekNumber - 1) * 7 + plan.template.dayNumber - 1),
        functional_blocks: plannedBlocks(plan),
      } : null,
      plan_source: planSource,
      plan_captured_at: log.plannedSnapshot?.capturedAt ?? null,
      readiness: { score: log.readiness, bar_feel: log.barFeel, notes: log.preNotes },
      session_rpe: numeric(log.sessionRpe),
      notes: log.postNotes,
      functional_notes: log.functionalNotes,
      exercises,
    }
  })

  return {
    json_schema_version: 1.1,
    exported_at: (data.exportedAt ?? new Date()).toISOString(),
    block: {
      program_id: program.id, name: program.name, description: program.description,
      start_date: range.startDate, end_date: range.endDate, total_weeks: program.totalWeeks,
      programmed_end_date: addDays(range.startDate, program.totalWeeks * 7 - 1),
    },
    metadata: {
      time_zone: range.timeZone,
      selection: "Inclusive local workout start dates; includes completed and in-progress sessions.",
      units: { weight: "kg", exercise_duration: "seconds", functional_duration: "minutes" },
      ratings: "Readiness and bar feel are self-reported, currently 1–5. Legacy readiness may use 1–10; its original scale was not stored. RPE is 1–10.",
      percentages: "Percentages apply to the reference estimated 1RM. A single target repeats for all sets; multiple targets are ordered by working-set number. min/max are inclusive. Historical 1RM is only available in workout snapshots.",
      sets: "Only saved sets are exported, ordered by creation time. Working and makeup sets have separate set numbers. Missed sets do not record successful rep counts. No-log matches do not imply an exercise was skipped.",
      missing_values: "null means unknown or not recorded. WHOOP, a separate goal, exercise variation and successful_reps are not tracked; see description, exercise names and missed flags instead.",
      warnings: [...warnings],
    },
    programmed_sessions: [...data.currentPlans].sort((a, b) => a.template.weekNumber - b.template.weekNumber || a.template.dayNumber - b.template.dayNumber || a.template.orderInDay - b.template.orderInDay || a.template.id - b.template.id).map((plan) => ({
      workout_template_id: plan.template.id, session: plan.template.name,
      week: plan.template.weekNumber, day: plan.template.dayNumber, order_in_day: plan.template.orderInDay,
      scheduled_date: addDays(range.startDate, (plan.template.weekNumber - 1) * 7 + plan.template.dayNumber - 1),
      is_rest_day: plan.template.isRestDay, plan_source: "current_template",
      workout_log_ids: logs.filter((log) => log.workoutTemplateId === plan.template.id).map((log) => log.id),
      exercises: plan.exercises.map(plannedExercise), functional_blocks: plannedBlocks(plan),
    })),
    sessions,
  }
}
