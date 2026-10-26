import { BULGARIAN } from '../data/bulgarian.js'
import { addTo } from './stock.js'

// Reading a shop receipt (Bulgarian or English) into stock items. Only the
// item lines count: those with a price, above the total. Each is matched to a
// catalog ingredient by its Bulgarian search words or its English name, and
// the count or weight on the line becomes the amount. Text from a photo has
// misreads, mostly Latin letters for Cyrillic ones ("KO3YHaK" for "козунак"),
// so words are also compared in Cyrillic and with one letter wrong.

const SKIP = /обща|сума|общо|ддс|в бро[йи]|(?:^|\s)евро(?:\s|$)|карта|ресто|касиер|фискал|еик|булстат|плик|торбичк|total|subtotal|vat|tax|cash|card|change|thank|благодар|\bbag\b/i
// The end of the items: "ОБЩА СУМА", "ОБЩО", "TOTAL"
const TOTAL = /обща\s*сума|^\W*общо|\btotal\b|сума\s*евро|сума\s*лв/i
// A price: "0.84", "12,99" (OCR sometimes puts a space after the point)
const PRICE = /\d+[.,]\s?\d{2}(?!\d)/
// The count or weight before the unit price: "1 БР x 0.84", "0.534 кг х 12.99", "2 x 1.29"
const QTY = /(\d{1,3}?(?:[.,]\d{1,3})?)\s*([бb56]?[рpP]|[кk][гrg]|kg|бр|br|pcs)?\.?\s*[xх×*]\s*\d+[.,]\s?\d{2}/iu

// Latin letters and digits that a reader mistakes for Cyrillic ones
const CYRILLIC = { a: 'а', b: 'в', c: 'с', e: 'е', h: 'н', k: 'к', m: 'м', n: 'п', o: 'о', p: 'р', r: 'г', t: 'т', u: 'и', w: 'ш', x: 'х', y: 'у', 3: 'з', 6: 'б', 0: 'о' }
const cyrillic = (w) => [...w].map((c) => CYRILLIC[c] ?? c).join('')

// Bulgarian words differ by ending ("мляко", "млека"), so words match on their start
const stem = (w) => w.slice(0, Math.max(3, Math.min(5, w.length - 1)))
const words = (s) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/[^\p{L}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3)

/** "KO3YHaK хасковски" → "козунак хасковски": misread words (digits in them, odd capitals) back in Cyrillic, when the line is Cyrillic. */
export function cleanName(name) {
  if (!/\p{Script=Cyrillic}/u.test(name)) return name
  return name.replace(/[A-Za-z0-9]*[A-Za-z][A-Za-z0-9]*/g, (t) => {
    if (!(/\d/.test(t) || /[a-z][A-Z]/.test(t)) || [...t.toLowerCase()].some((c) => !CYRILLIC[c])) return t
    return cyrillic(t.toLowerCase())
  })
}

/** A line's words, each also as Cyrillic when it has Latin letters or digits in it: [{ w, at }] */
function lineWords(line) {
  const out = []
  const tokens = String(line ?? '')
    .toLowerCase()
    .split(/[^\p{L}\d]+/u)
    .filter((t) => /\p{L}/u.test(t))
  tokens.forEach((t, at) => {
    const plain = t.replace(/\d/g, '')
    if (plain.length >= 3) out.push({ w: plain, at })
    if (/[a-z0-9]/.test(t)) {
      const cy = cyrillic(t).replace(/\d/g, '')
      if (cy.length >= 3 && cy !== plain) out.push({ w: cy, at })
    }
  })
  return out
}

/** Index of catalog entries by the stems of their Bulgarian words and English name. */
export function buildReceiptIndex(entries) {
  const terms = []
  for (const e of entries) {
    const bg = BULGARIAN.get((e.base && !BULGARIAN.has(e.name.toLowerCase()) ? e.base : e.name).toLowerCase())
    for (const phrase of [bg, e.name, ...(e.aliases ?? [])]) {
      const ws = words(phrase)
      if (ws.length) terms.push({ entry: e, words: ws, stems: ws.map(stem), length: ws.join(' ').length })
    }
  }
  return terms
}

/** Whether two words differ by at most `max` letters (added, dropped or changed). */
function near(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return false
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    prev = cur
  }
  return prev[b.length] <= max
}

// A line word is the term's word when it starts the same ("млека" ~ "мляко"), is a short cut of it
// ("ПИЛ." for "пилешко") or is the whole word with a letter misread ("кпоасан")
function same(w, word, s) {
  if (w.length < 4 && w !== word) return false // "bee" is not "beef"
  if (w.startsWith(s)) return true
  if (w.length >= 4 && word.startsWith(w) && word.length - w.length <= 3) return true
  return w.length >= 5 && word.length >= 5 && near(w, word, word.length >= 9 ? 2 : 1)
}

/** The ingredient a receipt line is about, or null. */
export function matchLine(line, index) {
  const ws = lineWords(line)
  if (!ws.length) return null
  let best = null
  for (const t of index) {
    let first = Infinity
    const ok = t.stems.every((s, k) => {
      const hit = ws.find((x) => same(x.w, t.words[k], s))
      if (hit) first = Math.min(first, hit.at)
      return !!hit
    })
    if (!ok) continue
    // More words first ("кисело мляко" beats "мляко"), then what the line starts with (the product,
    // not its flavour: "кроасан … лешник" is croissants), then the longer name
    const better = !best || t.stems.length - best.t.stems.length || best.first - first || t.length - best.t.length
    if (better > 0) best = { t, first }
  }
  return best?.t.entry ?? null
}

const UNIT = {
  г: 'g', гр: 'g', g: 'g', gr: 'g',
  кг: 'kg', kg: 'kg',
  мл: 'ml', ml: 'ml',
  л: 'l', l: 'l', lt: 'l',
  бр: 'pcs', pcs: 'pcs', pc: 'pcs', x: 'pcs',
}

/** "КИСЕЛО МЛЯКО 2% 400Г" → '400 g', "ЯЙЦА М 10БР" → '10', "1.5 КГ" → '1,5 kg' */
export function amountOn(line) {
  const m = line.toLowerCase().match(/(\d+(?:[.,]\d+)?)\s*(кг|гр|мл|бр|kg|gr|ml|lt|pcs|pc|г|g|л|l)(?![\p{L}])/u)
  if (!m) return ''
  const unit = UNIT[m[2]]
  const n = m[1].replace('.', ',')
  return unit === 'pcs' ? n : `${n} ${unit}`
}

/**
 * One item line split up: { name, amount }. "КИСЕЛО МЛЯКО 400Г 2 БР x 1.29= 2.58 Б"
 * → name "КИСЕЛО МЛЯКО 400Г", amount '800 g'; "БАНАНИ 0.712 кг х 2.49" → '0,712 kg'.
 */
export function splitItem(line) {
  const q = line.match(QTY)
  const cut = q ? q.index : (line.match(PRICE)?.index ?? line.length)
  // The name without the reader's stray marks around it
  const name = cleanName(
    line
      .slice(0, cut)
      .replace(/^[^\p{L}\d]+/u, '')
      .replace(/[\s=:—–-]+$/u, '')
      .trim(),
  )
  const own = amountOn(name)
  if (!q) return { name, amount: own }
  const n = Number(q[1].replace(',', '.'))
  const weighed = /^[кk]/i.test(q[2] ?? '')
  if (!n) return { name, amount: own }
  if (weighed) return { name, amount: `${String(n).replace('.', ',')} kg` }
  if (!own) return { name, amount: String(n) }
  // Two packs of 400 g
  const [qty, unit] = own.split(' ')
  const total = String(Math.round(Number(qty.replace(',', '.')) * n * 1000) / 1000).replace('.', ',')
  return { name, amount: unit ? `${total} ${unit}` : total }
}

/** The lines that are items: priced ones above the total, when the receipt has prices at all. */
function itemLines(text) {
  const lines = String(text ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  const end = lines.findIndex((l) => TOTAL.test(l))
  const body = end > 0 ? lines.slice(0, end) : lines
  const priced = body.filter((l) => PRICE.test(l)).length
  if (priced < 2) return body.map((line) => ({ line, ...splitItem(line) }))
  const out = []
  for (let i = 0; i < body.length; i++) {
    const line = body[i]
    if (!PRICE.test(line)) {
      // A name with its count and price on the next line ("2 x 1.29   2.58")
      const next = body[i + 1]
      if (next && PRICE.test(next) && !/\p{L}{3}/u.test(next.replace(QTY, ''))) {
        const { amount } = splitItem(next)
        out.push({ line: `${line} ${next}`, name: splitItem(line).name, amount: amount || amountOn(line) })
        i++
      }
      continue
    }
    out.push({ line, ...splitItem(line) })
  }
  return out
}

/**
 * [{ line, name, entry, amount }] for every item on a receipt; lines with the
 * same ingredient are joined and their amounts added up (two croissants).
 */
export function readReceipt(text, entries) {
  const index = buildReceiptIndex(entries)
  const found = []
  for (const item of itemLines(text)) {
    const { line, name } = item
    if (name.length < 3 || SKIP.test(line) || !/\p{L}{3}/u.test(name)) continue
    const entry = matchLine(name, index)
    const { amount } = item
    const dup = found.find((f) => (entry ? f.entry === entry : !f.entry && f.name.toLowerCase() === name.toLowerCase()))
    if (!dup) found.push({ line, name, entry, amount, count: 1 })
    else {
      dup.count++
      dup.amount = addTo(dup.amount || '1', ...((amount || '1').match(/^(\S+)\s*(.*)$/)?.slice(1) ?? []))
    }
  }
  return found
}
