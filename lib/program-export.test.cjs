const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')

function load(file, mocks = {}) {
  const output = ts.transpileModule(fs.readFileSync(__dirname + '/' + file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  const mod = { exports: {} }
  new Function('require', 'exports', 'module', output)((id) => {
    if (!(id in mocks)) throw new Error(id)
    return mocks[id]
  }, mod.exports, mod)
  return mod.exports
}
const exporter = load('program-export.ts')
const now = new Date('2026-09-03T10:00:00Z')
const program = { id: 1, name: 'OLY Block 3', description: 'Improve clean strength', totalWeeks: 4 }
const exercise = { id: 5, name: 'No-Foot Snatch', muscleGroup: 'Full body', description: null }
const prescription = {
  id: 11, workoutTemplateId: 2, exerciseId: 5, freePickCriteria: null, orderIndex: 0,
  setsMin: 3, setsMax: 4, repsMin: 2, repsMax: 3, totalRepsMin: 8, totalRepsMax: 12,
  section: 'main', superset: null, weightType: 'pb_percent', weightValue: null,
  percentages: [{ min: 70 }, { min: 75, max: 80 }, { min: 80 }, { min: 85 }], rpeTarget: '8.5', notes: 'Stay fast',
}
const plan = {
  capturedAt: now.toISOString(), template: { id: 2, name: 'S1', weekNumber: 1, dayNumber: 3, orderInDay: 0, isRestDay: false },
  exercises: [{ prescription, exercise, estimatedOneRepMaxKg: 100 }],
  functionalBlocks: [{ id: 1, orderIndex: 0, kind: 'zone2', title: 'Bike', source: 'Coach', details: 'Easy pace', durationMin: 30 }],
}
const log = {
  id: 7, programId: 1, workoutTemplateId: 2, name: 'S1', startedAt: now, completedAt: new Date('2026-09-03T11:00:00Z'),
  status: 'completed', readiness: 4, barFeel: 2, preNotes: 'Heavy legs', sessionRpe: '8.5',
  postNotes: 'Good session', functionalNotes: 'Bike 25 min', plannedSnapshot: plan,
}
const el = {
  id: 8, workoutLogId: 7, templateExerciseId: 11, exerciseId: 5, exerciseName: null, freePickCriteria: null,
  orderIndex: 0, topSetRpe: '8.5', notes: 'Føltes veldig bra', skipped: false, superset: null, createdAt: now,
}
const set = { id: 9, exerciseLogId: 8, setNumber: 1, isMakeup: false, weight: '80.50', reps: 2, rpe: '7.5', missed: true, missReason: 'Forward', createdAt: now }
function data(overrides = {}) {
  return { program, range: { startDate: '2026-09-01', endDate: '2026-09-28', timeZone: 'Europe/Oslo' },
    currentPlans: [plan], logs: [log], exercises: [{ el, exercise }], sets: [set], exportedAt: now, ...overrides }
}

test('exports programmed ranges and every logged metric as JSON numbers, booleans and nulls', () => {
  const result = JSON.parse(JSON.stringify(exporter.buildProgramExport(data())))
  assert.equal(result.json_schema_version, 1.0)
  assert.equal(result.block.name, 'OLY Block 3')
  assert.equal(result.block.programmed_end_date, '2026-09-28')
  const session = result.sessions[0]
  assert.deepEqual(session.readiness, { score: 4, bar_feel: 2, notes: 'Heavy legs' })
  assert.equal(session.session_rpe, 8.5)
  assert.equal(session.notes, 'Good session')
  assert.equal(session.functional_notes, 'Bike 25 min')
  assert.equal(session.planned.functional_blocks[0].duration_minutes, 30)
  assert.equal(session.planned.scheduled_date, '2026-09-03')
  const ex = session.exercises[0]
  assert.deepEqual(ex.planned.sets, { min: 3, max: 4 })
  assert.deepEqual(ex.planned.reps, { min: 2, max: 3 })
  assert.deepEqual(ex.planned.total_reps, { min: 8, max: 12 })
  assert.deepEqual(ex.planned.percentages, prescription.percentages)
  assert.equal(ex.planned.reference_one_rep_max_kg, 100)
  assert.equal(ex.planned.rpe, 8.5)
  assert.equal(ex.top_set_rpe, 8.5)
  assert.equal(ex.notes, 'Føltes veldig bra')
  assert.equal(ex.sets[0].weight_kg, 80.5)
  assert.equal(ex.sets[0].rpe, 7.5)
  assert.equal(ex.sets[0].missed, true)
  assert.equal(ex.sets[0].miss_reason, 'Forward')
  assert.equal('successful_reps' in ex.sets[0], false)
})

test('snapshot survives deleted or edited templates; unmatched new exercises are unplanned', () => {
  const extra = { ...el, id: 10, templateExerciseId: null, orderIndex: 1 }
  const result = exporter.buildProgramExport(data({ currentPlans: [], exercises: [{ el, exercise }, { el: extra, exercise }] }))
  assert.equal(result.sessions[0].plan_source, 'workout_start_snapshot')
  assert.equal(result.sessions[0].exercises[0].planned.notes, 'Stay fast')
  assert.equal(result.sessions[0].exercises[1].planned, null)
  const edited = { ...plan, exercises: [{ ...plan.exercises[0], prescription: { ...prescription, setsMin: 99 } }] }
  const changed = exporter.buildProgramExport(data({ currentPlans: [edited] }))
  assert.deepEqual(changed.sessions[0].exercises[0].planned.sets, { min: 3, max: 4 })
  assert.deepEqual(changed.programmed_sessions[0].exercises[0].sets, { min: 99, max: 4 })
})

test('full plan includes rest days and unlogged workouts and exercises without claiming they were skipped', () => {
  const rest = { ...plan, template: { ...plan.template, id: 3, isRestDay: true, dayNumber: 4 }, exercises: [], functionalBlocks: [] }
  const result = exporter.buildProgramExport(data({ currentPlans: [rest, plan], exercises: [], sets: [] }))
  assert.equal(result.programmed_sessions[1].is_rest_day, true)
  assert.deepEqual(result.programmed_sessions[1].workout_log_ids, [])
  assert.equal(result.sessions[0].exercises[0].status, 'not_logged')
  assert.equal(result.sessions[0].exercises[0].skipped, null)
  assert.deepEqual(result.sessions[0].exercises[0].sets, [])
  assert.equal(exporter.buildProgramExport(data({ logs: [] })).programmed_sessions.length, 1)
})

test('free picks, repeated exercises, skipped entries and makeup sets remain distinct', () => {
  const free = { ...prescription, id: 12, exerciseId: null, freePickCriteria: 'Pull', orderIndex: 1, section: 'accessory', superset: 'A', weightType: 'fixed', weightValue: '0' }
  const repeat = { ...prescription, id: 13, orderIndex: 2 }
  const snapshot = { ...plan, exercises: [...plan.exercises, { prescription: free, exercise: null, estimatedOneRepMaxKg: null }, { prescription: repeat, exercise, estimatedOneRepMaxKg: 100 }] }
  const result = exporter.buildProgramExport(data({
    logs: [{ ...log, plannedSnapshot: snapshot }],
    exercises: [{ el, exercise },
      { el: { ...el, id: 10, templateExerciseId: 12, exerciseId: null, exerciseName: 'Pull-ups', freePickCriteria: 'Pull', superset: 'A', orderIndex: 1 }, exercise: null },
      { el: { ...el, id: 11, templateExerciseId: 13, skipped: true, orderIndex: 2 }, exercise }],
    sets: [set, { ...set, id: 10, isMakeup: true, missed: false, missReason: null }, { ...set, id: 11, exerciseLogId: 10, weight: '0', reps: 0 }],
  }))
  const [first, picked, repeated] = result.sessions[0].exercises
  assert.deepEqual(first.sets.map((s) => [s.set_number, s.is_makeup]), [[1, false], [1, true]])
  assert.equal(picked.name, 'Pull-ups')
  assert.equal(picked.planned.free_pick_criteria, 'Pull')
  assert.equal(picked.planned.section, 'accessory')
  assert.equal(picked.sets[0].weight_kg, 0)
  assert.equal(picked.sets[0].reps, 0)
  assert.equal(repeated.status, 'skipped')
  assert.deepEqual(repeated.sets, [])
})

test('legacy fallback and unavailable plans are explicit and preserve all actual work', () => {
  const legacy = { ...log, plannedSnapshot: null, readiness: 9, barFeel: null }
  const rows = [{ el: { ...el, templateExerciseId: null }, exercise }]
  const result = exporter.buildProgramExport(data({ logs: [legacy], exercises: rows }))
  assert.equal(result.sessions[0].plan_source, 'current_template')
  assert.equal(result.sessions[0].exercises[0].plan_match, 'legacy_identity_and_position')
  assert.equal(result.sessions[0].readiness.score, 9)
  assert.ok(result.metadata.warnings.some((s) => s.includes('Original prescriptions')))
  const unavailable = exporter.buildProgramExport(data({ logs: [legacy], exercises: rows, currentPlans: [] }))
  assert.equal(unavailable.sessions[0].plan_source, 'unavailable')
  assert.equal(unavailable.sessions[0].planned, null)
  assert.equal(unavailable.sessions[0].exercises[0].sets.length, 1)
})

test('inclusive local date filtering isolates runs, including DST and in-progress sessions', () => {
  const times = ['2026-10-24T21:59:59Z', '2026-10-24T22:00:00Z', '2026-10-25T22:59:59Z', '2026-10-25T23:00:00Z']
  const result = exporter.buildProgramExport(data({
    range: { startDate: '2026-10-25', endDate: '2026-10-25', timeZone: 'Europe/Oslo' },
    logs: [...times.map((time, id) => ({ ...log, id, startedAt: new Date(time), completedAt: null, status: 'in_progress' })), { ...log, programId: 99 }],
  }))
  assert.deepEqual(result.sessions.map((s) => s.workout_log_id), [1, 2])
  assert.ok(result.sessions.every((s) => s.date === '2026-10-25' && s.status === 'in_progress'))
  assert.equal(exporter.dateInZone(new Date('2026-09-01T00:30:00Z'), 'America/Los_Angeles'), '2026-08-31')
})

test('invalid dates, reversed ranges and invalid time zones are rejected', () => {
  for (const range of [
    { startDate: '2026-02-30', endDate: '2026-03-01', timeZone: 'UTC' },
    { startDate: '2026-2-1', endDate: '2026-03-01', timeZone: 'UTC' },
    { startDate: '2026-03-02', endDate: '2026-03-01', timeZone: 'UTC' },
    { startDate: '2026-03-01', endDate: '2026-03-01', timeZone: 'Nope' },
  ]) assert.throws(() => exporter.validateExportRange(range))
})

function loadAction(results, authenticated = true) {
  const reads = []
  const schema = Object.fromEntries(['program', 'workoutTemplate', 'templateExercise', 'templateFunctionalBlock', 'workoutLog', 'exerciseLog', 'exercise', 'setLog'].map((name) => [name, new Proxy({ name }, { get: (t, field) => field === 'name' ? name : `${name}.${field}` })]))
  const db = {
    async transaction(fn) { return fn(db) },
    select() {
      const result = results.shift() ?? []
      const read = {}
      reads.push(read)
      const chain = { then: (resolve, reject) => Promise.resolve(result).then(resolve, reject) }
      for (const method of ['from', 'where', 'orderBy', 'leftJoin']) chain[method] = (...args) => { read[method] = args; return chain }
      return chain
    },
  }
  const operations = Object.fromEntries(['eq', 'and', 'gte', 'lt', 'inArray', 'asc'].map((op) => [op, (...args) => [op, ...args]]))
  const action = load('actions/program-export.ts', {
    '@/lib/db': { db }, '@/lib/db/schema': schema, 'drizzle-orm': operations,
    '@/lib/program-export': exporter, './auth': { getUserId: async () => { if (!authenticated) throw new Error('Unauthorized'); return 'user-1' } },
  })
  return { action, reads }
}

test('export authenticates and rejects missing or foreign programs before reading their data', async () => {
  const foreign = loadAction([[]])
  await assert.rejects(foreign.action.exportProgramRun(1, data().range), /Program not found/)
  assert.equal(foreign.reads.length, 1)
  assert.deepEqual(foreign.reads[0].where[0], ['and', ['eq', 'program.id', 1], ['eq', 'program.userId', 'user-1']])
  const signedOut = loadAction([], false)
  await assert.rejects(signedOut.action.exportProgramRun(1, data().range), /Unauthorized/)
  assert.equal(signedOut.reads.length, 0)
})

test('export scopes sessions by owner and program and fetches only their child records', async () => {
  const { action, reads } = loadAction([[program], [], [log], [{ el, exercise }], [set]])
  const result = await action.exportProgramRun(1, data().range)
  assert.equal(result.sessions.length, 1)
  assert.deepEqual(reads[2].where[0].slice(0, 3), ['and', ['eq', 'workoutLog.userId', 'user-1'], ['eq', 'workoutLog.programId', 1]])
  assert.deepEqual(reads[3].where[0], ['inArray', 'exerciseLog.workoutLogId', [7]])
  assert.deepEqual(reads[4].where[0], ['inArray', 'setLog.exerciseLogId', [8]])
})
