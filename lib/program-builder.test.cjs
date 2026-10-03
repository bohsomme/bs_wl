const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')

function compile(file, mocks = {}) {
  const mod = { exports: {} }
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  new Function('require', 'exports', 'module', source)((id) => {
    if (!(id in mocks)) throw new Error(id)
    return mocks[id]
  }, mod.exports, mod)
  return mod.exports
}

function builder() {
  const state = [], tasks = [], writes = []
  let cursor = 0
  const { useProgramBuilder } = compile(__dirname + '/../app/(app)/programs/[id]/use-program-builder.ts', {
    react: {
      useState(initial) {
        const slot = cursor++
        if (!(slot in state)) state[slot] = initial
        return [state[slot], (value) => { state[slot] = typeof value === 'function' ? value(state[slot]) : value }]
      },
      useTransition: () => [false, (action) => tasks.push(Promise.resolve(action()))],
    },
    '@/lib/prescription': compile(__dirname + '/prescription.ts'),
    '@/lib/actions/exercises': {},
    '@/lib/actions/programs': {
      getTemplateExercises: async () => [], getFunctionalBlocks: async () => [],
      addTemplateExercise: async (data) => writes.push(data),
      updateTemplateExercise: async (id, data) => writes.push({ id, ...data }),
    },
  })
  return {
    writes,
    render() { cursor = 0; return useProgramBuilder({ program: { id: 1, totalWeeks: 4 }, initialTemplates: [], exercises: [] }) },
    async flush() { while (tasks.length) await Promise.all(tasks.splice(0)) },
  }
}

test('builder creates and reopens per-set targets and clears them when switching modes', async () => {
  const b = builder()
  b.render().selectTemplate({ id: 2 })
  await b.flush()
  b.render().setSelectedExId(1)
  b.render().setTargetType('per_set')
  b.render().setRepsBySetText('5, 3')
  assert.equal(b.render().validPrescription, false)
  b.render().handleAddExercise()
  await b.flush()
  assert.equal(b.writes.length, 0)
  b.render().setRepsBySetText('5, 3, 1')
  assert.equal(b.render().validPrescription, true)
  b.render().handleAddExercise()
  await b.flush()
  assert.deepEqual(b.writes[0].repsBySet, [5, 3, 1])
  assert.equal(b.writes[0].setsMin, 3)
  for (const mode of ['reps', 'time']) {
    b.render().handleEditExercise({ ...b.writes[0], id: 3 })
    assert.equal(b.render().targetType, 'per_set')
    assert.equal(b.render().repsBySetText, '5, 3, 1')
    b.render().setTargetType(mode)
    b.render().handleAddExercise()
    await b.flush()
    assert.equal(b.writes.at(-1).repsBySet, null)
    assert.equal(b.writes.at(-1).durationSecondsMin, mode === 'time' ? 5 : null)
  }
})
