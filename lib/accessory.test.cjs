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
    update(table) { return { set(data) { writes.push({ kind: 'update', table: table.name, data }); return { where: async () => [] } } } },
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
