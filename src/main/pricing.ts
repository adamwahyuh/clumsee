// USD per 1M tokens. Update here when prices change; models not listed show cost as "–".
// Gemini is left out: the *-latest aliases move between models, so a fixed price would mislead.
const PRICES: Record<string, { input: number; output: number }> = {
  'claude-haiku-5-5': { input: 0.1, output: 0.5 },
  'claude-sonnet-5-5': { input: 2, output: 10 },
  'claude-opus-5-5': { input: 4, output: 20 },
  'claude-haiku-4-5': { input: 1, output: 5 },
  'claude-sonnet-4-6': { input: 3, output: 15 },
  'gpt-5-mini': { input: 0.25, output: 2 },
  'gpt-5': { input: 1.25, output: 10 }
}

export type Usage = { input: number; output: number; cacheRead: number; cacheWrite: number; truncated: boolean }

/** Cost in USD, or null when the model has no known price. */
export function cost(model: string, u: Usage): number | null {
  const p = PRICES[model]
  if (!p) return null
  // Claude cache reads bill at 0.1x input, cache writes at 1.25x.
  return (u.input * p.input + u.cacheRead * p.input * 0.1 + u.cacheWrite * p.input * 1.25 + u.output * p.output) / 1e6
}
