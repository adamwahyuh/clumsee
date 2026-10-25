import type { Rect, Size } from '../shared'

export type { Rect }

export const MIN_SELECTION = 20

// Selection comes from the renderer in window (DIP) pixels; map it to image pixels and clamp.
export function toCropRect(sel: Rect, view: Size, img: Size): Rect | null {
  const { x, y, width, height } = sel ?? {}
  if (![x, y, width, height].every(Number.isFinite)) return null
  if (width < MIN_SELECTION || height < MIN_SELECTION) return null
  const sx = img.width / view.width
  const sy = img.height / view.height
  const cx = Math.min(Math.max(Math.round(x * sx), 0), img.width - 1)
  const cy = Math.min(Math.max(Math.round(y * sy), 0), img.height - 1)
  return {
    x: cx,
    y: cy,
    width: Math.max(1, Math.min(Math.round(width * sx), img.width - cx)),
    height: Math.max(1, Math.min(Math.round(height * sy), img.height - cy))
  }
}
