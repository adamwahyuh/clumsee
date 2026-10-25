import { test } from 'node:test'
import assert from 'node:assert/strict'
import { trimTurns } from './turns.ts'

const chat = (n: number) => Array.from({ length: n }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', text: String(i) }) as const)

test('keeps short chats whole', () => {
  assert.equal(trimTurns(chat(7)).length, 7)
})

test('keeps first exchange and latest turns, still alternating and ending with user', () => {
  const out = trimTurns(chat(11))
  assert.deepEqual(out.map((t) => t.text), ['0', '1', '6', '7', '8', '9', '10'])
  out.forEach((t, i) => assert.equal(t.role, i % 2 ? 'assistant' : 'user'))
})

test('returns a copy, so appending the reply to the chat does not change what is sent', () => {
  const turns = [...chat(1)]
  const sent = trimTurns(turns)
  turns.push({ role: 'assistant', text: '' })
  assert.equal(sent.length, 1)
  assert.equal(sent.at(-1)?.role, 'user')
})
