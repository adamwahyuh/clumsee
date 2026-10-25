import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cleanPatch } from './validate.ts'

test('keeps valid fields', () => {
  assert.deepEqual(cleanPatch({ provider: 'anthropic', language: 'en', onboarded: true, aiEnabled: false, models: { openai: ' gpt-x ' } }), {
    provider: 'anthropic', language: 'en', onboarded: true, aiEnabled: false, models: { openai: 'gpt-x' }
  })
})

test('drops unknown or malformed fields', () => {
  assert.deepEqual(cleanPatch({ provider: 'toString', language: 'fr', hotkey: '  ', models: { evil: 'x', gemini: 3 }, extra: 1 }), {})
  assert.deepEqual(cleanPatch(null), {})
})

test('clamps numbers and filters presets', () => {
  assert.deepEqual(
    cleanPatch({
      maxTokens: 5,
      dailyUsdLimit: -1,
      dailyTokenLimit: 1500.4,
      smartModels: { anthropic: 'claude-opus-5-5' },
      presets: [{ label: ' Ok ', prompt: 'do it' }, { label: '', prompt: 'x' }, 'junk']
    }),
    { maxTokens: 100, dailyTokenLimit: 1500, smartModels: { anthropic: 'claude-opus-5-5' }, presets: [{ label: 'Ok', prompt: 'do it' }] }
  )
})

test('keeps only hex accent colors', () => {
  assert.deepEqual(cleanPatch({ accents: { gemini: '#112233', openai: 'red', anthropic: 'url(x)' } }), { accents: { gemini: '#112233' } })
})
