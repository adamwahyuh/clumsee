import { test } from 'node:test'
import assert from 'node:assert/strict'
import { assetSuffix, isNewer } from './update.ts'

test('compares versions numerically, ignoring the v prefix', () => {
  assert.equal(isNewer('v0.10.0', '0.9.9'), true)
  assert.equal(isNewer('v1.0.0', '1.0.0'), false)
  assert.equal(isNewer('v1.0.0', '1.0.1'), false)
  assert.equal(isNewer('v1.1', '1.0.9'), true)
})

test('picks the installer for each platform', () => {
  assert.equal(assetSuffix('darwin', 'arm64'), '_arm64.dmg')
  assert.equal(assetSuffix('win32', 'x64'), '.exe')
  assert.equal(assetSuffix('freebsd', 'x64'), null)
})
