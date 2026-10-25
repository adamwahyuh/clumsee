import Anthropic from '@anthropic-ai/sdk'
import type { AIProvider } from './types'

export const anthropic: AIProvider = {
  async listModels(key) {
    const ids: string[] = []
    for await (const m of new Anthropic({ apiKey: key }).models.list()) ids.push(m.id)
    return ids
  },
  async ask({ key, model, image, turns, system, maxTokens, onToken }) {
    const stream = new Anthropic({ apiKey: key }).messages.stream({
      model,
      max_tokens: maxTokens,
      system: system || undefined,
      cache_control: { type: 'ephemeral' }, // follow-ups resend the image; cache the prefix
      messages: turns.map((t, i): Anthropic.MessageParam =>
        i === 0
          ? { role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: 'image/png', data: image } }, { type: 'text', text: t.text }] }
          : { role: t.role, content: t.text }
      )
    })
    for await (const e of stream) if (e.type === 'content_block_delta' && e.delta.type === 'text_delta') onToken(e.delta.text)
    const msg = await stream.finalMessage()
    if (msg.stop_reason === 'refusal') throw new Error('Model menolak menjawab permintaan ini.')
    return {
      input: msg.usage.input_tokens,
      output: msg.usage.output_tokens,
      cacheRead: msg.usage.cache_read_input_tokens ?? 0,
      cacheWrite: msg.usage.cache_creation_input_tokens ?? 0,
      truncated: msg.stop_reason === 'max_tokens'
    }
  }
}
