import type { Turn } from '../../shared'
import type { Usage } from '../pricing'

export type AskInput = {
  key: string
  model: string
  image: string // base64 PNG, attached to the first turn
  turns: Turn[] // alternating, starts and ends with user
  system: string
  maxTokens: number
  onToken: (text: string) => void
}

export interface AIProvider {
  /** Doubles as the key check: it fails on a bad key. */
  listModels(key: string): Promise<string[]>
  ask(input: AskInput): Promise<Usage>
}
