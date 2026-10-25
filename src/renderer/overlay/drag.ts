import type { Rect, Size } from '../../shared'

export type DragMode = 'new' | 'move' | 'nw' | 'ne' | 'sw' | 'se'
type Point = { x: number; y: number }

const span = (a: Point, b: Point): Rect => ({
  x: Math.min(a.x, b.x),
  y: Math.min(a.y, b.y),
  width: Math.abs(b.x - a.x),
  height: Math.abs(b.y - a.y)
})

/** Box after dragging from `start` to `cur`, kept inside the screen. */
export function dragRect(mode: DragMode, start: Point, cur: Point, orig: Rect | null, bounds: Size): Rect {
  const p = { x: Math.min(Math.max(cur.x, 0), bounds.width), y: Math.min(Math.max(cur.y, 0), bounds.height) }
  if (mode === 'new' || !orig) return span(start, p)
  if (mode === 'move') {
    return {
      ...orig,
      x: Math.min(Math.max(orig.x + cur.x - start.x, 0), bounds.width - orig.width),
      y: Math.min(Math.max(orig.y + cur.y - start.y, 0), bounds.height - orig.height)
    }
  }
  // Resizing from a corner: the opposite corner stays put.
  const fixed = {
    x: mode.endsWith('w') ? orig.x + orig.width : orig.x,
    y: mode.startsWith('n') ? orig.y + orig.height : orig.y
  }
  return span(fixed, p)
}
