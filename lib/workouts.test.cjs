const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')

function loadWorkouts({ owned = true } = {}) {
  const paths = []
  const deletions = []
  const ownershipChecks = []
  const log = { id: 42, userId: 'user-1', status: 'in_progress' }
  const db = {
    async transaction(callback) {
      return callback({
        select() {
          return { from() { return { where(condition) {
            return { for: async () => {
              ownershipChecks.push(condition)
              return owned ? [log] : []
            } }
          } } } }
        },
        delete(table) {
          return { where: async (condition) => { deletions.push({ table, condition }) } }
        },
      })
    },
    update() {
      return { set(data) { return { where() { return { returning: async () => {
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
      workoutLog: { id: 'id', userId: 'userId' },
      exerciseLog: { id: 'exerciseId', workoutLogId: 'workoutLogId' },
      setLog: { exerciseLogId: 'exerciseLogId' },
    },
    './auth': { getUserId: async () => 'user-1' },
    'next/cache': { revalidatePath: (path) => paths.push(path) },
    'drizzle-orm': { eq: (...args) => args, and: (...args) => args, inArray: (...args) => args },
    '@/lib/strength': {},
  }
  const output = ts.transpileModule(fs.readFileSync(__dirname + '/actions/workouts.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText
  const mod = { exports: {} }
  new Function('require', 'exports', 'module', output)((id) => {
    if (!(id in mocks)) throw new Error(id)
    return mocks[id]
  }, mod.exports, mod)
  return { actions: mod.exports, paths, deletions, ownershipChecks }
}

test('deleting a workout checks ownership and removes sets before exercises and the workout', async () => {
  const { actions, paths, deletions, ownershipChecks } = loadWorkouts()
  await actions.deleteWorkoutLog(42)
  assert.deepEqual(ownershipChecks, [[['id', 42], ['userId', 'user-1']]])
  assert.deepEqual(deletions.map(({ table }) => table), [
    { exerciseLogId: 'exerciseLogId' },
    { id: 'exerciseId', workoutLogId: 'workoutLogId' },
    { id: 'id', userId: 'userId' },
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
