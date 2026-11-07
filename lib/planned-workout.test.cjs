const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')

const root = path.resolve(__dirname, '..')
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

const template = { id: 10, programId: 1, name: 'Strength', weekNumber: 1, dayNumber: 1, orderInDay: 0, warmup: 'Row 5 minutes\nEmpty-bar drills' }
const prescription = { setsMin: 2, setsMax: 3, repsMin: 5, repsMax: null, section: 'main', weightType: 'fixed', weightValue: null }

test('planned workout renders all instructions and targets on one read-only page', () => {
  const { PlannedWorkoutOverview } = loader()('components/planned-workout-overview.tsx')
  const html = renderToStaticMarkup(React.createElement(PlannedWorkoutOverview, {
    template, programName: 'My program',
    exercises: [
      { te: { ...prescription, id: 1, repsBySet: [5, 3, 1], weightType: 'pb_percent', percentages: [{ min: 70 }, { min: 75, max: 80 }], totalRepsMin: 9, totalRepsMax: 12, notes: 'Pause at the bottom.\nKeep control.' }, exercise: { name: 'Squat', muscleGroup: 'Legs', description: 'Keep your chest up.' } },
      { te: { ...prescription, id: 2, section: 'accessory', superset: 'Core', weightType: 'rpe', rpeTarget: '8', freePickCriteria: 'Any horizontal pull', notes: 'Brace your core.' }, exercise: null },
      { te: { ...prescription, id: 3, section: 'accessory', superset: 'Core', durationSecondsMin: 30, durationSecondsMax: 45, weightValue: '0' }, exercise: { name: 'Plank' } },
    ],
    functionalBlocks: [{ id: 1, kind: 'custom', title: 'Intervals', source: 'Class programming', durationMin: 12, details: 'Row 250m\nRest 1 minute' }],
  }))
  for (const text of ['Strength', 'My program', 'Row 5 minutes\nEmpty-bar drills', 'Squat', '2-3 sets', '5, 3, 1 reps by set', '70%, 75-80% of PB (by set)', 'Total reps target: 9-12', 'Pause at the bottom.\nKeep control.', 'Legs', 'Keep your chest up.', 'Accessories', 'Superset: Core', 'Free-pick exercise', 'Any horizontal pull', 'RPE 8', 'Brace your core.', 'Plank', '30-45 sec', '0 kg', 'Functional Fitness', 'Intervals', 'Class programming', '12 min', 'Row 250m\nRest 1 minute']) {
    assert.ok(html.includes(text), `Missing plan detail: ${text}`)
  }
  const sections = ['Prescribed warmup', 'Main exercises', 'Accessories', 'Functional Fitness'].map((text) => html.indexOf(text))
  assert.deepEqual(sections, [...sections].sort((a, b) => a - b))
  assert.equal(html.match(/Superset: Core/g).length, 1)
  assert.doesNotMatch(html, /<input|<textarea|<select|<form|<button/)
})

function pageFixture(programs, templates) {
  const reads = []
  const page = loader({
    'next/navigation': { notFound() { throw new Error('Not found') } },
    'next/link': ({ children, ...props }) => React.createElement('a', props, children),
    '@/lib/actions/programs': {
      getPrograms: async () => programs,
      getWorkoutTemplates: async (id) => { reads.push(['templates', id]); return templates.filter((t) => t.programId === id) },
      getTemplateExercises: async (id) => { reads.push(['exercises', id]); return [{ te: { ...prescription, id }, exercise: { name: `Exercise ${id}` } }] },
      getFunctionalBlocks: async (id) => { reads.push(['functional', id]); return [] },
    },
  })('app/(app)/calendar/[date]/page.tsx').default
  return { reads, render: (date) => page({ params: Promise.resolve({ date }) }) }
}

test('calendar overview includes every workout on the date in order and only reads matching assigned programs owned by the user', async () => {
  const programs = [
    { id: 1, name: 'Current', isActive: true, startDate: '2026-11-01', totalWeeks: 2 },
    { id: 2, name: 'Unassigned', isActive: false, startDate: '2026-11-01', totalWeeks: 2 },
    { id: 3, name: 'Future', isActive: true, startDate: '2026-12-01', totalWeeks: 2 },
  ]
  const s = pageFixture(programs, [
    { ...template, id: 12, name: 'Evening', orderInDay: 2 },
    { ...template, id: 11, name: 'Morning', orderInDay: 1 },
    { ...template, id: 13, name: 'Tomorrow', dayNumber: 2 },
    { ...template, id: 20, programId: 2, name: 'Unassigned workout' },
    { ...template, id: 40, programId: 4, name: 'Another user workout' },
  ])
  const html = renderToStaticMarkup(await s.render('2026-11-01'))
  assert.ok(html.indexOf('Morning') < html.indexOf('Evening'))
  assert.match(html, /Sunday, 1 November 2026/)
  assert.match(html, /Exercise 11/)
  assert.match(html, /Exercise 12/)
  assert.doesNotMatch(html, /Tomorrow|Unassigned workout|Another user workout|<input|<textarea|<select/)
  assert.deepEqual(s.reads.filter(([kind]) => kind === 'templates'), [['templates', 1]])
  assert.deepEqual(s.reads.filter(([kind]) => kind === 'exercises'), [['exercises', 11], ['exercises', 12]])
})

test('calendar overview rejects invalid dates and dates without assigned workouts', async () => {
  for (const date of ['invalid', '2026-02-30', '2026-13-01', '2026-1-1']) {
    const s = pageFixture([], [])
    await assert.rejects(s.render(date), /Not found/)
    assert.deepEqual(s.reads, [])
  }
  const s = pageFixture([{ id: 1, isActive: true, startDate: '2026-11-01', totalWeeks: 1 }], [template])
  await assert.rejects(s.render('2026-11-02'), /Not found/)
})
