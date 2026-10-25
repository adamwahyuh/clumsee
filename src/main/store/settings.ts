import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { app } from 'electron'
import { DEFAULT_PRESETS, PROVIDERS, type Provider, type Settings, type SettingsView } from '../../shared'
import { decrypt, encrypt, insecureKeys, mask } from './secrets'

type Config = Settings & { keys: Partial<Record<Provider, string>> }

const DEFAULTS: Config = {
  aiEnabled: true,
  provider: 'gemini',
  models: { gemini: PROVIDERS.gemini.defaultModel, anthropic: PROVIDERS.anthropic.defaultModel, openai: PROVIDERS.openai.defaultModel },
  smartModels: { gemini: PROVIDERS.gemini.smartModel, anthropic: PROVIDERS.anthropic.smartModel, openai: PROVIDERS.openai.smartModel },
  accents: { gemini: PROVIDERS.gemini.color, anthropic: PROVIDERS.anthropic.color, openai: PROVIDERS.openai.color },
  hotkey: 'CommandOrControl+Shift+X',
  language: 'id',
  systemPrompt: '',
  presets: DEFAULT_PRESETS,
  maxTokens: 800,
  saveImages: true,
  dailyTokenLimit: 0,
  dailyUsdLimit: 0,
  onboarded: false,
  keys: {}
}

const file = (): string => join(app.getPath('userData'), 'config.json')
let config: Config | null = null

function load(): Config {
  if (config) return config
  try {
    const saved = JSON.parse(readFileSync(file(), 'utf8'))
    config = { ...DEFAULTS, ...saved, models: { ...DEFAULTS.models, ...saved.models }, smartModels: { ...DEFAULTS.smartModels, ...saved.smartModels }, accents: { ...DEFAULTS.accents, ...saved.accents }, keys: { ...saved.keys } }
  } catch {
    config = structuredClone(DEFAULTS)
  }
  return config!
}

function write(next: Config): void {
  config = next
  writeFileSync(file(), JSON.stringify(next, null, 2))
}

export function getSettings(): Settings {
  const { keys: _, ...settings } = load()
  return settings
}

export function saveSettings(patch: Partial<Settings>): void {
  const current = load()
  write({ ...current, ...patch, models: { ...current.models, ...patch.models }, smartModels: { ...current.smartModels, ...patch.smartModels }, accents: { ...current.accents, ...patch.accents } })
}

export const getKey = (provider: Provider): string | null => decrypt(load().keys[provider])

export function setKey(provider: Provider, key: string): void {
  const current = load()
  write({ ...current, keys: { ...current.keys, [provider]: encrypt(key) } })
}

export function settingsView(): SettingsView {
  const keys = Object.fromEntries(
    (Object.keys(PROVIDERS) as Provider[]).map((p) => {
      const key = getKey(p)
      return [p, key && mask(key)]
    })
  ) as SettingsView['keys']
  return { ...getSettings(), keys, insecureKeys: insecureKeys(), platform: process.platform }
}
