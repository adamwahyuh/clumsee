import { dirname, join } from 'node:path'
import type { NativeImage } from 'electron'
import { createWorker, type Worker } from 'tesseract.js'
import type { OcrLine } from '../shared'

// Bundled LSTM data, so OCR works offline with no download. English also reads Indonesian (same Latin alphabet).
const langPath = join(dirname(require.resolve('@tesseract.js-data/eng')), '4.0.0_best_int')

let worker: Promise<Worker> | null = null

/** Starts the OCR engine ahead of time: loading takes about a second, reading a box is much faster. */
export function warmOcr(): Promise<Worker> {
  worker ??= createWorker('eng', 1, { langPath, cacheMethod: 'none' })
    .catch((err) => { worker = null; throw err })
  return worker
}

/** Text lines in the image, with boxes as fractions of the image (0–1) so the renderer can place them on any scale. */
export async function ocr(image: NativeImage, scaleFactor: number): Promise<OcrLine[]> {
  // Tesseract misreads small 1x screen text; doubling it helps a lot.
  const up = scaleFactor < 2 ? 2 : 1
  const { width, height } = image.getSize()
  const input = up > 1 ? image.resize({ width: width * up, height: height * up, quality: 'best' }) : image
  const { data } = await (await warmOcr()).recognize(input.toPNG(), {}, { blocks: true })
  const W = width * up
  const H = height * up
  return (data.blocks ?? [])
    .flatMap((b) => b.paragraphs.flatMap((p) => p.lines))
    .filter((l) => l.text.trim() && l.confidence > 30)
    .map(({ text, bbox: { x0, y0, x1, y1 } }) => ({ text: text.trim(), x: x0 / W, y: y0 / H, width: (x1 - x0) / W, height: (y1 - y0) / H }))
}
