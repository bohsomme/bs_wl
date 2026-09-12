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
