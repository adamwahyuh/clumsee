import type { Provider } from '../../shared'
import { isKey, t } from '../../i18n'
import type { AIProvider } from './types'
import { anthropic } from './anthropic'
import { gemini } from './gemini'
import { openai } from './openai'

export const providers: Record<Provider, AIProvider> = { gemini, anthropic, openai }

/** Turns SDK errors into a message the panel can show as-is. */
export function errorMessage(err: unknown): string {
  const { status, message = String(err), cause } = (err ?? {}) as { status?: number; message?: string; cause?: unknown }
  // Gemini reports a bad key as 400 instead of 401.
  if (status === 401 || status === 403 || /API key not valid/i.test(message)) return t('API key salah atau tidak punya akses.')
  if (status === 402) return t('Saldo/kredit API habis.')
  if (status === 404) return t('Model tidak ditemukan. Cek nama model di Settings.')
  if (status === 429) return t('Rate limit atau kuota habis. Coba lagi sebentar lagi.')
  if (!status && (cause || /fetch failed|ENOTFOUND|ECONNREFUSED|network|connection/i.test(message))) {
    return t('Tidak bisa terhubung. Cek koneksi internet.')
  }
  return isKey(message) ? t(message) : message // our own errors, e.g. a refusal
}
