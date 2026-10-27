// A recipe as a PDF: photo, ingredients and steps on A4 pages in the app's
// cream look, with the Simmer pot in the header. The pages are drawn on a
// canvas with the phone's own fonts (so Czech and Bulgarian letters print
// without shipping a font) and put into a small PDF as JPEG images. No PDF
// library, so the app stays small; the text in the PDF is a picture and
// can't be selected.

import logoSvg from '../../public/icon.svg?raw'

const W = 1240 // A4 at 150 dpi
const H = 1754
const M = 72 // margin
const FONT = '"Segoe UI", Roboto, "Noto Sans", "Helvetica Neue", Arial, sans-serif'
// The light theme's colours (styles.css)
const BG = '#faf1e3'
const CARD = '#fffaf2'
const SUNKEN = '#f3e7d5'
const BORDER = '#ebdcc5'
const INK = '#1f1e1b'
const MUTED = '#6e6b63'
const HERB = '#2f7a52'

/**
 * A PDF made of one JPEG per page. `pages` are { jpeg: Uint8Array, width, height }
 * (pixels); every page is printed on A4 portrait.
 */
export function jpegPdf(pages) {
  const enc = new TextEncoder()
  const parts = []
  const offsets = []
  let length = 0
  const push = (chunk) => {
    const bytes = typeof chunk === 'string' ? enc.encode(chunk) : chunk
    parts.push(bytes)
    length += bytes.length
  }
  const object = (n, body, stream) => {
    offsets[n] = length
    push(`${n} 0 obj\n${body}\n`)
    if (stream) {
      push('stream\n')
      push(stream)
      push('\nendstream\n')
    }
    push('endobj\n')
  }
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')
  // 1 catalog, 2 page tree, then page, content and image per page
  const kids = pages.map((_, i) => `${3 + i * 3} 0 R`).join(' ')
  object(1, '<< /Type /Catalog /Pages 2 0 R >>')
  object(2, `<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`)
  pages.forEach((p, i) => {
    const [page, content, image] = [3 + i * 3, 4 + i * 3, 5 + i * 3]
    const draw = enc.encode('q 595.28 0 0 841.89 0 0 cm /Im0 Do Q')
    object(page, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 ${image} 0 R >> >> /Contents ${content} 0 R >>`)
    object(content, `<< /Length ${draw.length} >>`, draw)
    object(image, `<< /Type /XObject /Subtype /Image /Width ${p.width} /Height ${p.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>`, p.jpeg)
  })
  const count = 3 + pages.length * 3
  const xref = length
  push(`xref\n0 ${count}\n0000000000 65535 f \n`)
  for (let n = 1; n < count; n++) push(`${String(offsets[n]).padStart(10, '0')} 00000 n \n`)
  push(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`)
  const out = new Uint8Array(length)
  let at = 0
  for (const p of parts) {
    out.set(p, at)
    at += p.length
  }
  return out
}

/** Lines of `text` that fit `width` with the context's current font; long words are broken. */
export function wrap(ctx, text, width) {
  const lines = []
  for (const para of String(text ?? '').split('\n')) {
    let line = ''
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word
      if (ctx.measureText(next).width <= width) {
        line = next
        continue
      }
      if (line) lines.push(line)
      line = word
      while (ctx.measureText(line).width > width && line.length > 1) {
        let cut = line.length - 1
        while (cut > 1 && ctx.measureText(line.slice(0, cut)).width > width) cut--
        lines.push(line.slice(0, cut))
        line = line.slice(cut)
      }
    }
    lines.push(line)
  }
  return lines
}

const loadImage = async (src) => {
  if (!src) return null
  try {
    const img = new Image()
    img.src = src
    await img.decode()
    return img
  } catch {
    return null
  }
}

const toJpeg = (canvas) =>
  new Promise((resolve, reject) =>
    canvas.toBlob(async (blob) => (blob ? resolve(new Uint8Array(await blob.arrayBuffer())) : reject(new Error('Could not draw the PDF page'))), 'image/jpeg', 0.88),
  )

// The accent picked in Settings, in its light-theme shade
const accent = () => {
  try {
    return getComputedStyle(document.documentElement).getPropertyValue('--a-light').trim() || HERB
  } catch {
    return HERB
  }
}

const box = (ctx, x, y, w, h, r) => {
  ctx.beginPath()
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r)
  else ctx.rect(x, y, w, h)
}

// Ingredients in a card on the left, steps on the right
const LEFT_W = 430
const GAP = 40
const RIGHT_X = M + LEFT_W + GAP
const RIGHT_W = W - M - RIGHT_X
const PAD = 26 // inside the ingredients card
const AMOUNT_W = 128
const TEXT = 24
const LH = 33
const BOTTOM = H - M - 30 // footer below

/**
 * The PDF of a recipe as a Blob. `ingredients` ({ qty, unit, name, group })
 * and `steps` (an array of texts) as shown on screen, for the chosen portions;
 * `meta` is the line under the title; `picture` a data URL or null.
 */
export async function recipePdf({ title, meta = '', picture = null, ingredients = [], steps = [], note = '', footer = '' }) {
  const color = accent()
  const svg = (code) => loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(code)}`)
  // The watermark is the pot alone, without the logo's cream square
  const [img, logo, pot] = await Promise.all([loadImage(picture), svg(logoSvg), svg(logoSvg.replace(/<rect width="108"[^>]*\/>/, ''))])
  // Everything is laid out first and drawn per page afterwards, so the
  // ingredients card can be painted under its text once its height is known.
  const pages = [] // { ops: [fn(ctx)], card: { top, bottom } | null }
  const measure = document.createElement('canvas').getContext('2d')
  const font = (ctx, size, weight = 400) => (ctx.font = `${weight} ${size}px ${FONT}`)
  const page = (n) => {
    while (pages.length <= n) pages.push({ ops: [], card: null, top: M + 70 })
    return pages[n]
  }
  const text = (n, str, x, y, size, weight, fill) =>
    page(n).ops.push((ctx) => {
      font(ctx, size, weight)
      ctx.fillStyle = fill
      ctx.fillText(str, x, y)
    })
  const lines = (str, size, weight, width) => {
    font(measure, size, weight)
    return wrap(measure, str, width)
  }

  // Header of the first page: the pot and the name, then the title and the photo
  page(0)
  const LOGO = 58
  const photoW = img ? 360 : 0
  const photoH = Math.round(photoW * 0.75)
  const titleW = W - 2 * M - (img ? photoW + 32 : 0)
  let y = M + LOGO + 26
  const titleLines = lines(title || 'Recipe', 50, 700, titleW)
  titleLines.forEach((line, i) => text(0, line, M, y + i * 60, 50, 700, INK))
  y += titleLines.length * 60 + 6
  if (meta) {
    for (const line of lines(meta, 24, 400, titleW)) {
      text(0, line, M, y, 24, 400, MUTED)
      y += 32
    }
  }
  const headerBottom = Math.max(y, img ? M + LOGO + 26 + photoH : 0) + 30
  page(0).top = headerBottom + 4

  // Ingredients: a column that runs on to the next pages if it must
  const list = ingredients.filter((i) => String(i.name ?? '').trim() || String(i.qty ?? '').trim())
  let leftEnd = { n: 0, y: page(0).top - 30 } // where the ingredients card ends
  if (list.length) {
    let n = 0
    let y = page(0).top + PAD
    const open = () => (page(n).card = { top: page(n).top, bottom: page(n).top })
    const room = (h) => {
      if (y + h <= BOTTOM - PAD) return
      n++
      y = page(n).top + PAD
      open()
    }
    open()
    const x = M + PAD
    const width = LEFT_W - 2 * PAD
    text(n, 'Ingredients', x, y, 30, 700, INK)
    y += 48
    let group = ''
    for (const i of list) {
      if ((i.group ?? '') !== group) {
        group = i.group ?? ''
        if (group) {
          const head = lines(group.toUpperCase(), 19, 700, width)
          room(head.length * 26 + 14 + LH)
          y += 8
          for (const line of head) {
            text(n, line, x, y, 19, 700, color)
            y += 26
          }
          y += 6
        }
      }
      const amount = [i.qty, i.unit].map((s) => String(s ?? '').trim()).filter(Boolean).join(' ')
      const amountLines = amount ? lines(amount, TEXT, 700, AMOUNT_W - 14) : []
      const nameLines = lines(i.name ?? '', TEXT, 400, width - AMOUNT_W)
      const rows = Math.max(amountLines.length, nameLines.length, 1)
      room(rows * LH)
      amountLines.forEach((line, k) => text(n, line, x, y + k * LH, TEXT, 700, INK))
      nameLines.forEach((line, k) => text(n, line, x + AMOUNT_W, y + k * LH, TEXT, 400, INK))
      y += rows * LH + 6
      page(n).card.bottom = y + PAD - 6
    }
    leftEnd = { n, y: page(n).card.bottom }
  }

  // Steps and the note on the right
  if (steps.length || note?.trim()) {
    let n = 0
    let y = page(0).top + PAD
    const room = (h) => {
      if (y + h <= BOTTOM) return
      n++
      y = page(n).top + PAD
    }
    const heading = (label) => {
      room(48 + LH * 2)
      text(n, label, RIGHT_X, y, 30, 700, INK)
      y += 48
    }
    const NUM = 40
    if (steps.length) {
      heading('Steps')
      steps.forEach((step, k) => {
        const stepLines = lines(step, TEXT, 400, RIGHT_W - NUM - 14)
        // A step may run over a page, but starts with at least two lines
        room(Math.min(stepLines.length, 2) * LH)
        const top = y
        const p = n
        page(p).ops.push((ctx) => {
          ctx.fillStyle = color
          ctx.beginPath()
          ctx.arc(RIGHT_X + 17, top + 15, 17, 0, Math.PI * 2)
          ctx.fill()
          font(ctx, 18, 700)
          ctx.fillStyle = '#ffffff'
          const label = String(k + 1)
          ctx.fillText(label, RIGHT_X + 17 - ctx.measureText(label).width / 2, top + 4)
        })
        for (const line of stepLines) {
          room(LH)
          text(n, line, RIGHT_X + NUM + 14, y, TEXT, 400, INK)
          y += LH
        }
        y += 14
      })
    }
    if (note?.trim()) {
      // In a sunken box under the steps, else under the ingredients when the
      // steps filled the page, else as plain text running on
      const noteBox = (p, x, top, width) => {
        const noteLines = lines(note.trim(), TEXT, 400, width - 2 * 22)
        const h = noteLines.length * LH + 36
        if (top + 48 + h > BOTTOM) return false
        text(p, 'Note', x, top, 30, 700, INK)
        top += 48
        page(p).ops.unshift((ctx) => {
          ctx.fillStyle = SUNKEN
          box(ctx, x, top, width, h, 16)
          ctx.fill()
        })
        noteLines.forEach((line, k) => text(p, line, x + 22, top + 18 + k * LH, TEXT, 400, INK))
        return true
      }
      if (!noteBox(n, RIGHT_X, y + 10, RIGHT_W) && !(leftEnd.n === n && noteBox(n, M, leftEnd.y + 30, LEFT_W))) {
        y += 10
        heading('Note')
        for (const line of lines(note.trim(), TEXT, 400, RIGHT_W)) {
          room(LH)
          text(n, line, RIGHT_X, y, TEXT, 400, INK)
          y += LH
        }
      }
    }
  }

  const out = []
  for (const [n, p] of pages.entries()) {
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    ctx.textBaseline = 'top'
    ctx.fillStyle = BG
    ctx.fillRect(0, 0, W, H)

    // The pot and "Simmer"; later pages also repeat the title small
    const size = n === 0 ? LOGO : 40
    if (logo) ctx.drawImage(logo, M, M, size, size)
    font(ctx, n === 0 ? 30 : 24, 700)
    ctx.fillStyle = INK
    const nameX = M + (logo ? size + 14 : 0)
    ctx.fillText('Simmer', nameX, M + (size - (n === 0 ? 30 : 24)) / 2 - 2)
    if (n > 0) {
      const after = nameX + ctx.measureText('Simmer').width
      font(ctx, 22)
      ctx.fillStyle = MUTED
      const rest = W - M - after - 30
      const [line] = wrap(ctx, `·  ${title || 'Recipe'}`, rest)
      ctx.fillText(line, after + 14, M + 9)
    }
    if (n === 0 && img) {
      const x = W - M - photoW
      const y = M + LOGO + 26
      // The middle of the photo at 4:3
      const scale = Math.max(photoW / img.naturalWidth, photoH / img.naturalHeight)
      const sw = photoW / scale
      const sh = photoH / scale
      ctx.save()
      box(ctx, x, y, photoW, photoH, 18)
      ctx.clip()
      ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x, y, photoW, photoH)
      ctx.restore()
    }
    ctx.fillStyle = BORDER
    ctx.fillRect(M, (n === 0 ? headerBottom : M + 52) - 14, W - 2 * M, 2)

    if (p.card) {
      ctx.fillStyle = CARD
      box(ctx, M, p.card.top, LEFT_W, p.card.bottom - p.card.top, 20)
      ctx.fill()
      ctx.strokeStyle = BORDER
      ctx.lineWidth = 2
      ctx.stroke()
    }
    // A big, faint pot in the middle of the page, over the card, under the text
    if (pot) {
      const size = W
      ctx.globalAlpha = 0.16
      ctx.drawImage(pot, (W - size) / 2, (H - size) / 2 + 60, size, size)
      ctx.globalAlpha = 1
    }
    for (const op of p.ops) op(ctx)

    ctx.fillStyle = BORDER
    ctx.fillRect(M, H - M - 12, W - 2 * M, 2)
    font(ctx, 19)
    ctx.fillStyle = MUTED
    const label = pages.length > 1 ? `${n + 1} / ${pages.length}` : ''
    const footW = W - 2 * M - (label ? ctx.measureText(label).width + 30 : 0)
    const [foot = ''] = wrap(ctx, footer, footW)
    ctx.fillText(foot, M, H - M)
    if (label) ctx.fillText(label, W - M - ctx.measureText(label).width, H - M)
    out.push({ jpeg: await toJpeg(canvas), width: W, height: H })
  }
  return new Blob([jpegPdf(out)], { type: 'application/pdf' })
}
