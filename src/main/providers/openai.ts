import OpenAI from 'openai'
import type { AIProvider } from './types'

export const openai: AIProvider = {
  async listModels(key) {
    const ids: string[] = []
    for await (const m of new OpenAI({ apiKey: key }).models.list()) if (/^(gpt|o\d|chatgpt)/.test(m.id)) ids.push(m.id)
    return ids.sort()
  },
  async ask({ key, model, image, turns, system, maxTokens, onToken }) {
    const stream = await new OpenAI({ apiKey: key }).chat.completions.create({
      model,
      stream: true,
      stream_options: { include_usage: true },
      max_completion_tokens: maxTokens,
      messages: [
        ...(system ? [{ role: 'system' as const, content: system }] : []),
        ...turns.map((t, i): OpenAI.ChatCompletionMessageParam =>
          i === 0
            ? { role: 'user', content: [{ type: 'image_url', image_url: { url: `data:image/png;base64,${image}` } }, { type: 'text', text: t.text }] }
            : { role: t.role, content: t.text }
        )
      ]
    })
    let usage: OpenAI.CompletionUsage | undefined
    let finish: string | null | undefined
    for await (const chunk of stream) {
      const choice = chunk.choices[0]
      if (choice?.delta?.content) onToken(choice.delta.content)
      if (choice?.finish_reason) finish = choice.finish_reason
      if (chunk.usage) usage = chunk.usage
    }
    return { input: usage?.prompt_tokens ?? 0, output: usage?.completion_tokens ?? 0, cacheRead: 0, cacheWrite: 0, truncated: finish === 'length' }
  }
}
