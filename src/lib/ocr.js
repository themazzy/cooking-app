import { registerPlugin } from '@capacitor/core'
import { canFetchCrossSite } from './http.js'
import { parseRecipeText } from './ingredients.js'

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

/** The largest bright, grey area of a small copy of the photo (the paper of a receipt) as { x, y, w, h } in 0..1, or null. */
function findPaper(bitmap) {
  const scale = 320 / Math.max(bitmap.width, bitmap.height)
  const w = Math.max(1, Math.round(bitmap.width * scale))
  const h = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(bitmap, 0, 0, w, h)
  const d = ctx.getImageData(0, 0, w, h).data
  // Paper is the bright side of the brightness split (Otsu), without colour (unlike a wooden table)
  const lum = new Uint8Array(w * h)
  const hist = new Uint32Array(256)
  for (let i = 0; i < lum.length; i++) {
    lum[i] = (d[i * 4] * 299 + d[i * 4 + 1] * 587 + d[i * 4 + 2] * 114) / 1000
    hist[lum[i]]++
  }
  let sum = 0
  for (let t = 0; t < 256; t++) sum += t * hist[t]
  let best = 0
  let split = 128
  for (let t = 0, n = 0, s = 0; t < 256; t++) {
    n += hist[t]
    s += t * hist[t]
    if (!n || n === lum.length) continue
    const m1 = s / n
    const m2 = (sum - s) / (lum.length - n)
    const between = n * (lum.length - n) * (m1 - m2) ** 2
    if (between > best) [best, split] = [between, t]
  }
  const paper = new Uint8Array(w * h)
  for (let i = 0; i < paper.length; i++) {
    const r = d[i * 4]
    const g = d[i * 4 + 1]
    const b = d[i * 4 + 2]
    paper[i] = lum[i] > split && Math.max(r, g, b) - Math.min(r, g, b) < 45 ? 1 : 0
  }
  // The largest connected piece of paper; the print inside it are holes and don't matter
  const seen = new Uint8Array(w * h)
  const stack = new Int32Array(w * h)
  let top = null
  for (let start = 0; start < paper.length; start++) {
    if (!paper[start] || seen[start]) continue
    let n = 0
    let size = 0
    let [x0, y0, x1, y1] = [w, h, 0, 0]
    stack[n++] = start
    seen[start] = 1
    while (n) {
      const i = stack[--n]
      const x = i % w
      const y = (i - x) / w
      size++
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) {
        if (j >= 0 && j < paper.length && paper[j] && !seen[j]) {
          seen[j] = 1
          stack[n++] = j
        }
      }
    }
    if (!top || size > top.size) top = { size, x0, y0, x1, y1 }
  }
  // Too small to be the receipt, or the whole picture already (a scan or screenshot)
  if (!top || top.size < paper.length * 0.08) return null
  // What is not paper and reaches the photo's edge is background (the table), to be painted white
  const outside = new Uint8Array(w * h)
  let n = 0
  for (let i = 0; i < w * h; i++) {
    const x = i % w
    const y = (i - x) / w
    if ((x === 0 || y === 0 || x === w - 1 || y === h - 1) && !paper[i]) {
      outside[i] = 1
      stack[n++] = i
    }
  }
  while (n) {
    const i = stack[--n]
    const x = i % w
    for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) {
      if (j >= 0 && j < paper.length && !paper[j] && !outside[j]) {
        outside[j] = 1
        stack[n++] = j
      }
    }
  }
  const pad = 2
  const box = { x: Math.max(0, top.x0 - pad) / w, y: Math.max(0, top.y0 - pad) / h, w: (Math.min(w, top.x1 + pad + 1) - Math.max(0, top.x0 - pad)) / w, h: (Math.min(h, top.y1 + pad + 1) - Math.max(0, top.y0 - pad)) / h }
  return box.w * box.h > 0.9 ? null : { ...box, outside, mw: w, mh: h }
}

/**
 * A receipt photo ready for reading: cut to the paper, sized so the print is
 * large enough (about 1400 px across the paper), and black and white by a
 * local threshold, so shadows and uneven light across the paper don't matter.
 */
export async function prepareReceipt(file) {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const { width: bw, height: bh } = bitmap
  const box = findPaper(bitmap) ?? { x: 0, y: 0, w: 1, h: 1 }
  const sx = box.x * bw
  const sy = box.y * bh
  const sw = box.w * bw
  const sh = box.h * bh
  // Thermal receipts print 32 to 48 characters a line, so this gives letters around 30 px high
  const scale = Math.min(2.5, 1400 / sw, 6000 / sh)
  const canvas = document.createElement('canvas')
  const w = (canvas.width = Math.round(sw * scale))
  const h = (canvas.height = Math.round(sh * scale))
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, w, h)
  bitmap.close?.()
  const img = ctx.getImageData(0, 0, w, h)
  const d = img.data
  // Bradley's threshold: a pixel is ink when it is clearly darker than the average around it
  const sums = new Float64Array((w + 1) * (h + 1))
  for (let y = 0; y < h; y++) {
    let row = 0
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const g = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000
      d[i] = g
      row += g
      sums[(y + 1) * (w + 1) + x + 1] = sums[y * (w + 1) + x + 1] + row
    }
  }
  const r = Math.max(8, Math.round(w / 24))
  for (let y = 0; y < h; y++) {
    const ya = Math.max(0, y - r)
    const yb = Math.min(h, y + r + 1)
    for (let x = 0; x < w; x++) {
      const xa = Math.max(0, x - r)
      const xb = Math.min(w, x + r + 1)
      const area = (yb - ya) * (xb - xa)
      const total = sums[yb * (w + 1) + xb] - sums[ya * (w + 1) + xb] - sums[yb * (w + 1) + xa] + sums[ya * (w + 1) + xa]
      const i = (y * w + x) * 4
      d[i] = d[i + 1] = d[i + 2] = d[i] * area < total * 0.85 ? 0 : 255
    }
  }
  if (box.outside) {
    // The table around a tilted receipt, white (one mask cell around it too, for the paper's edge)
    const { outside, mw, mh } = box
    for (let y = 0; y < h; y++) {
      const my = Math.floor(((sy + y / scale) / bh) * mh)
      for (let x = 0; x < w; x++) {
        const mx = Math.floor(((sx + x / scale) / bw) * mw)
        let out = false
        for (let dy = -1; dy <= 1 && !out; dy++)
          for (let dx = -1; dx <= 1 && !out; dx++) {
            const yy = my + dy
            const xx = mx + dx
            if (yy >= 0 && yy < mh && xx >= 0 && xx < mw && outside[yy * mw + xx]) out = true
          }
        if (out) {
          const i = (y * w + x) * 4
          d[i] = d[i + 1] = d[i + 2] = 255
        }
      }
    }
  }
  ctx.putImageData(img, 0, 0)
  return straighten(canvas, d)
}

/**
 * The receipt turned level when the photo is a little tilted. The print's
 * rows line up best (ink rows and blank rows most different) at the right angle.
 */
function straighten(canvas, d) {
  const { width: w, height: h } = canvas
  const xs = []
  const ys = []
  for (let y = 0; y < h; y += 3) for (let x = 0; x < w; x += 3) if (!d[(y * w + x) * 4]) xs.push(x) && ys.push(y)
  if (xs.length < 200) return canvas
  const rowsAt = (deg) => {
    const t = Math.tan((deg * Math.PI) / 180)
    const rows = new Float64Array(Math.ceil(h / 3) + Math.ceil((w * Math.abs(t)) / 3) + 2)
    const shift = t < 0 ? 0 : (w * t) / 3
    for (let i = 0; i < xs.length; i++) rows[Math.round((ys[i] - xs[i] * t) / 3 + shift)]++
    let sum = 0
    for (const r of rows) sum += r * r
    return sum
  }
  let best = 0
  let score = rowsAt(0)
  for (let deg = -8; deg <= 8; deg += 0.5) {
    const v = rowsAt(deg)
    if (v > score) [best, score] = [deg, v]
  }
  // Finer around the best
  for (let deg = best - 0.4; deg <= best + 0.4; deg += 0.1) {
    const v = rowsAt(deg)
    if (v > score) [best, score] = [deg, v]
  }
  if (Math.abs(best) < 0.3) return canvas
  const a = (-best * Math.PI) / 180
  const out = document.createElement('canvas')
  out.width = Math.ceil(Math.abs(w * Math.cos(a)) + Math.abs(h * Math.sin(a)))
  out.height = Math.ceil(Math.abs(w * Math.sin(a)) + Math.abs(h * Math.cos(a)))
  const ctx = out.getContext('2d')
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, out.width, out.height)
  ctx.translate(out.width / 2, out.height / 2)
  ctx.rotate(a)
  ctx.drawImage(canvas, -w / 2, -h / 2)
  return out
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
 * True when a photo's text reads as a recipe: ingredients with units, or a list and a method.
 * Bulgarian read as Latin letters ("200 r Cnaguna") does not.
 */
export function readsAsRecipe(text) {
  const { ingredients, steps } = parseRecipeText(text)
  return ingredients.filter((i) => i.unit).length >= 2 || (ingredients.length >= 3 && steps.length >= 1)
}

/** The share of letters in Cyrillic, 0 to 1. */
export function cyrillicShare(text) {
  const letters = String(text ?? '').match(/\p{L}/gu) ?? []
  return letters.length ? letters.filter((c) => /\p{Script=Cyrillic}/u.test(c)).length / letters.length : 0
}

/**
 * The text of recipe photos, in order, with overlaps between them removed.
 * Read first in Latin letters (ML Kit in the app, Tesseract on the website); when that does not
 * read as a recipe, read again with Tesseract's Bulgarian and keep it if it is Cyrillic, as ML Kit
 * can't read Cyrillic. So the language is found by itself.
 */
export async function readRecipePhotos(files, onProgress) {
  const latin = joinPages(canFetchCrossSite() ? await readWithMlKit(files, onProgress) : await readPhotoPages(files, 'eng', onProgress))
  if (readsAsRecipe(latin)) return latin
  try {
    const bulgarian = joinPages(await readPhotoPages(files, 'bul+eng', onProgress))
    return cyrillicShare(bulgarian) > 0.5 || !latin.trim() ? bulgarian : latin
  } catch (err) {
    if (latin.trim()) return latin
    throw err
  }
}

/** Each photo's text, read by ML Kit on the phone (Latin letters). */
async function readWithMlKit(files, onProgress) {
  const texts = []
  for (let n = 0; n < files.length; n++) {
    onProgress?.({ status: 'recognizing text', progress: 0, page: n + 1, pages: files.length })
    const canvas = await prepare(files[n], 2400, false)
    const { text } = await TextReader.read({ image: canvas.toDataURL('image/jpeg', 0.9) })
    texts.push(text.trim())
  }
  return texts
}

/** The text of receipt photos; Tesseract, because ML Kit can't read Cyrillic. */
export async function readReceiptPhotos(files, onProgress) {
  // One block of lines in print order (page segmentation 6); spaces kept, as they split name and price
  const pages = await readPhotoPages(files, 'bul+eng', onProgress, { prepare: prepareReceipt, params: { tessedit_pageseg_mode: '6', preserve_interword_spaces: '1' } })
  return pages.join('\n\n')
}

/**
 * The text of one or more photos, in order. `langs` are Tesseract language
 * codes such as 'eng+ces' or 'bul+eng'. onProgress gets { status, progress, page, pages }.
 */
export async function readPhotos(files, langs = 'eng', onProgress) {
  return (await readPhotoPages(files, langs, onProgress)).join('\n\n')
}

// A tiny WebAssembly module that only validates where SIMD works (as in wasm-feature-detect)
const SIMD_TEST = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11])
const hasSimd = () => {
  try {
    return WebAssembly.validate(SIMD_TEST)
  } catch {
    return false
  }
}

// Starting the reader should take seconds; if it hangs, say so instead of sitting at 0 %
const START_LIMIT_MS = 60000

/** Each photo's text, read by Tesseract. */
async function readPhotoPages(files, langs, onProgress, { prepare: ready = prepare, params } = {}) {
  const { createWorker } = await import('tesseract.js')
  let page = 0
  let last = 'starting'
  const base = new URL('tesseract/', document.baseURI).href
  const core = hasSimd() ? 'tesseract-core-simd-lstm.wasm.js' : 'tesseract-core-lstm.wasm.js'
  let timer
  let fail = null
  const starting = createWorker(langs, 1, {
    workerPath: `${base}worker.min.js`,
    corePath: `${base}${core}`,
    langPath: `${base}lang`,
    workerBlobURL: false,
    cacheMethod: 'none', // the data is in the app already
    gzip: false, // stored unpacked, see scripts/copy-tesseract.mjs
    logger: (m) => {
      last = `${m.status} ${Math.round((m.progress ?? 0) * 100)} %`
      onProgress?.({ status: m.status, progress: m.progress, page: page + 1, pages: files.length })
    },
    errorHandler: (e) => {
      last = `error: ${e}`
      fail?.()
    },
  })
  const worker = await Promise.race([
    starting,
    new Promise((_, reject) => {
      // Gives up after a minute, or at once when the reader reports an error
      fail = () => {
        clearTimeout(timer)
        starting.then((w) => w.terminate()).catch(() => {})
        const chrome = navigator.userAgent.match(/Chrome\/(\d+)/)?.[1]
        reject(new Error(`The text reader did not start (stuck at: ${last}; ${core}, WebView ${chrome ?? '?'}). Please send this message to Claude.`))
      }
      timer = setTimeout(fail, START_LIMIT_MS)
    }),
  ]).finally(() => clearTimeout(timer))
  try {
    if (params) await worker.setParameters(params)
    const texts = []
    for (; page < files.length; page++) {
      const { data } = await worker.recognize(await ready(files[page]))
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
