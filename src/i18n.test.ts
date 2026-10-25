import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setLang, t } from './i18n.ts'

test('translates and fills placeholders', () => {
  setLang('id')
  assert.equal(t('Langkah {0} dari {1}', 2, 5), 'Langkah 2 dari 5')
  setLang('en')
  assert.equal(t('Langkah {0} dari {1}', 2, 5), 'Step 2 of 5')
  assert.equal(t('Batas biaya harian tercapai (${0} / ${1}). Ubah di Settings.', '1.5000', 1), 'Daily cost limit reached ($1.5000 / $1). Change it in Settings.')
})
