const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')

const prescriptionModule = { exports: {} }
new Function('exports', 'module', ts.transpileModule(fs.readFileSync(__dirname + '/prescription.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(prescriptionModule.exports, prescriptionModule)

function loadActions(file, results) {
  const writes = []
  const joins = []
  const schema = new Proxy({}, { get: (_, name) => new Proxy({ name }, { get: (table, field) => field === 'name' ? table.name : field }) })
  const db = {
    select() {
      const result = results.shift() ?? []
      const chain = { then: (resolve, reject) => Promise.resolve(result).then(resolve, reject) }
      for (const method of ['from', 'where', 'orderBy', 'limit', 'for', 'innerJoin', 'leftJoin']) chain[method] = (...args) => { if (method.endsWith('Join')) joins.push([method, args[0].name]); return chain }
      return chain
    },
    insert(table) { return { values(data) { writes.push({ kind: 'insert', table: table.name, data }); return { returning: async () => [{ id: 99, ...data }] } } } },
    update(table) { return { set(data) { writes.push({ kind: 'update', table: table.name, data }); return { where() { const result = [{ id: 99, ...data }]; return { then: (resolve) => Promise.resolve(result).then(resolve), returning: async () => result } } } } } },
    delete(table) { return { where: async () => { writes.push({ kind: 'delete', table: table.name }) } } },
    transaction: async (fn) => fn(db),
  }
  const output = ts.transpileModule(fs.readFileSync(__dirname + '/actions/' + file + '.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  const mod = { exports: {} }
  const mocks = { '@/lib/prescription': prescriptionModule.exports, '@/lib/db': { db }, '@/lib/db/schema': schema, './auth': { getUserId: async () => 'user-1' }, 'next/cache': { revalidatePath() {} }, 'drizzle-orm': new Proxy({}, { get: () => () => ({}) }), '@/lib/strength': { calculateOneRepMax: () => 100 } }
  new Function('require', 'exports', 'module', output)((id) => { if (!(id in mocks)) throw new Error(id); return mocks[id] }, mod.exports, mod)
  return { actions: mod.exports, writes, joins }
}
const free = { exerciseId: null, freePickCriteria: 'Upper-body pull; dumbbells', setsMin: 3, repsMin: 10 }

test('accessory supersets can mix reps and seconds', async () => {
  const { actions, writes } = loadActions('programs', [[{ id: 1 }], []])
  await actions.addAccessoryGroup({ workoutTemplateId: 1, superset: 'Core', exercises: [free, { ...free, durationSecondsMin: 45 }] })
  assert.equal(writes[0].data[0].durationSecondsMin, undefined)
  assert.equal(writes[0].data[1].durationSecondsMin, 45)
  const invalid = loadActions('programs', [])
  await assert.rejects(invalid.actions.addAccessoryGroup({ workoutTemplateId: 1, exercises: [{ exerciseId: 1, setsMin: 3, repsMin: 1, durationSecondsMin: 0 }] }), /seconds/)
  assert.equal(invalid.writes.length, 0)
})

test('timed prescriptions save ranges and can switch back to reps', async () => {
  const timed = { exerciseId: 1, setsMin: 3, repsMin: 1, weightType: 'fixed', durationSecondsMin: 30, durationSecondsMax: 45 }
  const added = loadActions('programs', [])
  await added.actions.addTemplateExercise({ workoutTemplateId: 1, ...timed })
  assert.equal(added.writes[0].data.durationSecondsMax, 45)
  const updated = loadActions('programs', [[{ te: timed, programId: 1 }]])
  await updated.actions.updateTemplateExercise(1, { durationSecondsMin: null, durationSecondsMax: null, repsMin: 10 })
  assert.equal(updated.writes[0].data.durationSecondsMin, null)
  assert.equal(updated.writes[0].data.durationSecondsMax, null)
  assert.equal(updated.writes[0].data.repsMin, 10)
  const invalid = loadActions('programs', [[{ te: timed, programId: 1 }]])
  await assert.rejects(invalid.actions.updateTemplateExercise(1, { durationSecondsMax: 20 }), /seconds/)
  assert.equal(invalid.writes.length, 0)
})

test('timed sets store seconds, clear reps on update and never create rep PBs', async () => {
  for (const existing of [[], [{ id: 5, reps: 10 }]]) {
    const { actions, writes } = loadActions('workouts', [[{ el: { exerciseId: 1 } }], existing])
    const saved = await actions.upsertSetLog({ exerciseLogId: 1, setNumber: 1, durationSeconds: 45, weight: 20 })
    assert.equal(saved.durationSeconds, 45)
    assert.equal(saved.reps, null)
    assert.equal(writes.length, 1)
    assert.equal(writes[0].table, 'setLog')
  }
  const freePick = loadActions('workouts', [[{ el: { exerciseId: null } }], []])
  await freePick.actions.upsertSetLog({ exerciseLogId: 1, setNumber: 1, exerciseName: 'Plank', durationSeconds: 30, weight: 0 })
  assert.equal(freePick.writes[1].data.durationSeconds, 30)
})

test('set logging rejects invalid durations and mixed units before writes', async () => {
  for (const data of [{ durationSeconds: -1 }, { durationSeconds: 0.5 }, { durationSeconds: NaN }, { durationSeconds: 30, reps: 5 }]) {
    const { actions, writes } = loadActions('workouts', [])
    await assert.rejects(actions.upsertSetLog({ exerciseLogId: 1, setNumber: 1, ...data }))
    assert.equal(writes.length, 0)
  }
})

test('duplicating programs and workouts preserves duration ranges', async () => {
  const template = { id: 2, programId: 1, name: 'Core', weekNumber: 1, dayNumber: 1, isRestDay: false }
  const timed = { exerciseId: 5, setsMin: 3, repsMin: 1, durationSecondsMin: 30, durationSecondsMax: 45 }
  const wholeProgram = loadActions('programs', [[{ id: 1, name: 'Plan', totalWeeks: 2 }], [template], [timed], []])
  await wholeProgram.actions.duplicateProgram(1)
  const workout = loadActions('programs', [[template], [{ totalWeeks: 2 }], [], [timed], []])
  await workout.actions.duplicateWorkoutTemplate({ templateId: 2, programId: 1, targetWeek: 2, targetDay: 1 })
  for (const result of [wholeProgram, workout]) {
    const copy = result.writes.find((w) => w.table === 'templateExercise').data
    assert.equal(copy.durationSecondsMin, 30)
    assert.equal(copy.durationSecondsMax, 45)
  }
})

test('a mixed superset saves together in order with criteria', async () => {
  const { actions, writes } = loadActions('programs', [[{ id: 1 }], [{ orderIndex: 4 }]])
  await actions.addAccessoryGroup({ workoutTemplateId: 1, superset: 'A', exercises: [{ ...free, exerciseId: 2, freePickCriteria: undefined }, free] })
  assert.equal(writes.length, 1)
  assert.deepEqual(writes[0].data.map((row) => [row.exerciseId, row.orderIndex, row.superset]), [[2, 5, 'A'], [null, 6, 'A']])
  assert.equal(writes[0].data[1].freePickCriteria, free.freePickCriteria)
})

test('invalid free-pick groups write nothing', async () => {
  for (const data of [
    { exercises: [free] },
    { superset: 'A', exercises: [free] },
    { superset: 'A', exercises: [free, { ...free, freePickCriteria: ' ' }] },
    { superset: 'A', exercises: [free, { ...free, setsMin: 0 }] },
  ]) {
    const { actions, writes } = loadActions('programs', [])
    await assert.rejects(actions.addAccessoryGroup({ workoutTemplateId: 1, ...data }))
    assert.equal(writes.length, 0)
  }
})

test('free-pick set saves the chosen name, reps and weight without a PB', async () => {
  const { actions, writes } = loadActions('workouts', [[{ el: { exerciseId: null } }], [], [{ exerciseId: null }]])
  await actions.upsertSetLog({ exerciseLogId: 1, setNumber: 1, exerciseName: '  Dumbbell row  ', reps: 12, weight: 20 })
  assert.equal(writes[0].data.exerciseName, 'Dumbbell row')
  assert.equal(writes[1].table, 'setLog')
  assert.equal(writes[1].data.reps, 12)
  assert.equal(writes[1].data.weight, '20')
  assert.ok(writes.every((write) => write.table !== 'personalBest' && write.table !== 'exercise'))
})

test('free-pick sets require a name and ownership before writing', async () => {
  for (const owner of [[{ el: { exerciseId: null } }], []]) {
    const { actions, writes } = loadActions('workouts', [owner])
    await assert.rejects(actions.upsertSetLog({ exerciseLogId: 1, setNumber: 1, reps: 12, weight: 20 }))
    assert.equal(writes.length, 0)
  }
})

test('seeding includes free-pick entries and snapshots criteria and group', async () => {
  const { actions, writes, joins } = loadActions('workouts', [
    [{ id: 1, workoutTemplateId: 2, status: 'in_progress' }], [], [{ id: 2 }],
    [{ te: { id: 7, ...free, superset: 'A', orderIndex: 2 }, exercise: null }],
  ])
  await actions.seedWorkoutFromTemplate(1, 2)
  assert.equal(writes[0].data.exerciseId, null)
  assert.equal(writes[0].data.freePickCriteria, free.freePickCriteria)
  assert.equal(writes[0].data.superset, 'A')
  assert.equal(writes[0].data.templateExerciseId, 7)
  assert.ok(joins.some(([kind]) => kind === 'leftJoin'))
})

test('starting a template workout freezes the plan and seeds it together', async () => {
  const { actions, writes } = loadActions('workouts', [
    [{ t: { id: 2, programId: 3, name: 'Day 1', weekNumber: 1, dayNumber: 1, orderInDay: 0, isRestDay: false } }],
    [{ te: { id: 7, ...free, durationSecondsMin: 30, durationSecondsMax: 45, superset: 'A', orderIndex: 2 }, exercise: null },
     { te: { id: 8, exerciseId: 5, orderIndex: 3, weightType: 'pb_percent', weightValue: '80' }, exercise: { id: 5, name: 'Snatch' } }],
    [{ id: 9, kind: 'zone2', durationMin: 20 }],
    [{ exerciseId: 5, weight: '100', reps: 1 }],
  ])
  const log = await actions.startWorkout({ workoutTemplateId: 2, programId: 3, name: 'Day 1' })
  assert.equal(log.plannedSnapshot.template.id, 2)
  assert.equal(log.plannedSnapshot.exercises[0].prescription.freePickCriteria, free.freePickCriteria)
  assert.equal(log.plannedSnapshot.exercises[0].prescription.durationSecondsMin, 30)
  assert.equal(log.plannedSnapshot.exercises[0].prescription.durationSecondsMax, 45)
  assert.equal(log.plannedSnapshot.exercises[1].estimatedOneRepMaxKg, 100)
  assert.equal(log.plannedSnapshot.functionalBlocks[0].durationMin, 20)
  assert.deepEqual(writes.map((w) => w.table), ['workoutLog', 'exerciseLog'])
  assert.equal(writes[1].data[0].templateExerciseId, 7)
  assert.equal(writes[1].data[0].workoutLogId, log.id)
})

test('template start rejects foreign, rest-day and mismatched program templates without writes', async () => {
  for (const result of [[], [{ t: { isRestDay: true } }], [{ t: { programId: 4, isRestDay: false } }]]) {
    const { actions, writes } = loadActions('workouts', [result])
    await assert.rejects(actions.startWorkout({ workoutTemplateId: 2, programId: 3, name: 'Day 1' }))
    assert.equal(writes.length, 0)
  }
})

test('seeding retries never duplicate snapshotted workouts and reject foreign logs', async () => {
  const existing = [{ id: 9, workoutLogId: 1 }]
  const valid = loadActions('workouts', [[{ id: 1, workoutTemplateId: 2, status: 'in_progress', plannedSnapshot: {} }], existing])
  assert.deepEqual(await valid.actions.seedWorkoutFromTemplate(1, 2), existing)
  assert.equal(valid.writes.length, 0)
  const invalid = loadActions('workouts', [[]])
  await assert.rejects(invalid.actions.seedWorkoutFromTemplate(1, 2), /Active workout not found/)
  assert.equal(invalid.writes.length, 0)
})

 test('supersets reject different set counts but allow different reps', async () => {
  const invalid = loadActions('programs', [])
  await assert.rejects(invalid.actions.addAccessoryGroup({ workoutTemplateId: 1, superset: 'A', exercises: [free, { ...free, setsMin: 4 }] }), /same number of sets/)
  assert.equal(invalid.writes.length, 0)
  const valid = loadActions('programs', [[{ id: 1 }], []])
  await valid.actions.addAccessoryGroup({ workoutTemplateId: 1, superset: 'A', exercises: [free, { ...free, repsMin: 15 }] })
  assert.deepEqual(valid.writes[0].data.map((row) => [row.setsMin, row.repsMin]), [[3, 10], [3, 15]])
})

 test('moving a workout validates ownership and the destination', async () => {
  const t = { id: 2, programId: 1, weekNumber: 1, dayNumber: 1, isRestDay: false }
  const valid = loadActions('programs', [[{ t }], [{ totalWeeks: 3 }], []])
  await valid.actions.updateWorkoutTemplate(2, { weekNumber: 3, dayNumber: 7 })
  assert.deepEqual(valid.writes[0].data, { weekNumber: 3, dayNumber: 7 })
  for (const results of [[], [[{ t }], [{ totalWeeks: 2 }]], [[{ t }], [{ totalWeeks: 3 }], [{ id: 3, isRestDay: true }]]]) {
    const invalid = loadActions('programs', results)
    await assert.rejects(invalid.actions.updateWorkoutTemplate(2, { weekNumber: 3, dayNumber: 7 }))
    assert.equal(invalid.writes.length, 0)
  }
})
 test('rest days cannot overlap workouts', async () => {
  const invalid = loadActions('programs', [[{ totalWeeks: 2 }], [{ id: 3, isRestDay: false }]])
  await assert.rejects(invalid.actions.createWorkoutTemplate({ programId: 1, name: 'Rest day', weekNumber: 1, dayNumber: 2, isRestDay: true }), /without workouts/)
  assert.equal(invalid.writes.length, 0)
})
 test('removing a week deletes its plan and shifts later weeks, preserving logs', async () => {
  const result = loadActions('programs', [[{ totalWeeks: 3 }], [], []])
  await result.actions.changeProgramWeeks(1, 2)
  assert.deepEqual(result.writes.filter((w) => w.kind === 'delete').map((w) => w.table), ['templateExercise', 'templateFunctionalBlock', 'workoutTemplate'])
  assert.equal(result.writes.find((w) => w.table === 'program').data.totalWeeks, 2)
  assert.ok(result.writes.every((w) => !['workoutLog', 'exerciseLog', 'setLog'].includes(w.table)))
})
 test('adding a week preserves the plan and the last week cannot be removed', async () => {
  const added = loadActions('programs', [[{ totalWeeks: 2 }], []])
  await added.actions.changeProgramWeeks(1)
  assert.equal(added.writes[0].data.totalWeeks, 3)
  const invalid = loadActions('programs', [[{ totalWeeks: 1 }]])
  await assert.rejects(invalid.actions.changeProgramWeeks(1, 1), /at least one week/)
  assert.equal(invalid.writes.length, 0)
})
