const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')

function loadWorkouts({ owned = true, status = 'in_progress', warmup = 'Row 5 minutes', functionalBlocks = [], functionalResults = [] } = {}) {
  const paths = []
  const deletions = []
  const ownershipChecks = []
  const updateChecks = []
  const log = { id: 42, userId: 'user-1', status, plannedSnapshot: { template: { warmup }, functionalBlocks }, functionalResults }
  const db = {
    select() {
      return { from() { return { where: async (condition) => {
        ownershipChecks.push(condition)
        return owned && condition.every(([field, value]) => log[field] === value) ? [log] : []
      } } } }
    },
    async transaction(callback) {
      return callback({
        select() {
          return { from() { return { where(condition) {
            return { for: async () => {
              ownershipChecks.push(condition)
              return owned && condition.every(([field, value]) => log[field] === value) ? [log] : []
            } }
          } } } }
        },
        delete(table) {
          return { where: async (condition) => { deletions.push({ table, condition }) } }
        },
        update: (table) => db.update(table),
      })
    },
    update() {
      return { set(data) { return { where(condition) { return { returning: async () => {
        updateChecks.push(condition)
        if (!owned || condition.some(([field, value]) => field === 'status' && log.status !== value)) return []
        Object.assign(log, data)
        return [log]
      } } } } } }
    },
    insert() {
      return { values(data) { return { returning: async () => [{ ...log, ...data }] } } }
    },
  }
  const mocks = {
    '@/lib/db': { db },
    '@/lib/db/schema': {
      workoutLog: { id: 'id', userId: 'userId', status: 'status' },
      exerciseLog: { id: 'exerciseId', workoutLogId: 'workoutLogId' },
      setLog: { exerciseLogId: 'exerciseLogId' },
    },
    './auth': { getUserId: async () => 'user-1' },
    'next/cache': { revalidatePath: (path) => paths.push(path) },
    'drizzle-orm': { eq: (...args) => args, and: (...args) => args, inArray: (...args) => args },
    '@/lib/strength': {},
    '@/lib/set-log-validation': {},
    '@/lib/program-schedule': {},
  }
  const output = ts.transpileModule(fs.readFileSync(__dirname + '/actions/workouts.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText
  const mod = { exports: {} }
  new Function('require', 'exports', 'module', output)((id) => {
    if (!(id in mocks)) throw new Error(id)
    return mocks[id]
  }, mod.exports, mod)
  return { actions: mod.exports, paths, deletions, ownershipChecks, updateChecks, log }
}

test('functional results require an owned active workout and save under the same ownership condition', async () => {
  const functionalBlocks = [{ id: 7, isProgrammed: true, workout: 'Original WOD' }]
  const data = { blockId: 7, workout: 'Attempted replacement', scoreNotes: '10:25, scaled', rpe: 8.5 }
  for (const options of [{ owned: false }, { status: 'completed' }, { status: 'skipped' }]) {
    const s = loadWorkouts({ ...options, functionalBlocks })
    await assert.rejects(s.actions.saveFunctionalResult(42, data), /Active workout not found/)
    assert.equal(s.updateChecks.length, 0)
  }
  const s = loadWorkouts({ functionalBlocks })
  await s.actions.saveFunctionalResult(42, data)
  assert.deepEqual(s.ownershipChecks[0], [['id', 42], ['userId', 'user-1'], ['status', 'in_progress']])
  assert.deepEqual(s.updateChecks[0], s.ownershipChecks[0])
  assert.deepEqual(s.log.functionalResults, [{ ...data, workout: 'Original WOD' }])
  assert.deepEqual(s.paths, ['/workout/42', '/log/42'])
})

test('deleting a workout checks ownership and removes sets before exercises and the workout', async () => {
  const { actions, paths, deletions, ownershipChecks } = loadWorkouts()
  await actions.deleteWorkoutLog(42)
  assert.deepEqual(ownershipChecks, [[['id', 42], ['userId', 'user-1']]])
  assert.deepEqual(deletions.map(({ table }) => table), [
    { exerciseLogId: 'exerciseLogId' },
    { id: 'exerciseId', workoutLogId: 'workoutLogId' },
    { id: 'id', userId: 'userId', status: 'status' },
  ])
  assert.deepEqual(deletions[2].condition, [['id', 42], ['userId', 'user-1']])
  for (const path of ['/dashboard', '/log', '/log/42', '/workout/42']) {
    assert.ok(paths.includes(path))
  }
})

test('missing or unowned workouts cannot be deleted', async () => {
  const { actions, deletions, paths } = loadWorkouts({ owned: false })
  await assert.rejects(actions.deleteWorkoutLog(42), /Workout not found/)
  assert.deepEqual(deletions, [])
  assert.deepEqual(paths, [])
})

test('invalid workout IDs are rejected before deletion', async () => {
  const { actions, deletions, ownershipChecks } = loadWorkouts()
  for (const id of [0, -1, 1.5, NaN]) {
    await assert.rejects(actions.deleteWorkoutLog(id), /Invalid workout ID/)
  }
  assert.deepEqual(deletions, [])
  assert.deepEqual(ownershipChecks, [])
})

test('completing a workout refreshes the dashboard and both session views', async () => {
  const { actions, paths } = loadWorkouts()
  const completedAt = new Date()
  const log = await actions.updateWorkoutLog(42, { status: 'completed', completedAt })
  assert.equal(log.status, 'completed')
  assert.equal(log.completedAt, completedAt)
  for (const path of ['/dashboard', '/log', '/log/42', '/workout/42']) {
    assert.ok(paths.includes(path), `Missing refresh for ${path}`)
  }
})

test('starting a workout refreshes the dashboard active workout card', async () => {
  const { actions, paths } = loadWorkouts()
  await actions.startWorkout({ name: 'Test workout' })
  assert.ok(paths.includes('/dashboard'))
})

test('skipping requires no check-in and preserves the log while refreshing history and progression', async () => {
  const { actions, paths, deletions, updateChecks } = loadWorkouts()
  const log = await actions.skipWorkout(42)
  assert.equal(log.status, 'skipped')
  assert.ok(log.completedAt instanceof Date)
  assert.equal(log.readiness, undefined)
  assert.equal(log.barFeel, undefined)
  assert.equal(log.preNotes, undefined)
  assert.deepEqual(deletions, [])
  assert.deepEqual(updateChecks, [[['id', 42], ['userId', 'user-1'], ['status', 'in_progress']]])
  for (const path of ['/dashboard', '/log', '/log/42', '/workout/42']) assert.ok(paths.includes(path))
})

test('skipping rejects invalid IDs, foreign workouts and already closed sessions', async () => {
  for (const options of [{ owned: false }, { status: 'completed' }, { status: 'skipped' }]) {
    const { actions, paths } = loadWorkouts(options)
    await assert.rejects(actions.skipWorkout(42), /Active workout not found/)
    assert.deepEqual(paths, [])
  }
  const { actions, updateChecks } = loadWorkouts()
  for (const id of [0, -1, 1.5, NaN]) await assert.rejects(actions.skipWorkout(id), /Invalid workout ID/)
  assert.deepEqual(updateChecks, [])
})

test('warmup decisions save only on owned active workouts with a prescribed warmup', async () => {
  for (const status of ['completed', 'skipped']) {
    const { actions, updateChecks, paths } = loadWorkouts()
    const saved = await actions.setWorkoutWarmupStatus(42, status)
    assert.equal(saved.warmupStatus, status)
    assert.equal(saved.status, 'in_progress')
    assert.deepEqual(updateChecks, [[['id', 42], ['userId', 'user-1'], ['status', 'in_progress']]])
    assert.ok(paths.includes('/workout/42'))
    assert.ok(paths.includes('/log/42'))
  }
  for (const options of [{ owned: false }, { status: 'completed' }, { status: 'skipped' }, { warmup: null }, { warmup: ' ' }]) {
    const { actions, updateChecks } = loadWorkouts(options)
    await assert.rejects(actions.setWorkoutWarmupStatus(42, 'completed'), /Active workout not found|no prescribed warmup/)
    assert.deepEqual(updateChecks, [])
  }
})

test('warmup decisions reject invalid IDs and status values without reading or writing', async () => {
  const { actions, ownershipChecks, updateChecks } = loadWorkouts()
  for (const id of [0, -1, NaN, 1.5]) await assert.rejects(actions.setWorkoutWarmupStatus(id, 'completed'), /Invalid workout ID/)
  for (const status of [null, '', 'pending', 'invalid']) await assert.rejects(actions.setWorkoutWarmupStatus(42, status), /Choose done or skipped/)
  assert.deepEqual(ownershipChecks, [])
  assert.deepEqual(updateChecks, [])
})
