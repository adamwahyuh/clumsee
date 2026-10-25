import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import {
  app, BrowserWindow, desktopCapturer, dialog, globalShortcut, ipcMain, Notification, screen, shell, systemPreferences,
  type Display, type NativeImage
} from 'electron'
import { isProvider, type AnswerView, type OcrLine, type OverlayInit, type Provider, type Settings, type TestResult, type Turn } from '../shared'
import { captureDisplay, cropForAI, thumbnail } from './capture'
import { ocr, warmOcr } from './ocr'
import { cost } from './pricing'
import { errorMessage, providers } from './providers'
import { addUsage, clearHistory, deleteHistory, insertHistory, listHistory, updateHistory, usageSummary } from './store/db'
import { cleanPatch } from './store/validate'
import { getKey, getSettings, saveSettings, setKey, settingsView } from './store/settings'
import { createTray } from './tray'
import { setLang, t } from '../i18n'
import { toCropRect } from './rect'
import { trimTurns } from './turns'
import appIcon from '../../resources/icon.png?asset'

const PANEL_WIDTH = 420
const SCREEN_SETTINGS_URL = 'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture'
const isMac = process.platform === 'darwin'

type Tab = 'history' | 'usage' | 'settings'
type Conversation = {
  image: string
  thumb: string | null
  provider: Provider
  smart: boolean
  historyId: number | null
  turns: Turn[]
  status: AnswerView['status']
  error: string
  model: string
  truncated: boolean
}

let overlay: BrowserWindow | null = null
let panel: BrowserWindow | null = null
let dashboard: BrowserWindow | null = null
let tray: ReturnType<typeof createTray> | null = null
let shot: { image: NativeImage; display: Display } | null = null
let shotReady: Promise<void> = Promise.resolve()
let conv: Conversation | null = null
let requestId = 0
let paused = false
let quitting = false

// Wayland: let global shortcuts go through the desktop portal (best effort, ignored on X11).
if (process.platform === 'linux') app.commandLine.appendSwitch('enable-features', 'GlobalShortcutsPortal')
// Renamed from Screen AI: copy old settings and history once, since the data folder follows the app name.
const dataDir = app.getPath('userData')
const oldDir = ['Screen AI', 'screen-ai'].map((n) => join(app.getPath('appData'), n)).find((d) => existsSync(join(d, 'config.json')))
if (oldDir && !existsSync(join(dataDir, 'config.json'))) {
  mkdirSync(dataDir, { recursive: true })
  for (const f of ['config.json', 'history.db', 'history.db-wal', 'history.db-shm']) if (existsSync(join(oldDir, f))) cpSync(join(oldDir, f), join(dataDir, f))
}
// Windows only shows notifications for apps with an AppUserModelID (must match appId in electron-builder.yml).
if (process.platform === 'win32') app.setAppUserModelId('com.clumsee.app')

// Windows/Linux: no File/Edit menu bar on our windows (Alt still shows it, so copy/paste shortcuts keep working).
const windowChrome = { autoHideMenuBar: true, icon: appIcon }

const webPreferences = {
  preload: join(__dirname, '../preload/index.js'),
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true
}

function load(win: BrowserWindow, page: 'overlay' | 'dashboard', hash = ''): void {
  // Links (e.g. "get an API key") open in the real browser, never inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })
  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) win.loadURL(`${process.env.ELECTRON_RENDERER_URL}/${page}/index.html#${hash}`)
  else win.loadFile(join(__dirname, `../renderer/${page}/index.html`), { hash })
}

// ---------- hotkey ----------

function registerHotkey(accelerator: string): boolean {
  globalShortcut.unregisterAll()
  if (paused) return true
  try {
    return globalShortcut.register(accelerator, () => void startCapture())
  } catch {
    return false // invalid accelerator string
  }
}

function togglePause(): void {
  paused = !paused
  registerHotkey(getSettings().hotkey)
  tray?.refresh()
}

// ---------- limits ----------

function limitReason(s: Settings): string | null {
  const { today } = usageSummary()
  if (s.dailyTokenLimit && today.tokens >= s.dailyTokenLimit) {
    return t('Batas token harian tercapai ({0} / {1}). Ubah di Settings.', today.tokens.toLocaleString(), s.dailyTokenLimit.toLocaleString())
  }
  if (s.dailyUsdLimit && today.cost >= s.dailyUsdLimit) {
    return t('Batas biaya harian tercapai (${0} / ${1}). Ubah di Settings.', today.cost.toFixed(4), s.dailyUsdLimit)
  }
  return null
}

// ---------- capture ----------

async function askScreenPermission(): Promise<void> {
  const { response } = await dialog.showMessageBox({
    type: 'warning',
    message: t('Izin Screen Recording dibutuhkan'),
    detail: t('Buka System Settings → Privacy & Security → Screen Recording, aktifkan aplikasi ini, lalu restart app.'),
    buttons: [t('Buka System Settings'), t('Nanti')]
  })
  if (response === 0) shell.openExternal(SCREEN_SETTINGS_URL)
}

async function startCapture(): Promise<void> {
  if (overlay) return
  if (isMac && ['denied', 'restricted'].includes(systemPreferences.getMediaAccessStatus('screen'))) return askScreenPermission()

  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
  // Transparent so the same window can later shrink into the answer sidebar without a new window appearing.
  const win = new BrowserWindow({
    ...display.bounds,
    frame: false, transparent: true, resizable: false, movable: false, fullscreenable: false, skipTaskbar: true,
    enableLargerThanScreen: true, hasShadow: false, show: false, webPreferences
  })
  overlay = win
  win.setAlwaysOnTop(true, 'screen-saver')
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  win.setContentProtection(true)
  win.on('closed', () => {
    if (overlay === win) overlay = null
    if (panel === win) panel = null
  })
  // Take the screenshot while the page loads instead of one after the other; overlay:init waits for it.
  shot = null
  shotReady = captureDisplay(display).then((image) => { shot = { image, display } })
  load(win, 'overlay')
  // Show only once both are done, so the overlay can never end up in its own screenshot (Linux has no content protection).
  Promise.all([shotReady, new Promise<void>((r) => win.once('ready-to-show', () => r()))]).then(() => {
    if (win.isDestroyed()) return
    win.setBounds(display.bounds)
    win.show()
    win.focus()
  }, () => {})

  try {
    await shotReady
  } catch (err) {
    win.close()
    if (isMac) return askScreenPermission()
    return dialog.showErrorBox(t('Capture gagal'), String(err))
  }
  panel?.close() // a new capture replaces the old answer
}

// ---------- windows ----------

/** Turns the capture window into the answer sidebar on the right edge: same window, so it feels seamless. */
function toPanel(win: BrowserWindow, display: Display): void {
  const { x, y, width, height } = display.workArea
  overlay = null
  panel = win
  win.setAlwaysOnTop(true, 'floating')
  win.setMovable(true)
  win.setBounds({ x: x + width - PANEL_WIDTH, y, width: PANEL_WIDTH, height })
}

function showDashboard(tab?: Tab): void {
  if (dashboard) {
    if (tab) dashboard.webContents.send('navigate', tab)
    dashboard.show()
    dashboard.focus()
    return
  }
  dashboard = new BrowserWindow({ width: 760, height: 680, ...windowChrome, title: 'Clumsee', webPreferences })
  // Closing hides to tray; only Quit really exits.
  dashboard.on('close', (e) => {
    if (quitting) return
    e.preventDefault()
    dashboard?.hide()
  })
  dashboard.on('closed', () => { dashboard = null })
  load(dashboard, 'dashboard', tab)
}

// ---------- AI ----------

function answerView(): AnswerView {
  const s = getSettings()
  if (!conv) return { turns: [], status: 'idle', error: '', model: '', smartModel: '', truncated: false, accent: s.accents[s.provider] }
  const { turns, status, error, model, truncated } = conv
  return { turns, status, error, model, truncated, smartModel: s.smartModels[conv.provider], accent: s.accents[conv.provider] }
}

const push = (): void => panel?.webContents.send('answer', answerView())

/** Answers the last user turn of the current conversation. */
async function run(c: Conversation): Promise<void> {
  const s = getSettings()
  const key = getKey(c.provider)
  const model = c.smart ? s.smartModels[c.provider] : s.models[c.provider]
  const fail = (error: string): void => { Object.assign(c, { status: 'error', error }); push() }
  Object.assign(c, { model, error: '', truncated: false })

  if (!key) return fail(t('API key belum diisi. Buka Settings dari ikon tray.'))
  const limit = limitReason(s)
  if (limit) return fail(limit)

  const id = ++requestId
  const reply: Turn = { role: 'assistant', text: '' }
  const asked = trimTurns(c.turns)
  c.turns.push(reply)
  c.status = 'sending'
  push()
  const system = [s.systemPrompt.trim(), `Jawab dalam bahasa ${s.language === 'id' ? 'Indonesia' : 'Inggris'}.`].filter(Boolean).join('\n\n')

  try {
    const usage = await providers[c.provider].ask({
      key, model, image: c.image, turns: asked, system, maxTokens: s.maxTokens,
      onToken: (text) => {
        if (id !== requestId) return
        reply.text += text
        push()
      }
    })
    addUsage(c.provider, model, usage.input + usage.cacheRead + usage.cacheWrite, usage.output, cost(model, usage))
    if (id !== requestId) return
    Object.assign(c, { status: 'done', truncated: usage.truncated })
    push()
    if (c.historyId === null) c.historyId = insertHistory(c.provider, model, c.turns, c.thumb)
    else updateHistory(c.historyId, model, c.turns)
  } catch (err) {
    if (id !== requestId) return
    c.turns.pop() // drop the unfinished reply so the chat still ends with the question
    fail(errorMessage(err))
  }
}

// ---------- IPC ----------

ipcMain.handle('overlay:init', async (): Promise<OverlayInit | null> => {
  await shotReady.catch(() => {})
  if (!shot) return null
  const s = getSettings()
  return {
    image: `data:image/jpeg;base64,${shot.image.toJPEG(90).toString('base64')}`,
    provider: s.provider,
    model: s.models[s.provider],
    smartModel: s.smartModels[s.provider],
    presets: s.presets,
    limit: limitReason(s),
    accent: s.accents[s.provider],
    ai: s.aiEnabled,
    language: s.language
  }
})
ipcMain.on('overlay:cancel', () => overlay?.close())
ipcMain.on('overlay:send', (e, rect, prompt, smart) => {
  if (!shot || e.sender !== overlay?.webContents || !getSettings().aiEnabled) return
  const image = cropForAI(shot.image, rect, shot.display)
  if (!image) return
  toPanel(overlay, shot.display)
  const s = getSettings()
  conv = {
    image: image.toPNG().toString('base64'),
    thumb: s.saveImages ? thumbnail(image) : null,
    provider: s.provider,
    smart: smart === true,
    historyId: null,
    turns: [{ role: 'user', text: String(prompt ?? '').trim().slice(0, 2000) || t('Jelaskan isi gambar ini.') }],
    status: 'idle', error: '', model: '', truncated: false
  }
  run(conv)
})

// Local OCR of the selection (no AI, no tokens) for selectable text, "Salin teks" and "Cari di Google".
ipcMain.handle('overlay:ocr', async (e, rect): Promise<{ lines: OcrLine[] } | { error: string }> => {
  if (!shot || e.sender !== overlay?.webContents) return { error: t('Capture sudah ditutup.') }
  const crop = toCropRect(rect, shot.display.bounds, shot.image.getSize())
  if (!crop) return { error: t('Area terlalu kecil.') }
  try {
    return { lines: await ocr(shot.image.crop(crop), shot.display.scaleFactor) }
  } catch (err) {
    return { error: t('Gagal membaca teks: {0}', String(err)) }
  }
})

ipcMain.handle('answer:get', () => answerView())
ipcMain.on('answer:followup', (_e, text) => {
  const question = String(text ?? '').trim().slice(0, 2000)
  if (!conv || conv.status !== 'done' || !question) return
  conv.turns.push({ role: 'user', text: question })
  run(conv)
})
// Retry the last question, optionally with the smart model; also used after an error.
ipcMain.on('answer:retry', (_e, smart) => {
  if (!conv || conv.status === 'sending') return
  if (conv.turns.at(-1)?.role === 'assistant') conv.turns.pop()
  if (smart === true) conv.smart = true
  run(conv)
})

ipcMain.handle('settings:get', () => settingsView())
ipcMain.handle('settings:save', (_e, input) => {
  const patch = cleanPatch(input)
  const old = getSettings().hotkey
  if (patch.hotkey && patch.hotkey !== old && !registerHotkey(patch.hotkey)) {
    registerHotkey(old)
    return { error: t('{0} tidak bisa dipakai (bentrok dengan aplikasi lain atau tidak valid).', patch.hotkey) }
  }
  saveSettings(patch)
  if (patch.language) {
    setLang(patch.language)
    tray?.refresh()
  }
  return settingsView()
})
ipcMain.handle('key:test', async (_e, provider: unknown, rawKey: unknown): Promise<TestResult> => {
  if (!isProvider(provider)) return { ok: false, error: t('Provider tidak dikenal.') }
  const typed = typeof rawKey === 'string' ? rawKey.trim() : ''
  const key = typed || getKey(provider)
  if (!key) return { ok: false, error: t('Masukkan API key dulu.') }
  try {
    const models = await providers[provider].listModels(key)
    if (typed) setKey(provider, typed) // only store a key that works
    return { ok: true, models }
  } catch (err) {
    return { ok: false, error: errorMessage(err) }
  }
})
ipcMain.handle('history:list', (_e, query) => listHistory(String(query ?? '').slice(0, 200)))
ipcMain.handle('history:delete', (_e, id) => Number.isInteger(id) && deleteHistory(id))
ipcMain.handle('history:clear', () => clearHistory())
ipcMain.handle('usage:get', () => usageSummary())
ipcMain.handle('permission:status', () => (isMac ? systemPreferences.getMediaAccessStatus('screen') : 'granted'))
ipcMain.handle('permission:request', async () => {
  // A capture call makes macOS show its permission prompt and list the app in System Settings.
  await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1, height: 1 } }).catch(() => {})
  shell.openExternal(SCREEN_SETTINGS_URL)
})
ipcMain.on('app:relaunch', () => {
  app.relaunch()
  app.exit()
})

// ---------- lifecycle ----------

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => showDashboard())
  app.whenReady().then(() => {
    setLang(getSettings().language)
    tray = createTray(
      {
        capture: () => void startCapture(),
        history: () => showDashboard('history'),
        dashboard: () => showDashboard('settings'),
        togglePause,
        quit: () => app.quit()
      },
      () => paused
    )
    warmOcr().catch(() => {}) // ready before the first capture; errors surface when OCR is used
    const s = getSettings()
    if (!registerHotkey(s.hotkey)) dialog.showErrorBox(t('Hotkey bentrok'), t('{0} sudah dipakai aplikasi lain. Ganti di Settings.', s.hotkey))
    if (!s.onboarded) showDashboard()
    else new Notification({ title: t('Clumsee aktif'), body: t('Tekan {0} untuk capture.', s.hotkey) }).show()
  })
  app.on('activate', () => showDashboard()) // macOS: clicking the Dock icon
  app.on('before-quit', () => { quitting = true })
  // Keep running with no windows open so the hotkey stays active.
  app.on('window-all-closed', () => {})
  app.on('will-quit', () => globalShortcut.unregisterAll())
}
