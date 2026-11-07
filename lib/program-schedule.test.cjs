const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')

function compile(file, mocks = {}) {
  const mod = { exports: {} }
  const source = ts.transpileModule(fs.readFileSync(__dirname + '/' + file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  new Function('require', 'exports', 'module', source)((id) => {
    if (!(id in mocks)) throw new Error(id)
    return mocks[id]
  }, mod.exports, mod)
  return mod.exports
}
const schedule = compile('program-schedule.ts')
const plan = (id, startDate, totalWeeks = 1) => ({ id, name: `Program ${id}`, isActive: true, startDate, totalWeeks })

function actions(file, results) {
  const writes = [], paths = [], reads = [], locks = []
  const schema = new Proxy({}, { get: (_, table) => new Proxy({ table }, { get: (obj, key) => key === 'table' ? table : `${table}.${String(key)}` }) })
  const db = {
    select() {
      const result = results.shift() ?? []
      const chain = { then: (resolve, reject) => Promise.resolve(result).then(resolve, reject) }
      for (const key of ['from', 'where', 'orderBy', 'limit', 'for']) chain[key] = (...args) => {
        if (key === 'where') reads.push(args[0])
        if (key === 'for') locks.push(args[0])
        return chain
      }
      return chain
    },
    update(table) { return { set(data) { return { where: async (condition) => writes.push({ table: table.table, data, condition }) } } } },
    transaction: async (fn) => fn(db),
  }
  const orm = new Proxy({}, { get: (_, op) => (...args) => ({ op, args }) })
  const exported = compile(`actions/${file}.ts`, {
    '@/lib/db': { db }, '@/lib/db/schema': schema, 'drizzle-orm': orm,
    './auth': { getUserId: async () => 'owner' }, 'next/cache': { revalidatePath: (path) => paths.push(path) },
    '@/lib/program-schedule': { ...schedule, localDate: () => '2026-10-25' },
    '@/lib/prescription': {}, '@/lib/strength': {}, '@/lib/set-log-validation': {},
  })
  return { ...exported, writes, paths, reads, locks }
}

test('program dates include the final day and remain stable across months, leap years and DST', () => {
  assert.equal(schedule.programEnd(plan(1, '2026-10-25')), '2026-10-31')
  assert.equal(schedule.programEnd(plan(1, '2024-02-26')), '2024-03-03')
  assert.equal(schedule.dateAt('2026-03-27', 7), '2026-04-03')
  assert.equal(schedule.programEnd(plan(1, '2026-12-28')), '2027-01-03')
  const existing = plan(1, '2026-10-25')
  for (const start of ['2026-10-19', '2026-10-25', '2026-10-31']) {
    assert.equal(schedule.findProgramConflicts(plan(2, start), [existing]).length, 1)
  }
  for (const start of ['2026-10-18', '2026-11-01']) {
    assert.deepEqual(schedule.findProgramConflicts(plan(2, start), [existing]), [])
  }
  assert.deepEqual(schedule.findProgramConflicts(existing, [existing]), [])
  assert.deepEqual(schedule.findProgramConflicts(plan(2, '2026-10-25'), [{ ...existing, isActive: false }]), [])
})

test('future assignment preserves the current and other scheduled programs', async () => {
  const a = actions('programs', [[{ id: 'owner' }], [plan(1, '2026-10-25'), plan(2, null), plan(3, '2026-11-08')]])
  const result = await a.setActiveProgram(2, '2026-11-01')
  assert.equal(result.status, 'assigned')
  assert.deepEqual(result.replacedIds, [])
  assert.equal(a.writes.length, 1)
  assert.equal(a.writes[0].data.isActive, true)
  assert.equal(a.writes[0].data.startDate, '2026-11-01')
  assert.deepEqual(a.locks, ['update', 'update'])
  assert.ok(a.paths.includes('/dashboard'))
})

test('overlap writes nothing until confirmed; replacement affects only the listed conflicts', async () => {
  const programs = [plan(1, '2026-10-25'), plan(2, null, 2), plan(3, '2026-11-01'), plan(4, '2026-12-01')]
  const warning = actions('programs', [[], programs])
  const result = await warning.setActiveProgram(2, '2026-10-31')
  assert.equal(result.status, 'conflict')
  assert.deepEqual(result.conflicts.map((p) => p.id), [1, 3])
  assert.deepEqual(warning.writes, [])
  assert.deepEqual(warning.paths, [])
  const confirmed = actions('programs', [[], programs])
  assert.deepEqual(await confirmed.setActiveProgram(2, '2026-10-31', result.confirmation), { status: 'assigned', replacedIds: [1, 3] })
  assert.equal(confirmed.writes.length, 2)
  assert.equal(confirmed.writes[0].data.isActive, false)
  assert.deepEqual(confirmed.writes[0].condition, { op: 'and', args: [
    { op: 'eq', args: ['program.userId', 'owner'] },
    { op: 'inArray', args: ['program.id', [1, 3]] },
  ] })
  assert.equal(confirmed.writes[1].data.isActive, true)
})

test('changed conflicts or requested dates require a fresh warning before replacement', async () => {
  const programs = [plan(1, '2026-10-25'), plan(2, null, 2)]
  const initial = await actions('programs', [[], programs]).setActiveProgram(2, '2026-10-31')
  for (const [rows, date] of [
    [[...programs, plan(3, '2026-11-01')], '2026-10-31'],
    [[{ ...programs[0], totalWeeks: 2 }, programs[1]], '2026-10-31'],
    [programs, '2026-10-30'],
  ]) {
    const a = actions('programs', [[], rows])
    assert.equal((await a.setActiveProgram(2, date, initial.confirmation)).status, 'conflict')
    assert.deepEqual(a.writes, [])
  }
})

test('invalid dates and unowned programs cannot be assigned', async () => {
  for (const date of ['', '2026-02-30', '2026-13-01', '26-10-25']) {
    const a = actions('programs', [])
    await assert.rejects(a.setActiveProgram(1, date), /valid start date/)
    assert.deepEqual(a.writes, [])
  }
  const a = actions('programs', [[], []])
  await assert.rejects(a.setActiveProgram(99, '2026-10-25'), /not found/)
  assert.deepEqual(a.writes, [])
})

test('program status distinguishes current, scheduled, ended and unassigned dates', () => {
  assert.equal(schedule.programStatus(plan(1, '2026-10-25'), '2026-10-25'), 'Current')
  assert.equal(schedule.programStatus(plan(1, '2026-10-25'), '2026-10-31'), 'Current')
  assert.equal(schedule.programStatus(plan(1, '2026-11-01'), '2026-10-25'), 'Scheduled')
  assert.equal(schedule.programStatus(plan(1, '2026-10-18'), '2026-10-25'), 'Ended')
  assert.equal(schedule.programStatus({ ...plan(1, '2026-10-25'), isActive: false }, '2026-10-25'), null)
})

test('next workout prefers the current program regardless of query order and advances to a future one', async () => {
  const current = plan(1, '2026-10-25'), future = plan(2, '2026-11-01')
  const template = (id) => ({ id, weekNumber: 1, dayNumber: 1 })
  const a = actions('workouts', [[future, current], [template(20)], [], [template(10)], []])
  assert.equal((await a.getNextWorkout()).program.id, 1)
  const completed = actions('workouts', [[current, future], [template(10)], [{ workoutTemplateId: 10 }], [template(20)], []])
  assert.equal((await completed.getNextWorkout()).program.id, 2)
  const ended = actions('workouts', [[plan(3, '2026-10-18'), future], [template(20)], []])
  assert.equal((await ended.getNextWorkout()).program.id, 2)
  const empty = actions('workouts', [[current, future], [], [], [template(20)], []])
  assert.equal((await empty.getNextWorkout()).program.id, 2)
  assert.equal(await actions('workouts', [[]]).getNextWorkout(), null)
})

// Render the client components across state changes and drive their public controls.
test('skipped workouts advance progression and remain in workout history queries', async () => {
  const a = actions('workouts', [[plan(1, '2026-10-25')],
    [{ id: 10, weekNumber: 1, dayNumber: 1 }, { id: 11, weekNumber: 1, dayNumber: 2 }],
    [{ workoutTemplateId: 10, status: 'skipped' }],
  ])
  assert.equal((await a.getNextWorkout()).template.id, 11)
  assert.ok(a.reads.some((condition) => condition.args?.some((part) => part?.op === 'inArray' && part.args[0] === 'workoutLog.status' && part.args[1].includes('skipped'))))
  const history = actions('workouts', [[{ id: 1, status: 'skipped' }]])
  assert.equal((await history.getWorkoutLogs())[0].status, 'skipped')
  assert.deepEqual(history.reads[0].args[1], { op: 'inArray', args: ['workoutLog.status', ['completed', 'skipped']] })
})

function client(file, exportName, props, mocks = {}) {
  const state = [], tasks = []
  let cursor = 0
  const ui = new Proxy({}, { get: (_, name) => name })
  const imports = {
    react: {
      useState(initial) {
        const slot = cursor++
        if (!(slot in state)) state[slot] = initial
        return [state[slot], (value) => { state[slot] = typeof value === 'function' ? value(state[slot]) : value }]
      },
      useEffect() {},
      useTransition: () => [false, (fn) => tasks.push(Promise.resolve(fn()))],
    },
    'react/jsx-runtime': require('react/jsx-runtime'), 'lucide-react': ui,
    'next/navigation': { useRouter: () => ({ refresh() {} }) }, 'next/link': { default: 'Link' },
    '@/lib/program-schedule': schedule, '@/lib/utils': { cn: (...args) => args.filter(Boolean).join(' ') },
    '@/lib/prescription': compile('prescription.ts'),
    '@/components/exercise-picker': ui,
    ...mocks,
  }
  for (const name of ['button', 'card', 'badge', 'input', 'label', 'textarea', 'dialog', 'alert-dialog', 'dropdown-menu']) imports[`@/components/ui/${name}`] = ui
  const component = compile(file, imports)[exportName]
  return {
    render() { cursor = 0; return component(props) },
    async flush() { while (tasks.length) await Promise.all(tasks.splice(0)) },
  }
}
function nodes(node) {
  if (Array.isArray(node)) return node.flatMap(nodes)
  if (!node || typeof node !== 'object') return []
  return [node, ...nodes(node.props?.children)]
}
function text(node) {
  if (Array.isArray(node)) return node.map(text).join('')
  return node && typeof node === 'object' ? text(node.props?.children) : node == null || typeof node === 'boolean' ? '' : String(node)
}
function control(c, type, label) {
  const found = nodes(c.render()).find((node) => node.type === type && text(node).trim() === label)
  assert.ok(found, `Missing ${type}: ${label}`)
  return found.props
}
function input(c, id) {
  const found = nodes(c.render()).find((node) => node.props?.id === id)
  assert.ok(found, `Missing input ${id}`)
  return found.props
}

test('assignment dialog cancels overlaps, requires replacement and clears confirmation when dates change', async () => {
  const calls = []
  const warning = { status: 'conflict', conflicts: [{ id: 1, name: 'Current program', startDate: '2026-10-25', endDate: '2026-10-31' }], confirmation: 'reviewed-conflicts' }
  const c = client('../app/(app)/programs/program-list.tsx', 'ProgramList', { initialPrograms: [plan(1, '2026-10-25'), { ...plan(2, null), isActive: false }] }, {
    '@/lib/actions/programs': { setActiveProgram: async (...args) => { calls.push(args); return args[2] ? { status: 'assigned', replacedIds: [1] } : warning } },
  })
  control(c, 'DropdownMenuItem', 'Assign program').onClick()
  input(c, 'program-start').onChange({ target: { value: '2026-10-31' } })
  control(c, 'Button', 'Assign Program').onClick()
  await c.flush()
  assert.match(text(c.render()), /Program dates overlap/)
  control(c, 'Button', 'Cancel').onClick()
  assert.equal(nodes(c.render()).find((n) => n.type === 'Dialog').props.open, false)
  assert.equal(calls.length, 1)
  control(c, 'DropdownMenuItem', 'Assign program').onClick()
  input(c, 'program-start').onChange({ target: { value: '2026-10-31' } })
  control(c, 'Button', 'Assign Program').onClick()
  await c.flush()
  input(c, 'program-start').onChange({ target: { value: '2026-10-30' } })
  assert.doesNotMatch(text(c.render()), /Program dates overlap/)
  control(c, 'Button', 'Assign Program').onClick()
  await c.flush()
  control(c, 'Button', 'Replace and assign').onClick()
  await c.flush()
  assert.deepEqual(calls.at(-1), [2, '2026-10-30', 'reviewed-conflicts'])
  assert.equal(nodes(c.render()).find((n) => n.type === 'Dialog').props.open, false)
})

test('calendar shows workouts from current and future programs and can jump between them', () => {
  const c = client('../components/program-calendar.tsx', 'ProgramCalendar', {
    programs: [plan(1, '2026-10-25'), plan(2, '2026-11-01')], today: '2026-10-25',
    templates: [
      { id: 10, programId: 1, name: 'Current workout', weekNumber: 1, dayNumber: 1, orderInDay: 0 },
      { id: 20, programId: 2, name: 'Future workout', weekNumber: 1, dayNumber: 1, orderInDay: 0 },
    ],
  })
  const selectedDay = () => nodes(c.render()).find((n) => n.type === 'button' && n.props['aria-pressed']).props['aria-label']
  assert.match(selectedDay(), /Program 1: Current workout/)
  nodes(c.render()).filter((n) => n.type === 'Button' && text(n) === 'Show in calendar')[1].props.onClick()
  assert.match(selectedDay(), /Program 2: Future workout/)
  control(c, 'Button', 'Today').onClick()
  assert.match(selectedDay(), /Program 1: Current workout/)
  assert.equal(nodes(c.render()).filter((n) => n.type === 'Link' && n.props.href.startsWith('/programs/')).length, 2)
})

test('clicking a planned calendar day opens its overview while rest and empty days stay in the calendar', () => {
  const routes = []
  const c = client('../components/program-calendar.tsx', 'ProgramCalendar', {
    programs: [plan(1, '2026-10-25')], today: '2026-10-25',
    templates: [
      { id: 10, programId: 1, name: 'Strength', weekNumber: 1, dayNumber: 1, orderInDay: 0 },
      { id: 11, programId: 1, name: 'Rest', weekNumber: 1, dayNumber: 2, orderInDay: 0, isRestDay: true },
    ],
  }, { 'next/navigation': { useRouter: () => ({ push: (route) => routes.push(route) }) } })
  const day = (label) => nodes(c.render()).find((n) => n.type === 'button' && n.props['aria-label'].startsWith(label))
  day('Sunday, 25 October 2026').props.onClick()
  assert.deepEqual(routes, ['/calendar/2026-10-25'])
  const overviewLink = nodes(c.render()).find((n) => n.type === 'Link' && text(n) === 'Strength')
  assert.equal(overviewLink.props.href, '/calendar/2026-10-25#workout-10')
  day('Monday, 26 October 2026').props.onClick()
  day('Tuesday, 27 October 2026').props.onClick()
  assert.deepEqual(routes, ['/calendar/2026-10-25'])
})

test('individual accessory form offers free-pick and retains criteria when leaving a superset', async () => {
  const writes = []
  const c = client('../app/(app)/programs/[id]/accessory-form.tsx', 'AccessoryForm', { templateId: 1, exercises: [], onSaved: async () => {} }, {
    '@/lib/actions/programs': { addAccessoryGroup: async (data) => writes.push(data) },
  })
  control(c, 'Button', 'Add Accessory').onClick()
  nodes(c.render()).find((n) => n.type === 'input' && n.props.type === 'checkbox').props.onChange({ target: { checked: true } })
  input(c, 'criteria-0').onChange({ target: { value: 'Any horizontal pull' } })
  input(c, 'accessory-kind').onChange({ target: { value: 'superset' } })
  input(c, 'accessory-kind').onChange({ target: { value: 'single' } })
  assert.equal(input(c, 'criteria-0').value, 'Any horizontal pull')
  control(c, 'Button', 'Add exercise').onClick()
  await c.flush()
  assert.equal(writes.length, 1)
  assert.equal(writes[0].superset, undefined)
  assert.equal(writes[0].exercises.length, 1)
  assert.equal(writes[0].exercises[0].exerciseId, null)
  assert.equal(writes[0].exercises[0].freePickCriteria, 'Any horizontal pull')
})

test('skip dialog cancels without writing and confirms using only the workout ID', async () => {
  const writes = [], routes = []
  const c = client('../app/(app)/workout/[id]/skip-workout-button.tsx', 'SkipWorkoutButton', { id: 42, disabled: false }, {
    '@/lib/actions/workouts': { skipWorkout: async (id) => writes.push(id) },
    'next/navigation': { useRouter: () => ({ replace: (route) => routes.push(route), refresh() {} }) },
  })
  const dialog = () => nodes(c.render()).find((node) => node.type === 'AlertDialog').props
  dialog().onOpenChange(true)
  assert.equal(dialog().open, true)
  assert.match(text(c.render()), /No check-in or other information is required/)
  dialog().onOpenChange(false)
  assert.deepEqual(writes, [])
  dialog().onOpenChange(true)
  await control(c, 'AlertDialogAction', 'Skip workout').onClick()
  assert.deepEqual(writes, [42])
  assert.deepEqual(routes, ['/log/42'])
})

test('failed skip keeps the confirmation open with an error and permits retry', async () => {
  const c = client('../app/(app)/workout/[id]/skip-workout-button.tsx', 'SkipWorkoutButton', { id: 42, disabled: false }, {
    '@/lib/actions/workouts': { skipWorkout: async () => { throw new Error('Could not save') } },
  })
  nodes(c.render()).find((node) => node.type === 'AlertDialog').props.onOpenChange(true)
  await control(c, 'AlertDialogAction', 'Skip workout').onClick()
  assert.equal(nodes(c.render()).find((node) => node.type === 'AlertDialog').props.open, true)
  assert.match(text(c.render()), /Could not save/)
  assert.equal(control(c, 'AlertDialogAction', 'Skip workout').disabled, false)
})
