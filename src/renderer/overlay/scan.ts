import jsQR from 'jsqr'
import type { Rect } from '../../shared'

/** Web link inside a scanned code, or null for plain text (wifi, contacts, product numbers…). */
export function toUrl(text: string): string | null {
  const t = text.trim()
  try {
    const u = new URL(/^www\./i.test(t) ? `https://${t}` : t)
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null
  } catch {
    return null
  }
}

// Shape Detection API: built into Chromium on macOS (QR + barcodes), missing on Windows/Linux.
declare const BarcodeDetector: { new (): { detect(src: CanvasImageSource): Promise<{ rawValue: string }[]> } } | undefined

/** QR codes and barcodes inside the selection. `scale` maps CSS pixels to screenshot pixels. */
export async function scanCodes(img: HTMLImageElement, rect: Rect, scale: number): Promise<string[]> {
  const w = Math.round(rect.width * scale)
  const h = Math.round(rect.height * scale)
  const canvas = new OffscreenCanvas(w, h)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, rect.x * scale, rect.y * scale, w, h, 0, 0, w, h)
  const found = new Set<string>()
  if (typeof BarcodeDetector !== 'undefined') {
    for (const c of await new BarcodeDetector().detect(canvas).catch(() => [])) found.add(c.rawValue)
  }
  if (!found.size) {
    const qr = jsQR(ctx.getImageData(0, 0, w, h).data, w, h)
    if (qr?.data) found.add(qr.data)
  }
  return [...found]
}
