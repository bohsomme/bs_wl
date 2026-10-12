const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')

const root = path.resolve(__dirname, '..')
const workoutDir = 'app/(app)/workout/[id]/'

function loader(mocks = {}) {
  const cache = new Map()
  function load(file) {
    if (cache.has(file)) return cache.get(file)
    const mod = { exports: {} }
    const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText
    new Function('require', 'exports', 'module', output)((id) => {
      if (id in mocks) return mocks[id]
      if (!id.startsWith('@/') && !id.startsWith('.')) return require(id)
      const base = id.startsWith('@/') ? path.join(root, id.slice(2)) : path.resolve(path.dirname(file), id)
      return load(['.ts', '.tsx'].map((ext) => base + ext).find(fs.existsSync))
    }, mod.exports, mod)
    cache.set(file, mod.exports)
    return mod.exports
  }
  return (file) => load(path.join(root, file))
}

function fixture() {
  const rows = [1, 2, 3, 4].map((id) => ({
    el: { id, exerciseId: id, orderIndex: id, skipped: false },
    exercise: { id, name: 'Exercise ' + id },
  }))
  return {
    details: {
      log: { id: 10, name: 'Workout' }, exerciseLogs: rows, setsMap: {},
      prescriptionMap: Object.fromEntries(rows.map(({ el }) => [el.id, {
        section: el.id === 1 ? 'main' : 'accessory',
        superset: [2, 4].includes(el.id) ? 'Core' : null,
        setsMin: 2, repsMin: 10, weightType: 'fixed', weightValue: '20',
        notes: el.id === 2 ? 'Brace your core.\nKeep control.' : null,
        durationSecondsMin: el.id === 4 ? 30 : null,
      }])),
    },
    exercises: [{ id: 5, name: 'Added exercise' }], pbWeights: {},
  }
}

// Exercise the real hook across renders, with server actions recorded locally.
function session(props = fixture(), saveResult) {
  const state = []
  const tasks = []
  const writes = []
  let cursor = 0
  const load = loader({
    react: {
      useState(initial) {
        const slot = cursor++
        if (!(slot in state)) state[slot] = initial
        return [state[slot], (value) => { state[slot] = typeof value === 'function' ? value(state[slot]) : value }]
      },
      useTransition: () => [false, (action) => { tasks.push(Promise.resolve(action())) }],
    },
    'next/navigation': { useRouter: () => ({ push() {} }) },
    '@/lib/actions/exercises': {},
    '@/lib/actions/workouts': {
      updateExerciseLog: async (id, data) => { writes.push({ id, data }) },
      addExerciseLog: async (data) => ({ ...data, id: 5 }),
      upsertSetLog: async (data) => { writes.push(data); return saveResult ?? { ...data, weight: data.weight == null ? null : String(data.weight) } },
    },
  })
  const { useWorkoutSession } = load(workoutDir + 'use-workout-session.ts')
  return {
    writes, props,
    render() { cursor = 0; return useWorkoutSession(props) },
    async flush() { while (tasks.length) await Promise.all(tasks.splice(0)) },
  }
}

test('blank weights are handled across loading targets, reps, timed, free-pick and unplanned exercises', async () => {
  for (const timed of [false, true]) {
    for (const freePick of [false, true]) {
      for (const loading of ['fixed', 'rpe', 'pb_percent', 'range', 'unplanned']) {
        const props = fixture()
        const te = props.details.prescriptionMap[1]
        Object.assign(te, { weightType: loading === 'range' ? 'pb_percent' : loading, weightValue: null,
          percentages: loading === 'range' ? [{ min: 70, max: 80 }] : null,
          durationSecondsMin: timed ? 30 : null })
        if (loading === 'unplanned') delete props.details.prescriptionMap[1]
        if (freePick) Object.assign(props.details.exerciseLogs[0].el, { exerciseId: null, exerciseName: 'Bodyweight exercise' })
        const s = session(props)
        for (const isMakeup of [false, true]) {
          for (const missed of [false, true]) {
            const key = s.render().setKey(1, 1, isMakeup)
            s.render().setSetWeight({ [key]: '  ' })
            s.render().saveSet(1, 1, isMakeup, missed)
            await s.flush()
            if (freePick || (loading === 'range' && !missed)) {
              assert.match(s.render().saveError, /weight/)
            } else {
              assert.equal(s.render().saveError, null)
              assert.equal(s.writes.at(-1).weight, undefined)
              assert.equal(s.writes.at(-1).missed, missed)
              assert.equal(s.writes.at(-1).isMakeup, isMakeup)
            }
          }
        }
        if (freePick) assert.equal(s.writes.length, 0)
        s.render().setSetWeight({ '1-1-w': '0' })
        s.render().setSetQuantity({ '1-1-w': '10' })
        s.render().saveSet(1, 1)
        await s.flush()
        assert.equal(s.render().saveError, null)
        assert.equal(s.writes.at(-1).weight, 0)
      }
    }
  }
})

test('server validation failures remain inline and do not save a set, close the miss dialog or add makeup', async () => {
  const s = session(fixture(), { error: 'Enter a weight in kg.' })
  s.render().setMissModalKey('1-1-m')
  s.render().saveSet(1, 1, true, true, true)
  await s.flush()
  assert.equal(s.render().saveError, 'Enter a weight in kg.')
  assert.deepEqual(s.render().getSets(1), [])
  assert.equal(s.render().missModalKey, '1-1-m')
  assert.deepEqual(s.render().makeupSets, {})
})

test('a missed makeup retains its miss and makeup flags when saved and another makeup is added', async () => {
  const s = session()
  s.render().saveSet(1, 1, false, true, true)
  await s.flush()
  s.render().setMissReason({ '1-1-m': 'Lost balance' })
  s.render().saveSet(1, 1, true, true, true)
  await s.flush()
  const missedMakeup = s.render().getSets(1).find((set) => set.isMakeup)
  assert.equal(missedMakeup.missed, true)
  assert.equal(missedMakeup.missReason, 'Lost balance')
  assert.equal(s.render().makeupSets[1], 2)
})

test('finished workout uses red highlighting and the Makeup pill together for missed makeup sets', () => {
  const { ExerciseLogCard } = loader()('app/(app)/log/[id]/exercise-log-card.tsx')
  for (const isMakeup of [false, true]) {
    for (const missed of [false, true]) {
      const html = renderToStaticMarkup(React.createElement(ExerciseLogCard, {
        ...fixture().details.exerciseLogs[0],
        sets: [{ id: 1, setNumber: 1, isMakeup, missed, weight: null, reps: 5 }],
      }))
      assert.equal(html.includes('bg-destructive/10'), missed)
      assert.equal(html.includes('bg-primary/5'), isMakeup && !missed)
      assert.equal(html.includes('>Makeup<'), isMakeup)
      assert.equal(html.includes('>Miss<'), missed)
    }
  }
})

test('groups nonadjacent superset members once while leaving individual exercises separate', () => {
  const { groupWorkoutExercises } = loader()(workoutDir + 'workout-exercise-groups.ts')
  const { details } = fixture()
  const ids = (groups) => groups.map((rows) => rows.map(({ el }) => el.id))
  assert.deepEqual(ids(groupWorkoutExercises(details.exerciseLogs, details.prescriptionMap)), [[1], [2, 4], [3]])
  assert.deepEqual(groupWorkoutExercises([], {}), [])
  const legacyRows = details.exerciseLogs.map((row) => ({ ...row, el: { ...row.el, superset: row.el.id > 1 ? 'Legacy' : null } }))
  assert.deepEqual(ids(groupWorkoutExercises(legacyRows, {})), [[1], [2, 3, 4]])
  // A current prescription takes precedence over an old log label.
  assert.deepEqual(ids(groupWorkoutExercises(legacyRows, details.prescriptionMap)), [[1], [2, 4], [3]])
})

test('workout displays and saves individual set targets, including optional and makeup sets', async () => {
  const props = fixture()
  Object.assign(props.details.prescriptionMap[1], { setsMin: 2, setsMax: 3, repsBySet: [5, 3, 1] })
  const s = session(props)
  s.render().setPhase('exercises')
  s.render().addSet(1)
  assert.equal(s.render().setQuantity['1-3-w'], '1')
  const load = loader({ './use-workout-session': { useWorkoutSession: () => s.render() } })
  const { WorkoutSession } = load(workoutDir + 'workout-session.tsx')
  const html = renderToStaticMarkup(React.createElement(WorkoutSession, props))
  for (const [n, reps] of [[1, 5], [2, 3], [3, 1]]) {
    assert.match(html, new RegExp('id="reps-1-' + n + '-w"[^>]*value="' + reps + '"'))
    s.render().saveSet(1, n)
    await s.flush()
  }
  assert.deepEqual(s.render().getSets(1).map((set) => set.reps), [5, 3, 1])
  s.render().setSetQuantity({ '1-2-w': '4' })
  s.render().saveSet(1, 2, false, true, true)
  await s.flush()
  assert.equal(s.render().setQuantity['1-1-m'], '4')
  s.render().saveSet(1, 1, true)
  await s.flush()
  assert.equal(s.render().getSets(1).find((set) => set.isMakeup).reps, 4)
})

test('navigation saves notes and RPE for every superset member and visits the group once', async () => {
  const s = session()
  s.render().selectExerciseGroup(1)
  let view = s.render()
  view.setExNotes({ 2: 'Pull felt good', 4: 'Hold felt good' })
  view.setExRpe({ 2: '7', 4: '8' })
  view = s.render()
  view.advanceExercise()
  await s.flush()
  assert.deepEqual(s.render().currentRows.map(({ el }) => el.id), [3])
  assert.ok(s.writes.some(({ id, data }) => id === 2 && data.notes === 'Pull felt good' && data.topSetRpe === 7))
  assert.ok(s.writes.some(({ id, data }) => id === 4 && data.notes === 'Hold felt good' && data.topSetRpe === 8))
  s.render().selectExerciseGroup(1)
  assert.deepEqual(s.render().currentRows.map(({ el }) => el.id), [2, 4])
  s.render().selectExerciseGroup(2)
  s.render().advanceExercise()
  assert.equal(s.render().phase, 'finish')
  await s.flush()
})

test('skipping one superset member keeps its partner on screen', async () => {
  const s = session()
  s.render().selectExerciseGroup(1)
  let view = s.render()
  await view.skipExercise(view.currentRows[0])
  await s.flush()
  view = s.render()
  assert.equal(view.currentGroupIdx, 1)
  assert.equal(view.currentRows[0].el.skipped, true)
  assert.equal(view.currentRows[1].el.skipped, false)
  await view.skipExercise(view.currentRows[1])
  await s.flush()
  assert.equal(s.render().currentGroupIdx, 2)
})

test('superset members save independent rep and timed sets and newly added exercises remain reachable', async () => {
  const s = session()
  s.render().selectExerciseGroup(1)
  s.render().setSetQuantity({ '2-1-w': '12', '4-1-w': '45' })
  s.render().saveSet(2, 1)
  s.render().saveSet(4, 1)
  await s.flush()
  assert.equal(s.render().getSets(2)[0].reps, 12)
  assert.equal(s.render().getSets(2)[0].durationSeconds, undefined)
  assert.equal(s.render().getSets(4)[0].durationSeconds, 45)
  assert.equal(s.render().getSets(4)[0].reps, undefined)
  s.render().setSelectedAddExId(5)
  await s.render().handleAddExercise()
  await s.flush()
  assert.equal(s.render().currentGroupIdx, 3)
  assert.deepEqual(s.render().currentRows.map(({ el }) => el.id), [5])
})

test('workout renders every superset card with program notes directly below its title and unique inputs', () => {
  const props = fixture()
  for (const id of [2, 4]) {
    const row = props.details.exerciseLogs.find(({ el }) => el.id === id)
    row.el.exerciseId = null
    row.el.exerciseName = 'Free pick ' + id
    row.exercise = null
  }
  const s = session(props)
  s.render().setPhase('exercises')
  s.render().selectExerciseGroup(1)
  const load = loader({ './use-workout-session': { useWorkoutSession: () => s.render() } })
  const { WorkoutSession } = load(workoutDir + 'workout-session.tsx')
  const html = renderToStaticMarkup(React.createElement(WorkoutSession, props))
  assert.match(html, /Superset: Core/)
  assert.match(html, /Free pick 2<\/div><p[^>]*>Brace your core\.\nKeep control\.<\/p>/)
  for (const id of [2, 4]) {
    assert.match(html, new RegExp('id="chosen-exercise-' + id + '"'))
    assert.match(html, new RegExp('id="weight-' + id + '-1-w"'))
    assert.match(html, new RegExp('id="reps-' + id + '-1-w"'))
  }
  const inputIds = [...html.matchAll(/<input[^>]*\sid="([^"]+)"/g)].map((match) => match[1])
  assert.equal(new Set(inputIds).size, inputIds.length)
})
