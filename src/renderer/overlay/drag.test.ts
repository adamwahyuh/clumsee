import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dragRect } from './drag.ts'

const bounds = { width: 1000, height: 800 }
const box = { x: 100, y: 100, width: 200, height: 100 }

test('draws a new box in any direction', () => {
  assert.deepEqual(dragRect('new', { x: 300, y: 300 }, { x: 100, y: 200 }, null, bounds), { x: 100, y: 200, width: 200, height: 100 })
})

test('moves a box but keeps it on screen', () => {
  assert.deepEqual(dragRect('move', { x: 150, y: 150 }, { x: 2000, y: 160 }, box, bounds), { ...box, x: 800, y: 110 })
})

test('resizes from a corner with the opposite corner fixed', () => {
  assert.deepEqual(dragRect('nw', { x: 100, y: 100 }, { x: 50, y: 80 }, box, bounds), { x: 50, y: 80, width: 250, height: 120 })
  assert.deepEqual(dragRect('se', { x: 300, y: 200 }, { x: 1200, y: 250 }, box, bounds), { x: 100, y: 100, width: 900, height: 150 })
})
