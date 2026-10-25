import { useEffect, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { PROVIDERS, type HistoryItem, type Preset, type Provider, type Settings, type SettingsView, type UsageSummary, type UsageTotals } from '../../shared'
import '../styles.css'
import '../panel/markdown.css'
import { Answer } from '../panel/Answer'

type Save = (patch: Partial<Settings>) => Promise<string | null>
type FieldProps = { view: SettingsView; save: Save }

const input = 'w-full rounded border border-neutral-300 bg-white px-2 py-1.5 outline-none focus:ring-2 focus:ring-(--accent) dark:border-neutral-700 dark:bg-neutral-800'
const button = 'rounded bg-(--accent) px-3 py-1.5 font-medium text-white hover:brightness-110 disabled:opacity-50'
const secondary = 'rounded bg-neutral-200 px-3 py-1.5 hover:bg-neutral-300 dark:bg-neutral-700 dark:hover:bg-neutral-600'

function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-1.5">
      <h2 className="font-semibold">{label}</h2>
      {children}
      {hint && <p className="text-xs text-neutral-500">{hint}</p>}
    </section>
  )
}

const choice = 'rounded border px-4 py-2'
const choiceOn = 'border-(--accent) bg-(--accent)/10'
const choiceOff = 'border-neutral-300 dark:border-neutral-700'

function ProviderField({ view, save }: FieldProps) {
  return (
    <Field label="Provider AI" hint={!view.aiEnabled && 'Tanpa AI: capture hanya untuk scan QR/barcode, salin teks, dan cari di Google. Tidak perlu API key.'}>
      <div role="radiogroup" className="flex flex-wrap gap-2">
        {(Object.keys(PROVIDERS) as Provider[]).map((p) => (
          <button
            key={p}
            role="radio"
            aria-checked={view.aiEnabled && view.provider === p}
            onClick={() => save({ provider: p, aiEnabled: true })}
            className={`${choice} ${view.aiEnabled && view.provider === p ? choiceOn : choiceOff}`}
          >
            {PROVIDERS[p].label}
          </button>
        ))}
        <button role="radio" aria-checked={!view.aiEnabled} onClick={() => save({ aiEnabled: false })} className={`${choice} ${!view.aiEnabled ? choiceOn : choiceOff}`}>
          Tanpa AI
        </button>
      </div>
    </Field>
  )
}

function AccentField({ view, save }: FieldProps) {
  const p = view.provider
  return (
    <Field label="Warna aksen" hint={`Dipakai untuk glow capture, panel jawaban, dan dashboard saat memakai ${view.aiEnabled ? PROVIDERS[p].label : 'mode Tanpa AI'}.`}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label="Warna aksen"
          className="h-9 w-14 cursor-pointer rounded border border-neutral-300 bg-transparent dark:border-neutral-700"
          value={view.accents[p]}
          onChange={(e) => save({ accents: { ...view.accents, [p]: e.target.value } })}
        />
        <button className={secondary} disabled={view.accents[p] === PROVIDERS[p].color} onClick={() => save({ accents: { ...view.accents, [p]: PROVIDERS[p].color } })}>
          Reset default
        </button>
      </div>
    </Field>
  )
}

function KeyField({ view, onTested }: { view: SettingsView; onTested: (models: string[]) => void }) {
  const [value, setValue] = useState('')
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null)
  const [testing, setTesting] = useState(false)
  const current = view.keys[view.provider]

  useEffect(() => { setValue(''); setStatus(null) }, [view.provider])

  const test = async () => {
    setTesting(true)
    const r = await window.api.testKey(view.provider, value)
    setTesting(false)
    if (r.ok) {
      setValue('')
      setStatus({ ok: true, text: 'Terhubung ✓' })
      onTested(r.models)
    } else setStatus({ ok: false, text: r.error })
  }

  return (
    <Field
      label={`API key ${PROVIDERS[view.provider].label}`}
      hint={<a className="text-(--accent) underline" href={PROVIDERS[view.provider].keyUrl} target="_blank" rel="noreferrer">Ambil API key</a>}
    >
      <div className="flex gap-2">
        <input
          type="password"
          aria-label="API key"
          className={input}
          placeholder={current ? `Tersimpan: ${current}` : 'Paste API key'}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button className={button} disabled={testing || (!value && !current)} onClick={test}>
          {testing ? 'Menguji…' : 'Test koneksi'}
        </button>
      </div>
      {status && <p role="status" className={status.ok ? 'text-green-600' : 'text-red-600'}>{status.text}</p>}
      {view.insecureKeys && (
        <p className="text-amber-600">Keyring sistem tidak ditemukan: key disimpan tanpa enkripsi. Pasang libsecret atau KWallet.</p>
      )}
    </Field>
  )
}

function ModelField({ view, save, models, smart = false }: FieldProps & { models: string[]; smart?: boolean }) {
  const p = view.provider
  const field = smart ? 'smartModels' : 'models'
  return (
    <Field
      label={smart ? 'Model mode pintar' : 'Model default'}
      hint={smart
        ? `Dipakai saat "Mode pintar" dicentang, misal ${PROVIDERS[p].smartModel}.`
        : `Model murah disarankan, misal ${PROVIDERS[p].defaultModel}. Daftar muncul setelah Test koneksi.`}
    >
      <input
        key={p}
        aria-label={smart ? 'Model mode pintar' : 'Model default'}
        list="models"
        className={input}
        defaultValue={view[field][p]}
        onBlur={(e) => e.target.value.trim() && save({ [field]: { ...view[field], [p]: e.target.value } })}
      />
      {!smart && <datalist id="models">{models.map((m) => <option key={m} value={m} />)}</datalist>}
    </Field>
  )
}

function toAccelerator(e: KeyboardEvent, isMac: boolean): string | null {
  const mods = [
    e.metaKey && (isMac ? 'Command' : 'Super'),
    e.ctrlKey && 'Control',
    e.altKey && 'Alt',
    e.shiftKey && 'Shift'
  ].filter(Boolean)
  const key = /^Key[A-Z]$/.test(e.code) ? e.code.slice(3)
    : /^Digit\d$/.test(e.code) ? e.code.slice(5)
    : /^F\d{1,2}$/.test(e.code) || e.code === 'Space' ? e.code
    : null
  if (!key || (!mods.length && !key.startsWith('F'))) return null
  return [...mods, key].join('+')
}

function HotkeyField({ view, save }: FieldProps) {
  const [recording, setRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onKeyDown = async (e: KeyboardEvent) => {
    if (!recording) return
    e.preventDefault()
    if (e.key === 'Escape') return setRecording(false)
    const accel = toAccelerator(e, view.platform === 'darwin')
    if (!accel) return
    setRecording(false)
    setError(await save({ hotkey: accel }))
  }

  return (
    <Field label="Hotkey capture" hint="Hindari Cmd+Shift+3/4/5 di macOS (screenshot bawaan).">
      <button className={`${secondary} font-mono`} onClick={() => { setError(null); setRecording(true) }} onKeyDown={onKeyDown} onBlur={() => setRecording(false)}>
        {recording ? 'Tekan kombinasi tombol… (Esc batal)' : view.hotkey}
      </button>
      {error && <p role="alert" className="text-red-600">{error}</p>}
    </Field>
  )
}

function LanguageField({ view, save }: FieldProps) {
  return (
    <Field label="Bahasa jawaban">
      <select aria-label="Bahasa jawaban" className={input} value={view.language} onChange={(e) => save({ language: e.target.value as Settings['language'] })}>
        <option value="id">Indonesia</option>
        <option value="en">Inggris</option>
      </select>
    </Field>
  )
}

function SystemPromptField({ view, save }: FieldProps) {
  return (
    <Field label="System prompt (opsional)" hint="Instruksi tambahan untuk setiap pertanyaan.">
      <textarea aria-label="System prompt" rows={3} className={input} defaultValue={view.systemPrompt} onBlur={(e) => save({ systemPrompt: e.target.value })} />
    </Field>
  )
}

function PermissionStep() {
  const [status, setStatus] = useState('')
  useEffect(() => {
    const check = () => window.api.permissionStatus().then(setStatus)
    check()
    window.addEventListener('focus', check)
    return () => window.removeEventListener('focus', check)
  }, [])
  return (
    <Field label="Izin Screen Recording (macOS)">
      <p>{status === 'granted' ? 'Izin sudah diberikan ✓' : 'Aktifkan Clumsee di System Settings → Privacy & Security → Screen Recording, lalu restart app.'}</p>
      {status !== 'granted' && (
        <div className="flex gap-2">
          <button className={button} onClick={() => window.api.requestPermission()}>Buka System Settings</button>
          <button className={secondary} onClick={() => window.api.relaunch()}>Restart app</button>
        </div>
      )}
    </Field>
  )
}

function Onboarding({ view, save }: FieldProps) {
  const [step, setStep] = useState(0)
  const [models, setModels] = useState<string[]>([])
  const isMac = view.platform === 'darwin'

  const steps: { body: ReactNode; canNext?: boolean }[] = [
    {
      body: (
        <Field label="Selamat datang di Clumsee">
          <p>Pilih area layar dengan hotkey, tanya, dan dapat jawaban AI di panel kanan.</p>
          <p>Capture hanya aktif selama app berjalan. Gambar hanya dikirim setelah kamu menekan Send.</p>
        </Field>
      )
    },
    { body: <ProviderField view={view} save={save} /> },
    ...(view.aiEnabled ? [
      { body: <KeyField view={view} onTested={(m) => { setModels(m); save({}) }} />, canNext: !!view.keys[view.provider] },
      {
        body: (
          <div className="space-y-6">
            <ModelField view={view} save={save} models={models} />
            <ModelField view={view} save={save} models={models} smart />
          </div>
        )
      }
    ] : []),
    { body: <HotkeyField view={view} save={save} /> },
    ...(isMac ? [{ body: <PermissionStep /> }] : []),
    {
      body: (
        <Field label="Selesai">
          <p>Clumsee berjalan di tray/menu bar. Tekan <kbd className="font-mono">{view.hotkey}</kbd> untuk capture.</p>
        </Field>
      )
    }
  ]
  const last = step === steps.length - 1

  return (
    <div className="space-y-6">
      <p className="text-xs text-neutral-500">Langkah {step + 1} dari {steps.length}</p>
      {steps[step].body}
      <div className="flex justify-between">
        <button className={secondary} disabled={step === 0} onClick={() => setStep(step - 1)}>Kembali</button>
        <button
          className={button}
          disabled={steps[step].canNext === false}
          onClick={() => (last ? save({ onboarded: true }) : setStep(step + 1))}
        >
          {last ? 'Mulai pakai' : 'Lanjut'}
        </button>
      </div>
    </div>
  )
}

function SettingsPage({ view, save }: FieldProps) {
  const [models, setModels] = useState<string[]>([])
  useEffect(() => setModels([]), [view.provider])
  return (
    <div className="space-y-6">
      <ProviderField view={view} save={save} />
      <AccentField view={view} save={save} />
      {view.aiEnabled && (
        <>
          <KeyField view={view} onTested={(m) => { setModels(m); save({}) }} />
          <ModelField view={view} save={save} models={models} />
          <ModelField view={view} save={save} models={models} smart />
        </>
      )}
      <HotkeyField view={view} save={save} />
      {view.aiEnabled && (
        <>
          <LanguageField view={view} save={save} />
          <SystemPromptField view={view} save={save} />
          <PresetsField view={view} save={save} />
          <NumberField view={view} save={save} field="maxTokens" label="Max tokens jawaban" hint="Batas panjang jawaban. Default 800." />
        </>
      )}
      <Field label="Privasi riwayat">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={view.saveImages} onChange={(e) => save({ saveImages: e.target.checked })} />
          Simpan thumbnail gambar di riwayat
        </label>
      </Field>
    </div>
  )
}

function NumberField({ view, save, field, label, hint, step = 1 }: FieldProps & {
  field: 'maxTokens' | 'dailyTokenLimit' | 'dailyUsdLimit'
  label: string
  hint?: string
  step?: number
}) {
  return (
    <Field label={label} hint={hint}>
      <input
        type="number"
        min={0}
        step={step}
        aria-label={label}
        className={`${input} max-w-48`}
        defaultValue={view[field]}
        onBlur={(e) => e.target.value !== '' && save({ [field]: Number(e.target.value) })}
      />
    </Field>
  )
}

function PresetsField({ view, save }: FieldProps) {
  const [presets, setPresets] = useState<Preset[]>(view.presets)
  const edit = (i: number, patch: Partial<Preset>) => setPresets(presets.map((p, j) => (j === i ? { ...p, ...patch } : p)))
  const commit = (next = presets) => save({ presets: next.filter((p) => p.label.trim() && p.prompt.trim()) })

  return (
    <Field label="Preset prompt" hint="Muncul sebagai chip di toolbar capture. Preset dengan label atau prompt kosong tidak disimpan.">
      {presets.map((p, i) => (
        <div key={i} className="flex gap-2">
          <input aria-label="Label preset" className={`${input} max-w-32`} value={p.label} onChange={(e) => edit(i, { label: e.target.value })} onBlur={() => commit()} />
          <input aria-label="Prompt preset" className={input} value={p.prompt} onChange={(e) => edit(i, { prompt: e.target.value })} onBlur={() => commit()} />
          <button
            className={secondary}
            aria-label={`Hapus preset ${p.label}`}
            onClick={() => {
              const next = presets.filter((_, j) => j !== i)
              setPresets(next)
              commit(next)
            }}
          >
            ✕
          </button>
        </div>
      ))}
      {presets.length < 12 && <button className={secondary} onClick={() => setPresets([...presets, { label: '', prompt: '' }])}>+ Tambah preset</button>}
    </Field>
  )
}

function HistoryTab() {
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<HistoryItem[]>([])
  const [open, setOpen] = useState<number | null>(null)

  const refresh = () => window.api.listHistory(query).then(setItems)
  useEffect(() => {
    const t = setTimeout(refresh, 200)
    window.addEventListener('focus', refresh)
    return () => {
      clearTimeout(t)
      window.removeEventListener('focus', refresh)
    }
  }, [query])

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input type="search" aria-label="Cari riwayat" placeholder="Cari prompt atau jawaban…" className={input} value={query} onChange={(e) => setQuery(e.target.value)} />
        <button
          className={secondary}
          disabled={!items.length}
          onClick={async () => {
            if (!confirm('Hapus semua riwayat? Tidak bisa dibatalkan.')) return
            await window.api.clearHistory()
            refresh()
          }}
        >
          Hapus semua
        </button>
      </div>
      {!items.length && <p className="text-neutral-500">{query ? 'Tidak ada hasil.' : 'Belum ada riwayat.'}</p>}
      <ul className="space-y-2">
        {items.map((h) => (
          <li key={h.id} className="rounded border border-neutral-200 p-2 dark:border-neutral-800">
            <div className="flex items-start gap-3">
              {h.thumb && <img src={h.thumb} alt="" className="h-14 w-20 shrink-0 rounded object-cover" />}
              <button className="min-w-0 flex-1 text-left" aria-expanded={open === h.id} onClick={() => setOpen(open === h.id ? null : h.id)}>
                <p className="truncate font-medium">{h.turns[0]?.text}</p>
                <p className="text-xs text-neutral-500">{new Date(h.createdAt).toLocaleString()} · {h.model} · {Math.ceil(h.turns.length / 2)} pertanyaan</p>
              </button>
              <button
                className={secondary}
                aria-label="Hapus item"
                onClick={async () => {
                  await window.api.deleteHistory(h.id)
                  refresh()
                }}
              >
                ✕
              </button>
            </div>
            {open === h.id && (
              <div className="mt-3 space-y-3 border-t border-neutral-200 pt-3 dark:border-neutral-800">
                {h.turns.map((t, i) =>
                  t.role === 'user'
                    ? <p key={i} className="rounded bg-neutral-100 px-3 py-2 dark:bg-neutral-800">{t.text}</p>
                    : <Answer key={i} text={t.text} />
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Totals({ label, t }: { label: string; t: UsageTotals }) {
  const priced = t.requests > t.unpriced
  return (
    <div className="rounded border border-neutral-200 p-3 dark:border-neutral-800">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="text-lg font-semibold">{t.tokens.toLocaleString()} token</p>
      <p>{priced ? `$${t.cost.toFixed(4)}` : '$ –'} · {t.requests} permintaan</p>
      {t.unpriced > 0 && <p className="text-xs text-neutral-500">{t.unpriced} permintaan tanpa harga (model belum ada di daftar harga)</p>}
    </div>
  )
}

function UsageTab({ view, save }: FieldProps) {
  const [usage, setUsage] = useState<UsageSummary | null>(null)
  useEffect(() => {
    const refresh = () => window.api.getUsage().then(setUsage)
    refresh()
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [])

  return (
    <div className="space-y-6">
      {usage && (
        <div className="grid grid-cols-2 gap-3">
          <Totals label="Hari ini" t={usage.today} />
          <Totals label="Bulan ini" t={usage.month} />
        </div>
      )}
      <p className="text-xs text-neutral-500">Dihitung dari data usage yang dikirim API. Menghapus riwayat tidak menghapus catatan ini.</p>
      <NumberField view={view} save={save} field="dailyTokenLimit" label="Batas token harian" hint="0 = tanpa batas. Send dinonaktifkan kalau tercapai." />
      <NumberField view={view} save={save} field="dailyUsdLimit" label="Batas biaya harian (USD)" step={0.01} hint="0 = tanpa batas. Hanya menghitung model yang ada di daftar harga." />
    </div>
  )
}

const TABS = { history: 'Riwayat', usage: 'Pemakaian', settings: 'Settings' } as const
type Tab = keyof typeof TABS
const toTab = (s: string): Tab => (s in TABS ? (s as Tab) : 'history')

function App() {
  const [view, setView] = useState<SettingsView | null>(null)
  const [tab, setTab] = useState<Tab>(toTab(location.hash.slice(1)))
  useEffect(() => window.api.onNavigate((t) => setTab(toTab(t))), [])

  useEffect(() => { window.api.getSettings().then(setView) }, [])

  const save: Save = async (patch) => {
    const r = await window.api.saveSettings(patch)
    if ('error' in r) return r.error
    setView(r)
    return null
  }

  if (!view) return null
  return (
    <main
      className="min-h-screen bg-white bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--accent)_18%,transparent),transparent_60%)] bg-no-repeat p-6 text-sm text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100"
      style={{ '--accent': view.accents[view.provider] } as CSSProperties}
    >
      <div className="mx-auto max-w-xl">
        {!view.onboarded ? (
          <Onboarding view={view} save={save} />
        ) : (
          <>
            <nav role="tablist" className="mb-6 flex gap-1 border-b border-neutral-200 dark:border-neutral-800">
              {(Object.keys(TABS) as Tab[]).map((t) => (
                <button
                  key={t}
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => setTab(t)}
                  className={`-mb-px border-b-2 px-3 py-2 ${tab === t ? 'border-(--accent) font-medium' : 'border-transparent text-neutral-500'}`}
                >
                  {TABS[t]}
                </button>
              ))}
            </nav>
            {tab === 'history' && <HistoryTab />}
            {tab === 'usage' && <UsageTab view={view} save={save} />}
            {tab === 'settings' && <SettingsPage view={view} save={save} />}
          </>
        )}
      </div>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
