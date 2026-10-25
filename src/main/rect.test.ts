import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toCropRect } from './rect.ts'
import { fitLongest, estimateImageTokens } from '../shared.ts'

const view = { width: 1440, height: 900 }
const retina = { width: 2880, height: 1800 }

test('scales selection to retina pixels', () => {
  assert.deepEqual(toCropRect({ x: 10, y: 20, width: 100, height: 50 }, view, retina), { x: 20, y: 40, width: 200, height: 100 })
})

test('clamps selection at screen edge', () => {
  assert.deepEqual(toCropRect({ x: 1400, y: 880, width: 100, height: 100 }, view, retina), { x: 2800, y: 1760, width: 80, height: 40 })
})

test('rejects tiny or malformed selections', () => {
  assert.equal(toCropRect({ x: 0, y: 0, width: 19, height: 100 }, view, retina), null)
  assert.equal(toCropRect({ x: NaN, y: 0, width: 100, height: 100 }, view, retina), null)
  assert.equal(toCropRect(null as never, view, retina), null)
})

test('fits longest side to 1000px', () => {
  assert.deepEqual(fitLongest({ width: 2000, height: 500 }), { width: 1000, height: 250 })
  assert.deepEqual(fitLongest({ width: 400, height: 300 }), { width: 400, height: 300 })
})

test('estimates image tokens per provider', () => {
  assert.equal(estimateImageTokens('anthropic', { width: 1000, height: 750 }), 1000)
  assert.equal(estimateImageTokens('gemini', { width: 300, height: 300 }), 258)
  assert.equal(estimateImageTokens('gemini', { width: 1000, height: 500 }), 516)
  assert.equal(estimateImageTokens('openai', { width: 1000, height: 1000 }), 85 + 170 * 4)
})
