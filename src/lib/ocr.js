import { registerPlugin } from '@capacitor/core'
import { canFetchCrossSite } from './http.js'

// Reading text from photos on the device, free and without a cloud service.
// Recipes use Google ML Kit in the Android app (TextReaderPlugin.java; its
// model comes from Play services), which
// reads Latin script only; Bulgarian receipts and the website use Tesseract,
// which comes with the app with English and Bulgarian (scripts/copy-tesseract.mjs).

const TextReader = registerPlugin('TextReader')

/** A photo as a canvas ready for reading: upright, at most `max` px, grey and with stronger contrast. */
async function prepare(file, max = 2200, enhance = true) {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close?.()
  if (!enhance) return canvas
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const d = img.data
  // Grey, then stretch the darkest 2 % to black and the lightest 2 % to white
  const hist = new Uint32Array(256)
  for (let i = 0; i < d.length; i += 4) {
    const g = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000
    d[i] = g
    hist[g | 0]++
  }
  const total = d.length / 4
  let lo = 0
  let hi = 255
  for (let acc = 0; lo < 255 && (acc += hist[lo]) < total * 0.02; lo++);
  for (let acc = 0; hi > 0 && (acc += hist[hi]) < total * 0.02; hi--);
  const range = Math.max(1, hi - lo)
  for (let i = 0; i < d.length; i += 4) {
    const v = Math.max(0, Math.min(255, ((d[i] - lo) * 255) / range))
    d[i] = d[i + 1] = d[i + 2] = v
  }
  ctx.putImageData(img, 0, 0)
  return canvas
}

// Lines compared loosely: OCR reads the same line a little differently on two photos
const key = (line) => line.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')

function similar(a, b) {
  if (!a || !b) return false
  if (a === b) return true
  const [s, l] = a.length < b.length ? [a, b] : [b, a]
  if (s.length < 6 || s.length / l.length < 0.8) return false
  // Share of characters in the same place, from either end (one misread letter or a dropped one)
  let same = 0
  for (let i = 0; i < s.length; i++) if (s[i] === l[i] || s[s.length - 1 - i] === l[l.length - 1 - i]) same++
  return same / l.length >= 0.85
}

// A phone's status bar at the top of a screenshot ("10:17 ⏰ 63 %")
const STATUS_BAR = /^\s*\d{1,2}[:.]\d{2}\b[^\p{L}]{0,30}$/u

/**
 * Photos' texts as one, without the lines that two photos share. Photos of a
 * long recipe or screenshots while scrolling overlap: the end of one shows
 * again at the top of the next, and is kept once.
 */
export function joinPages(texts) {
  let out = []
  for (const text of texts) {
    let lines = text.split('\n')
    while (lines.length && (!lines[0].trim() || STATUS_BAR.test(lines[0]))) lines.shift()
    if (out.length) {
      // The longest run of lines found both near the end of what we have and near the start of this photo
      const tail = out.slice(-60)
      const head = lines.slice(0, 60)
      let best = null
      for (let i = 0; i < tail.length; i++) {
        for (let j = 0; j < head.length; j++) {
          let n = 0
          let chars = 0
          while (i + n < tail.length && j + n < head.length && (key(tail[i + n]) ? similar(key(tail[i + n]), key(head[j + n])) : !key(head[j + n]))) {
            chars += key(tail[i + n]).length
            n++
          }
          // Two lines, or one long one, so a repeated "Salt" or "Steps:" is not an overlap
          const lines = tail.slice(i, i + n).filter((l) => key(l)).length
          if ((lines >= 2 || chars >= 24) && (!best || chars > best.chars)) best = { i, j, n, chars }
        }
      }
      // The run must reach (nearly) the end of the last photo and start near the top of this one
      if (best && tail.length - (best.i + best.n) <= 4 && best.j <= 6) {
        out = out.slice(0, out.length - tail.length + best.i + best.n)
        lines = lines.slice(best.j + best.n)
      } else out.push('')
    }
    out.push(...lines)
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

/**
 * The text of recipe photos, in order, with overlaps between them removed.
 * ML Kit in the app (Latin script); Tesseract on the website and for
 * Bulgarian (`language` 'bulgarian'), as ML Kit can't read Cyrillic.
 */
export async function readRecipePhotos(files, onProgress, language = 'latin') {
  if (language === 'bulgarian') return joinPages(await readPhotoPages(files, 'bul+eng', onProgress))
  if (!canFetchCrossSite()) return joinPages(await readPhotoPages(files, 'eng', onProgress))
  const texts = []
  for (let n = 0; n < files.length; n++) {
    onProgress?.({ status: 'recognizing text', progress: 0, page: n + 1, pages: files.length })
    const canvas = await prepare(files[n], 2400, false)
    const { text } = await TextReader.read({ image: canvas.toDataURL('image/jpeg', 0.9) })
    texts.push(text.trim())
  }
  return joinPages(texts)
}

/** The text of receipt photos; Tesseract, because ML Kit can't read Cyrillic. */
export const readReceiptPhotos = (files, onProgress) => readPhotos(files, 'bul+eng', onProgress)

/**
 * The text of one or more photos, in order. `langs` are Tesseract language
 * codes such as 'eng+ces' or 'bul+eng'. onProgress gets { status, progress, page, pages }.
 */
export async function readPhotos(files, langs = 'eng', onProgress) {
  return (await readPhotoPages(files, langs, onProgress)).join('\n\n')
}

/** Each photo's text, read by Tesseract. */
async function readPhotoPages(files, langs, onProgress) {
  const { createWorker } = await import('tesseract.js')
  let page = 0
  const base = new URL('tesseract/', document.baseURI).href
  const worker = await createWorker(langs, 1, {
    workerPath: `${base}worker.min.js`,
    corePath: `${base}tesseract-core-simd-lstm.wasm.js`,
    langPath: `${base}lang`,
    workerBlobURL: false,
    cacheMethod: 'none', // the data is in the app already
    logger: (m) => onProgress?.({ status: m.status, progress: m.progress, page: page + 1, pages: files.length }),
  })
  try {
    const texts = []
    for (; page < files.length; page++) {
      const { data } = await worker.recognize(await prepare(files[page]))
      texts.push(data.text.trim())
    }
    return texts
  } finally {
    await worker.terminate()
  }
}

/** A small WebP of a photo for the recipe list. */
export async function photoThumb(file, width = 240) {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = Math.round((width * bitmap.height) / bitmap.width)
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close?.()
    const webp = canvas.toDataURL('image/webp', 0.7)
    return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.7)
  } catch {
    return null
  }
}
