const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')

function compile(file, mocks = {}) {
  const mod = { exports: {} }
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2015 } }).outputText
  new Function('require', 'exports', 'module', source)((id) => {
    if (!(id in mocks)) throw new Error(id)
    return mocks[id]
  }, mod.exports, mod)
  return mod.exports
}

function builder(rows = [], blocks = []) {
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
    '@/lib/template-exercise-order': compile(__dirname + '/template-exercise-order.ts'),
    '@/lib/actions/exercises': {},
    '@/lib/actions/programs': {
      getTemplateExercises: async () => rows, getFunctionalBlocks: async () => blocks,
      addTemplateExercise: async (data) => writes.push(data),
      updateTemplateExercise: async (id, data) => writes.push({ id, ...data }),
      updateFunctionalBlock: async (id, data) => { writes.push({ id, ...data }); return { ...blocks.find((b) => b.id === id), id, ...data } },
      addFunctionalBlock: async (data) => { writes.push(data); return { id: 99, ...data } },
      reorderTemplateExercises: async (templateId, section, ids) => {
        writes.push({ templateId, section, ids })
        const other = rows.filter((r) => r.te.section !== section)
        const ordered = ids.map((id) => rows.find((r) => r.te.id === id))
        rows = section === 'main' ? [...ordered, ...other] : [...other, ...ordered]
      },
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

test('functional work edits in place, clears optional fields and resets before adding', async () => {
  const block = { id: 7, orderIndex: 3, kind: 'custom', title: 'Fran', source: 'Class', details: '21-15-9', durationMin: 10 }
  const b = builder([], [block])
  b.render().selectTemplate({ id: 2 })
  await b.flush()
  b.render().handleEditFunctionalBlock(block)
  assert.equal(b.render().ffTitle, 'Fran')
  assert.equal(b.render().ffDuration, '10')
  assert.equal(b.render().ffSource, 'Class')
  assert.equal(b.render().ffDetails, '21-15-9')
  b.render().setFfKind('zone2')
  for (const setter of ['setFfTitle', 'setFfSource', 'setFfDetails', 'setFfDuration']) b.render()[setter]('')
  b.render().handleAddFunctionalBlock()
  await b.flush()
  assert.deepEqual(b.writes[0], { id: 7, kind: 'zone2', title: null, source: null, details: null, durationMin: null })
  assert.equal(b.render().functionalBlocks.length, 1)
  assert.equal(b.render().functionalBlocks[0].orderIndex, 3)
  assert.equal(b.render().editingFunctionalBlock, null)
  b.render().handleAddFunctionalBlock()
  await b.flush()
  assert.equal(b.render().functionalBlocks.length, 2)
  assert.equal(b.writes[1].orderIndex, 4)
})

test('accessory edits change loading and free-pick criteria without deleting the exercise', async () => {
  const b = builder()
  b.render().selectTemplate({ id: 2 })
  await b.flush()
  b.render().handleEditExercise({ id: 3, exerciseId: null, freePickCriteria: 'Pull', section: 'accessory', superset: 'A', setsMin: 3, repsMin: 10, weightType: 'rpe', rpeTarget: '8', notes: 'Slow' })
  assert.equal(b.render().freePick, true)
  b.render().setFreePickCriteria('')
  b.render().handleAddExercise()
  await b.flush()
  assert.equal(b.writes.length, 0)
  b.render().setFreePickCriteria('Push')
  b.render().setWeightType('fixed')
  b.render().setWeightValue('20')
  b.render().setExNotes('')
  b.render().handleAddExercise()
  await b.flush()
  assert.equal(b.writes[0].id, 3)
  assert.equal(b.writes[0].freePickCriteria, 'Push')
  assert.equal(b.writes[0].weightValue, 20)
  assert.equal(b.writes[0].rpeTarget, null)
  assert.equal(b.writes[0].notes, null)
  b.render().handleEditExercise(b.writes[0])
  b.render().setFreePick(false)
  b.render().setSelectedExId(8)
  b.render().setSuperset('')
  b.render().setWeightType('pb_percent')
  b.render().setPercentText('75')
  b.render().handleAddExercise()
  await b.flush()
  assert.equal(b.writes[1].exerciseId, 8)
  assert.equal(b.writes[1].freePickCriteria, null)
  assert.equal(b.writes[1].superset, null)
  assert.deepEqual(b.writes[1].percentages, [{ min: 75 }])
})

test('main and accessory exercises move within their own sections and stop at boundaries', async () => {
  const rows = [1, 2, 3, 4].map((id) => ({ te: { id, section: id < 3 ? 'main' : 'accessory' } }))
  const b = builder(rows)
  b.render().selectTemplate({ id: 2 })
  await b.flush()
  b.render().handleMoveExercise(1, -1)
  b.render().handleMoveExercise(4, 1)
  assert.equal(b.writes.length, 0)
  b.render().handleMoveExercise(1, 1)
  await b.flush()
  assert.deepEqual(b.writes[0], { templateId: 2, section: 'main', ids: [2, 1] })
  b.render().handleMoveExercise(4, -1)
  await b.flush()
  assert.deepEqual(b.writes[1], { templateId: 2, section: 'accessory', ids: [4, 3] })
  assert.deepEqual(b.render().templateExercises.map((r) => r.te.id), [2, 1, 4, 3])
})

test('accessory ordering moves superset members internally and whole groups past neighbors', () => {
  const { moveTemplateExercise, groupTemplateExercises } = compile(__dirname + '/template-exercise-order.ts')
  const rows = [1, 2, 3, 4, 5].map((id) => ({ te: { id, section: 'accessory', superset: [1, 3].includes(id) ? 'A' : id > 3 ? 'B' : null } }))
  assert.deepEqual(groupTemplateExercises(rows).map((g) => g.map((r) => r.te.id)), [[1, 3], [2], [4, 5]])
  assert.deepEqual(moveTemplateExercise(rows, 1, 1), [3, 1, 2, 4, 5])
  assert.deepEqual(moveTemplateExercise(rows, 3, 1), [2, 1, 3, 4, 5])
  assert.deepEqual(moveTemplateExercise(rows, 2, -1), [2, 1, 3, 4, 5])
  assert.deepEqual(moveTemplateExercise(rows, 4, -1), [1, 3, 4, 5, 2])
  assert.equal(moveTemplateExercise(rows, 1, -1), null)
  assert.equal(moveTemplateExercise(rows, 5, 1), null)
  assert.deepEqual(rows.map((r) => r.te.id), [1, 2, 3, 4, 5])
})
