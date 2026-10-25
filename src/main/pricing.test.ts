import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cost } from './pricing.ts'

test('prices known models and returns null for unknown ones', () => {
  const u = { input: 1_000_000, output: 1_000_000, cacheRead: 0, cacheWrite: 0, truncated: false }
  assert.equal(cost('claude-opus-5-5', u), 24)
  assert.equal(cost('claude-haiku-5-5', { ...u, input: 0, output: 0, cacheRead: 1_000_000 }), 0.01)
  assert.equal(cost('gemini-flash-latest', u), null)
})
