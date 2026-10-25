import { desktopCapturer, screen, type Display, type NativeImage } from 'electron'
import { fitLongest } from '../shared'
import { toCropRect, type Rect } from './rect'

export async function captureDisplay(display: Display): Promise<NativeImage> {
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: {
      width: Math.round(display.size.width * display.scaleFactor),
      height: Math.round(display.size.height * display.scaleFactor)
    }
  })
  // Some Linux setups leave display_id empty; sources then follow the display order.
  const index = screen.getAllDisplays().findIndex((d) => d.id === display.id)
  const source = sources.find((s) => s.display_id === String(display.id)) ?? sources[index] ?? sources[0]
  if (!source || source.thumbnail.isEmpty()) throw new Error('Screenshot kosong')
  return source.thumbnail
}

/** The selection cropped and resized to max 1000px on the longest side, or null if the selection is invalid. */
export function cropForAI(image: NativeImage, sel: Rect, display: Display): NativeImage | null {
  const rect = toCropRect(sel, display.bounds, image.getSize())
  if (!rect) return null
  return image.crop(rect).resize({ ...fitLongest(rect), quality: 'best' })
}

export const thumbnail = (image: NativeImage): string =>
  `data:image/jpeg;base64,${image.resize(fitLongest(image.getSize(), 160)).toJPEG(80).toString('base64')}`
