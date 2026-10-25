import { GoogleGenAI, type GenerateContentResponse } from '@google/genai'
import type { AIProvider } from './types'

export const gemini: AIProvider = {
  async listModels(key) {
    const ids: string[] = []
    for await (const m of await new GoogleGenAI({ apiKey: key }).models.list()) {
      if (m.name && m.supportedActions?.includes('generateContent')) ids.push(m.name.replace(/^models\//, ''))
    }
    return ids
  },
  async ask({ key, model, image, turns, system, maxTokens, onToken }) {
    const stream = await new GoogleGenAI({ apiKey: key }).models.generateContentStream({
      model,
      contents: turns.map((t, i) => ({
        role: t.role === 'assistant' ? 'model' : 'user',
        parts: i === 0 ? [{ inlineData: { mimeType: 'image/png', data: image } }, { text: t.text }] : [{ text: t.text }]
      })),
      config: { systemInstruction: system || undefined, maxOutputTokens: maxTokens }
    })
    let last: GenerateContentResponse | undefined
    for await (const chunk of stream) {
      if (chunk.text) onToken(chunk.text)
      last = chunk
    }
    const u = last?.usageMetadata
    return {
      input: u?.promptTokenCount ?? 0,
      output: (u?.candidatesTokenCount ?? 0) + (u?.thoughtsTokenCount ?? 0),
      cacheRead: 0,
      cacheWrite: 0,
      truncated: last?.candidates?.[0]?.finishReason === 'MAX_TOKENS'
    }
  }
}
