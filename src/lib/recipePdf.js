// A recipe as a PDF: photo, ingredients and steps on A4 pages. The pages are
// drawn on a canvas with the phone's own fonts (so Czech and Bulgarian
// letters print without shipping a font) and put into a small PDF as JPEG
// images. No PDF library, so the app stays small; the text in the PDF is a
// picture and can't be selected.

const W = 1240 // A4 at 150 dpi
const H = 1754
const M = 100 // margin
const FONT = '"Segoe UI", Roboto, "Noto Sans", "Helvetica Neue", Arial, sans-serif'
const INK = '#1f1e1b'
const MUTED = '#6e6b63'
const LINE = '#e3e0d8'

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
    canvas.toBlob(async (blob) => (blob ? resolve(new Uint8Array(await blob.arrayBuffer())) : reject(new Error('Could not draw the PDF page'))), 'image/jpeg', 0.86),
  )

/**
 * The PDF of a recipe as a Blob. `ingredients` ({ qty, unit, name, group })
 * and `steps` (an array of texts) as shown on screen, for the chosen portions;
 * `meta` is the line under the title; `picture` a data URL or null.
 */
export async function recipePdf({ title, meta = '', picture = null, ingredients = [], steps = [], note = '', footer = '' }) {
  const pages = []
  let canvas
  let ctx
  let y
  const bottom = H - M - 40
  const newPage = () => {
    canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, W, H)
    ctx.textBaseline = 'top'
    pages.push(canvas)
    y = M
  }
  const font = (size, weight = 400) => (ctx.font = `${weight} ${size}px ${FONT}`)
  const room = (h) => {
    if (y + h > bottom) newPage()
  }
  const heading = (text) => {
    room(120)
    y += 28
    font(38, 700)
    ctx.fillStyle = INK
    ctx.fillText(text, M, y)
    y += 54
    ctx.fillStyle = LINE
    ctx.fillRect(M, y, W - 2 * M, 3)
    y += 22
  }

  newPage()
  font(56, 700)
  ctx.fillStyle = INK
  for (const line of wrap(ctx, title || 'Recipe', W - 2 * M)) {
    ctx.fillText(line, M, y)
    y += 68
  }
  if (meta) {
    font(28)
    ctx.fillStyle = MUTED
    for (const line of wrap(ctx, meta, W - 2 * M)) {
      ctx.fillText(line, M, y + 6)
      y += 38
    }
  }
  y += 24

  const img = await loadImage(picture)
  if (img) {
    // The middle of the photo at 16:10, as wide as the text
    const w = W - 2 * M
    const h = Math.round(w / 1.6)
    const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight)
    const sw = w / scale
    const sh = h / scale
    ctx.save()
    ctx.beginPath()
    if (ctx.roundRect) ctx.roundRect(M, y, w, h, 18)
    else ctx.rect(M, y, w, h)
    ctx.clip()
    ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, M, y, w, h)
    ctx.restore()
    y += h + 16
  }

  const list = ingredients.filter((i) => String(i.name ?? '').trim() || String(i.qty ?? '').trim())
  if (list.length) {
    heading('Ingredients')
    const amountW = 230
    let group = ''
    for (const i of list) {
      if ((i.group ?? '') !== group) {
        group = i.group ?? ''
        if (group) {
          room(56)
          y += 12
          font(28, 700)
          ctx.fillStyle = MUTED
          ctx.fillText(group, M, y)
          y += 42
        }
      }
      font(30)
      const lines = wrap(ctx, i.name ?? '', W - 2 * M - amountW)
      room(lines.length * 40 + 8)
      font(30, 700)
      ctx.fillStyle = INK
      const amount = [i.qty, i.unit].map((s) => String(s ?? '').trim()).filter(Boolean).join(' ')
      for (const [n, line] of wrap(ctx, amount, amountW - 20).entries()) ctx.fillText(line, M, y + n * 40)
      font(30)
      lines.forEach((line, n) => ctx.fillText(line, M + amountW, y + n * 40))
      y += Math.max(lines.length, 1) * 40 + 8
    }
  }

  if (steps.length) {
    heading('Steps')
    const numW = 64
    steps.forEach((step, n) => {
      font(30)
      const lines = wrap(ctx, step, W - 2 * M - numW)
      // A step may run over a page, but starts with at least two lines
      room(Math.min(lines.length, 2) * 42)
      font(30, 700)
      ctx.fillStyle = '#2f7a52'
      ctx.fillText(`${n + 1}.`, M, y)
      font(30)
      ctx.fillStyle = INK
      for (const line of lines) {
        room(42)
        ctx.fillText(line, M + numW, y)
        y += 42
      }
      y += 18
    })
  }

  if (note?.trim()) {
    heading('Note')
    font(30)
    ctx.fillStyle = INK
    for (const line of wrap(ctx, note.trim(), W - 2 * M)) {
      room(42)
      ctx.fillText(line, M, y)
      y += 42
    }
  }

  const out = []
  for (const [n, page] of pages.entries()) {
    const c = page.getContext('2d')
    c.textBaseline = 'top'
    c.font = `400 22px ${FONT}`
    c.fillStyle = MUTED
    c.fillText(footer, M, H - M + 10)
    if (pages.length > 1) {
      const label = `${n + 1} / ${pages.length}`
      c.fillText(label, W - M - c.measureText(label).width, H - M + 10)
    }
    out.push({ jpeg: await toJpeg(page), width: W, height: H })
  }
  return new Blob([jpegPdf(out)], { type: 'application/pdf' })
}
