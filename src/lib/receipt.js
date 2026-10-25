import { BULGARIAN } from '../data/bulgarian.js'

// Reading a shop receipt (Bulgarian or English) into stock items: each line
// is matched to a catalog ingredient by its Bulgarian search words or its
// English name, and weights or counts on the line become the amount.

const SKIP = /обща|сума|общо|ддс|в брой|карта|ресто|бон|касиер|каса|фискал|еик|булстат|total|subtotal|vat|tax|cash|card|change|thank|благодар/i

// Bulgarian words differ by ending ("мляко", "млека"), so words match on their start
const stem = (w) => w.slice(0, Math.max(3, Math.min(5, w.length - 1)))
const words = (s) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/[^\p{L}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3)

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
  // More specific (longer) terms first, so "кисело мляко" beats "мляко"
  return terms.sort((a, b) => b.stems.length - a.stems.length || b.length - a.length)
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

/** The ingredient a receipt line is about, or null. */
export function matchLine(line, index) {
  const ws = words(line)
  if (!ws.length) return null
  // A line word starts like the term's word ("млека" ~ "мляко" by "мл…" stems), or is a short cut of it ("ПИЛ." for "пилешко")
  const same = (w, word, s) => w.startsWith(s) || (w.length >= 4 && word.startsWith(w) && word.length - w.length <= 3)
  const hit = index.find((t) => t.stems.every((s, k) => ws.some((w) => same(w, t.words[k], s))))
  return hit?.entry ?? null
}

/** [{ line, entry, amount }] for every receipt line that names an ingredient. */
export function readReceipt(text, entries) {
  const index = buildReceiptIndex(entries)
  const found = []
  for (const raw of String(text ?? '').split('\n')) {
    const line = raw.trim()
    if (line.length < 3 || SKIP.test(line) || !/\p{L}{3}/u.test(line)) continue
    const entry = matchLine(line, index)
    found.push({ line, entry, amount: entry ? amountOn(line) : '' })
  }
  return found
}
