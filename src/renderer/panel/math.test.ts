import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeMath } from './math.ts'

test('converts LaTeX bracket delimiters to dollars', () => {
  assert.equal(normalizeMath('a \\(x+1\\) b \\[y = 2\\]'), 'a $x+1$ b $$y = 2$$')
  assert.equal(normalizeMath('$$(x - 2y + z) = 5$$'), '$$(x - 2y + z) = 5$$')
})
