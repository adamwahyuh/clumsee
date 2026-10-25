// Types, constants and pure helpers shared by main, preload and renderer. No electron imports here.
export type Provider = 'gemini' | 'anthropic' | 'openai'
export type Rect = { x: number; y: number; width: number; height: number }
export type Size = { width: number; height: number }
export type Turn = { role: 'user' | 'assistant'; text: string }
export type Preset = { label: string; prompt: string }

export type AnswerView = {
  turns: Turn[]
  status: 'idle' | 'sending' | 'done' | 'error'
  error: string
  model: string
  smartModel: string
  truncated: boolean
  accent: string
}

export type Settings = {
  aiEnabled: boolean // false = scan QR, copy text and Google search only
  provider: Provider
  models: Record<Provider, string>
  smartModels: Record<Provider, string>
  accents: Record<Provider, string> // hex color for the glow and UI accent
  hotkey: string
  language: 'id' | 'en'
  systemPrompt: string
  presets: Preset[]
  maxTokens: number
  saveImages: boolean
  dailyTokenLimit: number // 0 = off
  dailyUsdLimit: number // 0 = off
  onboarded: boolean
}
/** What the renderer sees: settings plus masked keys, never the real ones. */
export type SettingsView = Settings & { keys: Record<Provider, string | null>; insecureKeys: boolean; platform: string }
export type TestResult = { ok: true; models: string[] } | { ok: false; error: string }

export type OverlayInit = { image: string; provider: Provider; model: string; smartModel: string; presets: Preset[]; limit: string | null; accent: string; ai: boolean; language: Settings['language'] }
export type HistoryItem = { id: number; createdAt: number; provider: string; model: string; turns: Turn[]; thumb: string | null }
/** A line of text found by OCR; the box is in fractions (0–1) of the selection. */
export type OcrLine = Rect & { text: string }
export type UsageTotals = { requests: number; tokens: number; cost: number; unpriced: number }
export type UsageSummary = { today: UsageTotals; month: UsageTotals }

export const PROVIDERS: Record<Provider, { label: string; defaultModel: string; smartModel: string; keyUrl: string; color: string }> = {
  gemini: { label: 'Gemini', defaultModel: 'gemini-flash-latest', smartModel: 'gemini-pro-latest', keyUrl: 'https://aistudio.google.com/apikey', color: '#4285f4' },
  anthropic: { label: 'Claude', defaultModel: 'claude-haiku-5-5', smartModel: 'claude-opus-5-5', keyUrl: 'https://platform.claude.com/settings/keys', color: '#d97757' },
  openai: { label: 'OpenAI', defaultModel: 'gpt-5-mini', smartModel: 'gpt-5', keyUrl: 'https://platform.openai.com/api-keys', color: '#10a37f' }
}

export const DEFAULT_PRESETS: Preset[] = [
  { label: 'Jelaskan', prompt: 'Jelaskan isi gambar ini.' },
  { label: 'Terjemahkan', prompt: 'Terjemahkan semua teks di gambar ini.' },
  { label: 'Debug', prompt: 'Cari error di kode atau pesan ini, jelaskan penyebabnya, lalu beri perbaikannya.' },
  { label: 'Ringkas', prompt: 'Ringkas isi gambar ini dalam poin-poin singkat.' }
]

/** Images at or above this estimate get a "large box" warning (the 1000px resize caps Claude at ~1333). */
export const LARGE_IMAGE_TOKENS = 1000

export const isProvider = (p: unknown): p is Provider => typeof p === 'string' && Object.hasOwn(PROVIDERS, p)

export function fitLongest(size: Size, max = 1000): Size {
  const scale = Math.min(1, max / Math.max(size.width, size.height))
  return { width: Math.round(size.width * scale), height: Math.round(size.height * scale) }
}

/** Image input tokens. Exact for Claude; Gemini and OpenAI follow their published tiling rules, so treat as estimates. */
export function estimateImageTokens(provider: Provider, { width, height }: Size): number {
  if (provider === 'anthropic') return Math.ceil((width * height) / 750)
  if (provider === 'gemini') return width <= 384 && height <= 384 ? 258 : Math.ceil(width / 768) * Math.ceil(height / 768) * 258
  // OpenAI high detail: fit in 2048², shortest side to 768, then 512px tiles.
  const s1 = Math.min(1, 2048 / Math.max(width, height))
  const s2 = Math.min(1, 768 / Math.min(width * s1, height * s1))
  return 85 + 170 * Math.ceil((width * s1 * s2) / 512) * Math.ceil((height * s1 * s2) / 512)
}
