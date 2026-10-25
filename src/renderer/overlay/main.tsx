import { lazy, Suspense, useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import { createRoot } from 'react-dom/client'
import { estimateImageTokens, fitLongest, LARGE_IMAGE_TOKENS, type OcrLine, type OverlayInit, type Rect } from '../../shared'
import { CopyButton } from '../panel/CopyButton'
import { dragRect, type DragMode } from './drag'
import { scanCodes, toUrl } from './scan'
import { setLang, t } from '../../i18n'

// The answer sidebar (markdown, KaTeX, highlight.js) is only needed after Send; keep it out of the capture's startup.
const Panel = lazy(() => import('../panel/Panel').then((m) => ({ default: m.Panel })))
import '../styles.css'

const MIN = 20
const CORNERS = ['nw', 'ne', 'sw', 'se'] as const
type Phase = 'selecting' | 'confirming' | 'answer'

const measure = new OffscreenCanvas(1, 1).getContext('2d')!

/** Invisible OCR text laid over the screenshot, so it can be selected with the mouse and copied like real text. */
function TextLayer({ lines, box }: { lines: OcrLine[]; box: Rect }) {
  return (
    <div
      // Only the lines take the mouse, so dragging empty space still moves the box.
      className="pointer-events-none absolute inset-0 overflow-hidden text-transparent select-text selection:bg-(--accent)/40"
    >
      {lines.map((l, i) => {
        const height = l.height * box.height
        const font = `${height * 0.85}px system-ui, sans-serif`
        measure.font = font
        // Stretch the text to the box Tesseract found, so the highlight lines up with the pixels.
        const fit = (l.width * box.width) / (measure.measureText(l.text).width || 1)
        return (
          <div
            key={i}
            className="pointer-events-auto absolute origin-left cursor-text overflow-hidden whitespace-pre"
            onMouseDown={(e) => e.stopPropagation()} // select text instead of moving the box
            style={{ left: l.x * box.width, top: l.y * box.height, height, lineHeight: `${height}px`, font, transform: `scaleX(${fit})` }}
          >
            {l.text}
            {'\n'}
          </div>
        )
      })}
    </div>
  )
}

function Overlay() {
  const [init, setInit] = useState<OverlayInit | null>(null)
  const [imageWidth, setImageWidth] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)
  const [phase, setPhase] = useState<Phase>('selecting')
  const [prompt, setPrompt] = useState('')
  const [smart, setSmart] = useState(false)
  const [codes, setCodes] = useState<string[]>([])
  const [lines, setLines] = useState<OcrLine[] | null>(null) // null = still reading
  const [ocrMsg, setOcrMsg] = useState('')
  const img = useRef<HTMLImageElement>(null)
  const bar = useRef<HTMLFormElement>(null)
  const drag = useRef<{ mode: DragMode; start: { x: number; y: number }; orig: Rect | null } | null>(null)

  useEffect(() => {
    window.api.initOverlay().then((i) => {
      if (i) setLang(i.language)
      setInit(i)
    })
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') window.api.cancel()
      // Cmd/Ctrl+C on text selected in the capture (the question box handles its own copy).
      const picked = window.getSelection()?.toString().trim()
      if ((e.metaKey || e.ctrlKey) && e.key === 'c' && picked && !(document.activeElement instanceof HTMLInputElement)) {
        e.preventDefault()
        navigator.clipboard.writeText(picked).then(() => setOcrMsg(t('Teks tersalin ✓')))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const scale = imageWidth / window.innerWidth || 1

  // Look for QR codes / barcodes once the box stops changing.
  useEffect(() => {
    setCodes([])
    if (phase !== 'confirming' || !rect || !img.current) return
    let stale = false
    const timer = setTimeout(() => scanCodes(img.current!, rect, scale).then((c) => !stale && setCodes(c)).catch(() => {}), 250)
    return () => { stale = true; clearTimeout(timer) }
  }, [phase, rect, imageWidth])

  // Local OCR once the box stops changing: makes the text selectable and feeds copy / Google search.
  useEffect(() => {
    setLines(null)
    setOcrMsg('')
    window.getSelection()?.removeAllRanges()
    if (phase !== 'confirming' || !rect) return
    let stale = false
    const timer = setTimeout(async () => {
      const res = await window.api.readText(rect)
      if (stale) return
      if ('error' in res) return setOcrMsg(res.error)
      setLines(res.lines)
      if (!res.lines.length) setOcrMsg(t('Tidak ada teks terdeteksi.'))
    }, 250)
    return () => { stale = true; clearTimeout(timer) }
  }, [phase, rect])

  const startDrag = (mode: DragMode) => (e: MouseEvent) => {
    e.stopPropagation()
    drag.current = { mode, start: { x: e.clientX, y: e.clientY }, orig: rect }
    if (mode === 'new') {
      setRect(null)
      setPhase('selecting')
    }
  }
  const onMove = (e: MouseEvent) => {
    const d = drag.current
    if (!d) return
    setRect(dragRect(d.mode, d.start, { x: e.clientX, y: e.clientY }, d.orig, { width: window.innerWidth, height: window.innerHeight }))
  }
  const onUp = () => {
    if (!drag.current) return
    drag.current = null
    if (rect && rect.width >= MIN && rect.height >= MIN) setPhase('confirming')
    else {
      setRect(null)
      setPhase('selecting')
    }
  }
  // The text the user selected in the capture, else everything OCR found.
  const pickedText = () => window.getSelection()?.toString().trim() || (lines ?? []).map((l) => l.text).join('\n')
  const copyText = async () => {
    await navigator.clipboard.writeText(pickedText())
    setOcrMsg(t('Teks tersalin ✓'))
    setTimeout(() => window.api.cancel(), 700)
  }
  const searchText = () => {
    window.open(`https://www.google.com/search?q=${encodeURIComponent(pickedText().slice(0, 500))}`)
    window.api.cancel()
  }

  const send = () => {
    if (phase !== 'confirming' || !rect || init?.limit) return
    window.api.send(rect, prompt, smart)
    setPhase('answer') // main shrinks this same window into the sidebar
  }

  // Estimate on the image the AI will actually get: screen pixels, then the 1000px resize.
  const tokens = rect && init ? estimateImageTokens(init.provider, fitLongest({ width: rect.width * scale, height: rect.height * scale })) : 0

  // Keep the toolbar on screen: below the box, or above it near the bottom edge.
  const toolbarHeight = bar.current?.offsetHeight ?? 140
  const toolbarTop = rect && (rect.y + rect.height + toolbarHeight + 16 < window.innerHeight ? rect.y + rect.height + 12 : Math.max(12, rect.y - toolbarHeight - 12))
  const toolbarLeft = rect && Math.min(Math.max(12, rect.x), window.innerWidth - 572)

  if (phase === 'answer') {
    return (
      <div className="ml-auto h-screen w-[420px]">
        <Suspense>
          <Panel />
        </Suspense>
      </div>
    )
  }

  const chip = 'rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-neutral-200 transition hover:border-(--accent) hover:bg-(--accent)/15'

  return (
    <div
      className="fixed inset-0 cursor-crosshair overflow-hidden select-none"
      style={init ? ({ '--accent': init.accent } as CSSProperties) : undefined}
      onMouseDown={startDrag('new')} onMouseMove={onMove} onMouseUp={onUp}>
      {init && <img ref={img} src={init.image} alt="" draggable={false} onLoad={(e) => setImageWidth(e.currentTarget.naturalWidth)} className="absolute inset-0 h-full w-full" />}
      {rect ? (
        <div
          className={`absolute rounded-md ${phase === 'confirming' ? 'cursor-move' : ''}`}
          style={{
            left: rect.x, top: rect.y, width: rect.width, height: rect.height,
            boxShadow: '0 0 0 100vmax rgb(0 0 0 / 0.55), 0 0 0 1.5px var(--accent), 0 0 28px 2px color-mix(in srgb, var(--accent) 60%, transparent)'
          }}
          onMouseDown={phase === 'confirming' ? startDrag('move') : undefined}
        >
          <span
            className="absolute left-0 rounded-md bg-neutral-900/85 px-2 py-0.5 font-mono text-[11px] text-neutral-200 backdrop-blur"
            style={{ top: rect.y > 28 ? -26 : 6, left: rect.y > 28 ? 0 : 6 }}
          >
            {Math.round(rect.width * scale)} × {Math.round(rect.height * scale)}
          </span>
          {phase === 'confirming' && lines && <TextLayer lines={lines} box={rect} />}
          {phase === 'confirming' &&
            CORNERS.map((c) => (
              // L-shaped corner brackets; the 18px box doubles as the resize hit area.
              <div
                key={c}
                onMouseDown={startDrag(c)}
                className="absolute h-[18px] w-[18px] border-(--accent)"
                style={{
                  [c[0] === 'n' ? 'top' : 'bottom']: -4,
                  [c[1] === 'w' ? 'left' : 'right']: -4,
                  [c[0] === 'n' ? 'borderTopWidth' : 'borderBottomWidth']: 3,
                  [c[1] === 'w' ? 'borderLeftWidth' : 'borderRightWidth']: 3,
                  [`border${c[0] === 'n' ? 'Top' : 'Bottom'}${c[1] === 'w' ? 'Left' : 'Right'}Radius`]: 8,
                  filter: 'drop-shadow(0 0 4px var(--accent))',
                  cursor: c === 'nw' || c === 'se' ? 'nwse-resize' : 'nesw-resize'
                }}
              />
            ))}
        </div>
      ) : (
        <div className="absolute inset-0 bg-black/50" />
      )}
      {init && <div className="mist-glow absolute inset-0" />}
      {init && !rect && (
        <p className="pointer-events-none absolute top-6 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-neutral-900/80 px-4 py-1.5 text-xs text-neutral-300 shadow-lg backdrop-blur [animation:mist-in_.3s_ease-out]">
          {t('Seret untuk memilih area ·')} <kbd className="font-mono">Esc</kbd> {t('untuk batal')}
        </p>
      )}
      {rect && init && phase !== 'selecting' && (
        <form
          ref={bar}
          className="absolute w-[560px] cursor-default space-y-2.5 rounded-2xl border border-white/10 bg-neutral-900/85 p-3 text-sm text-white shadow-[0_8px_40px_-8px_var(--accent)] backdrop-blur-xl [animation:mist-in_.15s_ease-out]"
          style={{ top: toolbarTop!, left: toolbarLeft! }}
          onMouseDown={(e) => e.stopPropagation()}
          onSubmit={(e) => { e.preventDefault(); send() }}
        >
          {init.ai && (
            <div className="flex items-center gap-2 rounded-xl bg-white/5 py-1 pr-1 pl-3 ring-(--accent) focus-within:ring-2">
              <input
                autoFocus
                aria-label={t('Pertanyaan')}
                className="min-w-0 flex-1 bg-transparent py-1.5 outline-none placeholder:text-neutral-500"
                placeholder={t('Tanya sesuatu tentang area ini… (kosong = jelaskan)')}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
              <button
                type="submit"
                aria-label={t('Kirim')}
                title={t('Kirim (Enter)')}
                disabled={phase !== 'confirming' || !!init.limit}
                className="grid h-8 w-8 place-items-center rounded-lg bg-(--accent) text-white shadow-[0_0_12px_-2px_var(--accent)] transition hover:brightness-110 disabled:opacity-40"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden><path d="M10 3.5a.75.75 0 0 1 .53.22l5 5a.75.75 0 1 1-1.06 1.06l-3.72-3.72v9.19a.75.75 0 0 1-1.5 0V6.06L5.53 9.78a.75.75 0 0 1-1.06-1.06l5-5A.75.75 0 0 1 10 3.5Z" /></svg>
              </button>
              <button type="button" aria-label={t('Batal')} title={t('Batal (Esc)')} onClick={() => window.api.cancel()} className="grid h-8 w-8 place-items-center rounded-lg text-neutral-400 transition hover:bg-white/10 hover:text-white">
                ✕
              </button>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <button type="button" disabled={!lines?.length} onClick={copyText} className={`${chip} disabled:opacity-50`}>{t('📋 Salin teks')}</button>
            <button type="button" disabled={!lines?.length} onClick={searchText} className={`${chip} disabled:opacity-50`}>{t('🔍 Cari di Google')}</button>
            <span role="status" className="ml-1 text-xs text-neutral-400">
              {ocrMsg || (lines ? t('Blok teks di dalam kotak lalu ⌘/Ctrl+C') : <span className="shimmer">{t('Membaca teks…')}</span>)}
            </span>
            {!init.ai && (
              <button type="button" aria-label={t('Batal')} title={t('Batal (Esc)')} onClick={() => window.api.cancel()} className="ml-auto grid h-7 w-7 place-items-center rounded-lg text-neutral-400 transition hover:bg-white/10 hover:text-white">
                ✕
              </button>
            )}
          </div>
          {codes.length > 0 && (
            <div className="space-y-1.5">
              {codes.map((code) => {
                const url = toUrl(code)
                return url ? (
                  <button
                    key={code}
                    type="button"
                    title={t('Buka di browser: {0}', url)}
                    onClick={() => { window.open(url); window.api.cancel() }}
                    className="flex w-full items-center gap-2 rounded-xl border border-(--accent)/50 bg-(--accent)/15 px-3 py-2 text-left transition hover:bg-(--accent)/25"
                  >
                    <span aria-hidden>🔗</span>
                    <span className="min-w-0 flex-1 truncate">{url.replace(/^https?:\/\//, '')}</span>
                    <span className="text-xs text-neutral-300">{t('Buka ↗')}</span>
                  </button>
                ) : (
                  <div key={code} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                    <span aria-hidden>▦</span>
                    <span className="min-w-0 flex-1 truncate font-mono text-xs">{code}</span>
                    <CopyButton text={code} />
                  </div>
                )
              })}
            </div>
          )}
          {init.ai && (
            <>
              <div className="flex flex-wrap items-center gap-1.5">
                {init.presets.map((p) => (
                  <button key={p.label} type="button" title={p.prompt} onClick={() => setPrompt(p.prompt)} className={chip}>
                    {p.label}
                  </button>
                ))}
                <button
                  type="button"
                  role="switch"
                  aria-checked={smart}
                  title={smart ? init.smartModel : init.model}
                  onClick={() => setSmart(!smart)}
                  className="ml-auto flex items-center gap-2 text-xs text-neutral-300"
                >
                  {t('Mode pintar')}
                  <span className={`relative h-4 w-7 rounded-full transition ${smart ? 'bg-(--accent)' : 'bg-white/15'}`}>
                    <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${smart ? 'left-3.5' : 'left-0.5'}`} />
                  </span>
                </button>
              </div>
              <p className="text-[11px] text-neutral-500">
                {smart ? init.smartModel : init.model} · {t('~{0} token gambar', tokens.toLocaleString())}{init.provider !== 'anthropic' && t(' (perkiraan)')}
                {tokens >= LARGE_IMAGE_TOKENS && <span className="text-amber-400">{t(' · Kotak besar, perkecil untuk hemat token')}</span>}
              </p>
            </>
          )}
          {init.ai && init.limit && <p role="alert" className="text-xs text-red-400">{init.limit}</p>}
        </form>
      )}
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<Overlay />)
