import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { AnswerView } from '../../shared'
import './markdown.css'
import { Answer } from './Answer'
import { CopyButton } from './CopyButton'

const small = 'rounded bg-white/10 px-2 py-0.5 text-xs hover:bg-white/20'

export function Panel() {
  const [answer, setAnswer] = useState<AnswerView | null>(null)
  const [question, setQuestion] = useState('')
  const scroller = useRef<HTMLDivElement>(null)

  useEffect(() => {
    window.api.getAnswer().then(setAnswer)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && window.close()
    window.addEventListener('keydown', onKey)
    const off = window.api.onAnswer(setAnswer)
    return () => { off(); window.removeEventListener('keydown', onKey) }
  }, [])

  // Follow the stream as it grows.
  useEffect(() => {
    if (answer?.status === 'sending') scroller.current?.scrollTo(0, scroller.current.scrollHeight)
  }, [answer])

  if (!answer) return null
  const { turns, status, error, model, smartModel, truncated } = answer
  const last = turns.at(-1)

  return (
    // The window is transparent; this padded card is the visible panel.
    <main className="h-screen p-3 text-sm text-neutral-100" style={{ '--accent': answer.accent } as CSSProperties}>
      <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-(--accent)/40 bg-neutral-950/90 shadow-[0_0_40px_-8px_var(--accent)] backdrop-blur-xl [animation:mist-in_.25s_ease-out]">
        <div className="mist-glow absolute inset-0 rounded-2xl opacity-60" />
        <header className="flex items-center justify-between px-4 pt-3 pb-1 text-xs text-neutral-400 [-webkit-app-region:drag]">
          <span>Clumsee</span>
          <button aria-label="Tutup panel" title="Tutup (Esc)" onClick={() => window.close()} className="rounded px-1.5 hover:bg-white/10 [-webkit-app-region:no-drag]">✕</button>
        </header>
        <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
          {turns.map((t, i) =>
            t.role === 'user' ? (
              <p key={i} className="rounded-lg border-l-2 border-(--accent) bg-white/5 px-3 py-2 text-neutral-300">{t.text}</p>
            ) : (
              <div key={i} className="space-y-1">
                <Answer text={t.text} />
                {t.text && (status !== 'sending' || i < turns.length - 1) && <CopyButton text={t.text} />}
              </div>
            )
          )}
          {status === 'sending' && !last?.text && (
            <p role="status" className="flex items-center gap-2 text-neutral-400">
              <span className="thinking" aria-hidden><i /><i /><i /></span>
              <span className="shimmer">Menunggu jawaban…</span>
            </p>
          )}
          {truncated && status === 'done' && (
            <p className="text-xs text-amber-400">Jawaban terpotong karena batas max tokens. Naikkan di Settings bila perlu.</p>
          )}
          {status === 'error' && (
            <div role="alert" className="space-y-2 rounded bg-red-950/70 px-3 py-2 text-red-200">
              <p>{error}</p>
              <div className="flex gap-2">
                <button className={small} onClick={() => window.api.retry(false)}>Coba lagi</button>
                {model !== smartModel && <button className={small} onClick={() => window.api.retry(true)}>Coba dengan mode pintar</button>}
              </div>
            </div>
          )}
        </div>

        <footer className="space-y-2 border-t border-white/10 p-3">
          <p className="flex items-center justify-between text-xs text-neutral-500">
            <span>{model}</span>
            {status === 'done' && model !== smartModel && (
              <button className={small} onClick={() => window.api.retry(true)} title={smartModel}>Jawab ulang (mode pintar)</button>
            )}
          </p>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              if (!question.trim()) return
              window.api.followUp(question)
              setQuestion('')
            }}
          >
            <input
              aria-label="Pertanyaan lanjutan"
              className="min-w-0 flex-1 rounded-lg bg-white/5 px-2 py-1.5 outline-none focus:ring-2 focus:ring-(--accent)"
              placeholder="Tanya lanjutan…"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={status !== 'done'}
            />
            <button className="rounded-lg bg-(--accent) px-3 py-1.5 font-medium text-white hover:brightness-110 disabled:opacity-50" disabled={status !== 'done' || !question.trim()}>
              Tanya
            </button>
          </form>
        </footer>
      </div>
    </main>
  )
}
