const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')

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
  const mocks = { '@/lib/db': { db }, '@/lib/db/schema': schema, './auth': { getUserId: async () => 'user-1' }, 'next/cache': { revalidatePath() {} }, 'drizzle-orm': new Proxy({}, { get: () => () => ({}) }), '@/lib/strength': { calculateOneRepMax: () => 100 } }
  new Function('require', 'exports', 'module', output)((id) => { if (!(id in mocks)) throw new Error(id); return mocks[id] }, mod.exports, mod)
  return { actions: mod.exports, writes, joins }
}
const free = { exerciseId: null, freePickCriteria: 'Upper-body pull; dumbbells', setsMin: 3, repsMin: 10 }

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
  const { actions, writes, joins } = loadActions('workouts', [[{ te: { ...free, superset: 'A', orderIndex: 2 }, exercise: null }]])
  await actions.seedWorkoutFromTemplate(1, 2)
  assert.equal(writes[0].data.exerciseId, null)
  assert.equal(writes[0].data.freePickCriteria, free.freePickCriteria)
  assert.equal(writes[0].data.superset, 'A')
  assert.ok(joins.some(([kind]) => kind === 'leftJoin'))
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
