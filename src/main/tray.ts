import { Menu, nativeImage, Tray } from 'electron'
import appIcon from '../../resources/icon.png?asset'
import { t } from '../i18n'

type Handlers = { capture: () => void; history: () => void; dashboard: () => void; about: () => void; togglePause: () => void; quit: () => void }

// macOS menu bar icon: corner brackets (a selection box) drawn in code. 32px @2x = 16pt.
function icon(): Electron.NativeImage {
  const size = 32
  const buf = Buffer.alloc(size * size * 4)
  const arm = 10, thick = 3, pad = 3
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = Math.min(x - pad, size - 1 - pad - x)
      const dy = Math.min(y - pad, size - 1 - pad - y)
      const onEdge = (dx >= 0 && dx < thick && dy >= 0 && dy < arm) || (dy >= 0 && dy < thick && dx >= 0 && dx < arm)
      if (onEdge) buf.writeUInt32LE(0xff000000, (y * size + x) * 4) // opaque black, BGRA
    }
  }
  const img = nativeImage.createFromBitmap(buf, { width: size, height: size, scaleFactor: 2 })
  img.setTemplateImage(true)
  return img
}

export function createTray(h: Handlers, isPaused: () => boolean): { tray: Tray; refresh: () => void } {
  // macOS wants a monochrome template icon; a black one would vanish on dark Windows/Linux taskbars, so use the app icon there.
  const tray = new Tray(process.platform === 'darwin' ? icon() : nativeImage.createFromPath(appIcon).resize({ width: 32, height: 32 }))
  tray.setToolTip('Clumsee')
  const refresh = (): void =>
    tray.setContextMenu(
      Menu.buildFromTemplate([
        { label: t('Capture sekarang'), click: h.capture },
        { label: t('Pause hotkey'), type: 'checkbox', checked: isPaused(), click: h.togglePause },
        { type: 'separator' },
        { label: t('Riwayat'), click: h.history },
        { label: t('Settings'), click: h.dashboard },
        { label: t('Tentang Clumsee'), click: h.about },
        { type: 'separator' },
        { label: t('Quit'), click: h.quit }
      ])
    )
  refresh()
  // macOS opens the menu on click; Windows/Linux open the dashboard like the plan says.
  if (process.platform !== 'darwin') tray.on('click', () => h.dashboard())
  return { tray, refresh }
}
