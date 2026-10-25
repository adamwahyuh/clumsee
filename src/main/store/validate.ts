import { isProvider, type Settings } from '../../shared.ts'

const models = (input: unknown): Settings['models'] | undefined => {
  if (!input || typeof input !== 'object') return
  const ok = Object.entries(input).filter(([k, v]) => isProvider(k) && typeof v === 'string' && v.trim())
  if (ok.length) return Object.fromEntries(ok.map(([k, v]) => [k, (v as string).trim().slice(0, 200)])) as Settings['models']
}

const accents = (input: unknown): Settings['accents'] | undefined => {
  if (!input || typeof input !== 'object') return
  const ok = Object.entries(input).filter(([k, v]) => isProvider(k) && typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v))
  if (ok.length) return Object.fromEntries(ok) as Settings['accents']
}

const int = (v: unknown, min: number, max: number): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(Math.max(Math.round(v), min), max) : undefined

/** Keeps only well-formed fields from an untrusted renderer patch. */
export function cleanPatch(input: unknown): Partial<Settings> {
  if (!input || typeof input !== 'object') return {}
  const p = input as Record<string, unknown>
  const out: Partial<Settings> = {}
  if (isProvider(p.provider)) out.provider = p.provider
  if (p.language === 'id' || p.language === 'en') out.language = p.language
  if (typeof p.systemPrompt === 'string') out.systemPrompt = p.systemPrompt.slice(0, 4000)
  if (typeof p.hotkey === 'string' && p.hotkey.trim()) out.hotkey = p.hotkey.trim().slice(0, 100)
  if (typeof p.onboarded === 'boolean') out.onboarded = p.onboarded
  if (typeof p.saveImages === 'boolean') out.saveImages = p.saveImages
  if (typeof p.aiEnabled === 'boolean') out.aiEnabled = p.aiEnabled
  out.models = models(p.models)
  out.smartModels = models(p.smartModels)
  out.accents = accents(p.accents)
  out.maxTokens = int(p.maxTokens, 100, 64000)
  out.dailyTokenLimit = int(p.dailyTokenLimit, 0, 1e9)
  if (typeof p.dailyUsdLimit === 'number' && p.dailyUsdLimit >= 0 && Number.isFinite(p.dailyUsdLimit)) out.dailyUsdLimit = p.dailyUsdLimit
  if (Array.isArray(p.presets)) {
    out.presets = p.presets
      .filter((x) => x && typeof x.label === 'string' && typeof x.prompt === 'string' && x.label.trim() && x.prompt.trim())
      .slice(0, 12)
      .map((x) => ({ label: x.label.trim().slice(0, 30), prompt: x.prompt.trim().slice(0, 1000) }))
  }
  for (const k of Object.keys(out) as (keyof Settings)[]) if (out[k] === undefined) delete out[k]
  return out
}
