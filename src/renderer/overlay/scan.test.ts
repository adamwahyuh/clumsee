import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toUrl } from './scan.ts'

test('recognizes web links only', () => {
  assert.equal(toUrl(' https://example.com/a?b=1 '), 'https://example.com/a?b=1')
  assert.equal(toUrl('www.example.com'), 'https://www.example.com/')
  assert.equal(toUrl('WIFI:S:home;T:WPA;P:secret;;'), null)
  assert.equal(toUrl('javascript:alert(1)'), null)
  assert.equal(toUrl('8992761111111'), null)
})
