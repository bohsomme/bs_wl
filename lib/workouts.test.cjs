const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')

function loadWorkouts() {
  const paths = []
  const log = { id: 42, userId: 'user-1', status: 'in_progress' }
  const db = {
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
    '@/lib/db/schema': { workoutLog: { id: 'id', userId: 'userId' } },
    './auth': { getUserId: async () => 'user-1' },
    'next/cache': { revalidatePath: (path) => paths.push(path) },
    'drizzle-orm': { eq() {}, and() {} },
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
  return { actions: mod.exports, paths }
}

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
