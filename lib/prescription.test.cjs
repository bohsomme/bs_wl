const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const compiled = ts.transpileModule(fs.readFileSync(`${__dirname}/prescription.ts`, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText
const mod = { exports: {} }
new Function('exports', 'module', compiled)(mod.exports, mod)
const { parsePercentages, percentageAt, weightTarget, rangeStatus } = mod.exports

test('per-set reps parse in order and resolve each set independently', () => {
  const { parseRepsBySet, exerciseTarget, describeExerciseTarget } = mod.exports
  const p = { repsMin: 5, repsBySet: parseRepsBySet('5, 3, 1') }
  assert.deepEqual(p.repsBySet, [5, 3, 1])
  assert.deepEqual([1, 2, 3, 4].map((n) => exerciseTarget(p, n).min), [5, 3, 1, 1])
  assert.equal(describeExerciseTarget(p), '5, 3, 1 reps by set')
  assert.equal(exerciseTarget({ repsMin: 5, repsMax: 8 }, 3).max, 8)
  for (const text of ['', '5,', '0, 3, 1', '-5, 3', '2.5, 1', '5-8, 3', 'NaN', '1e3']) {
    assert.throws(() => parseRepsBySet(text))
  }
})

test('per-set targets require one positive whole rep count for every possible set', () => {
  const { validateRepsBySet } = mod.exports
  validateRepsBySet({ setsMin: 3 })
  validateRepsBySet({ setsMin: 3, repsBySet: null })
  validateRepsBySet({ setsMin: 2, setsMax: 3, repsBySet: [5, 3, 1] })
  for (const patch of [
    { repsBySet: [] }, { repsBySet: [5, 3] }, { repsBySet: [5, 3, 0] },
    { repsBySet: [5, 3, 1.5] }, { repsBySet: [5, 3, NaN] }, { repsBySet: '5, 3, 1' },
    { durationSecondsMin: 30 }, { durationSecondsMax: 30 }, { repsMax: 8 },
  ]) assert.throws(() => validateRepsBySet({ setsMin: 3, repsBySet: [5, 3, 1], ...patch }))
})

test('timed targets display seconds and legacy prescriptions remain reps', () => {
  const { describeExerciseTarget, exerciseTarget } = mod.exports
  assert.equal(describeExerciseTarget({ repsMin: 5, repsMax: 8 }), '5-8 reps')
  assert.equal(exerciseTarget({ repsMin: 5 }).timed, false)
  assert.equal(describeExerciseTarget({ repsMin: 1, durationSecondsMin: 30 }), '30 sec')
  assert.equal(describeExerciseTarget({ repsMin: 1, durationSecondsMin: 30, durationSecondsMax: 45 }), '30-45 sec')
})

test('duration targets reject invalid seconds, reversed ranges and total reps', () => {
  const { validateDurationTarget } = mod.exports
  validateDurationTarget({})
  validateDurationTarget({ durationSecondsMin: 30, durationSecondsMax: 30 })
  for (const target of [
    { durationSecondsMin: 0 }, { durationSecondsMin: -1 },
    { durationSecondsMin: 1.5 }, { durationSecondsMin: NaN },
    { durationSecondsMin: 30, durationSecondsMax: 20 },
    { durationSecondsMax: 30 },
    { durationSecondsMin: 30, totalRepsMin: 10 },
  ]) assert.throws(() => validateDurationTarget(target))
})

test('single, ranged and per-set percentages produce corresponding weights', () => {
  assert.equal(weightTarget(parsePercentages('75')[0], 120), '90')
  assert.equal(weightTarget(parsePercentages('75-80')[0], 120), '90-96')
  const te = { weightValue: null, percentages: parsePercentages('70, 75-80, 85') }
  assert.equal(weightTarget(percentageAt(te, 2), 120), '90-96')
  assert.equal(weightTarget(percentageAt(te, 3), 120), '102')
})

test('shared ranges repeat and makeup sets use the final target', () => {
  const shared = { weightValue: null, percentages: parsePercentages('75-80') }
  assert.deepEqual(percentageAt(shared, 5), { min: 75, max: 80 })
  const varied = { weightValue: null, percentages: parsePercentages('70, 80') }
  assert.deepEqual(percentageAt(varied, 3), { min: 80 })
})

test('legacy percentages remain supported and fractional kg are rounded', () => {
  assert.equal(weightTarget(percentageAt({ weightValue: '77.5', percentages: null }, 1), 123), '95.33')
})

test('invalid and reversed ranges are rejected', () => {
  for (const value of ['', '80-70', '0', '-20', '151', '75,', 'NaN', '70-80-90']) {
    assert.throws(() => parsePercentages(value), undefined, value)
  }
})

test('total reps and set targets have inclusive bounds', () => {
  assert.equal(rangeStatus(9, 10, 12), 'Below')
  assert.equal(rangeStatus(10, 10, 12), 'Within')
  assert.equal(rangeStatus(12, 10, 12), 'Within')
  assert.equal(rangeStatus(13, 10, 12), 'Above')
  assert.equal(rangeStatus(4, 4, 5), 'Within')
  assert.equal(rangeStatus(6, 4, 5), 'Above')
  assert.equal(rangeStatus(3, 3, null), 'Within')
})
