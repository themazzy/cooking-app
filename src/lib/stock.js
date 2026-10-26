import { BASE, canonicalUnit, display, parseAmount, sumRow } from './scale.js'

// Amounts kept at home ("1,5 kg", "3", "1 bottle"), what cooking takes out of
// them, staples that run low, and expiry dates.

// The amount at the start of "1,5 kg", "1 000 g", "1 1/2 kg", "2–3 ks"
const AMOUNT = /^(\d{1,3} \d{3}(?![\d/])|\d+\s+\d+\/\d+|\d+\s*[½¼¾⅓⅔⅛]|[\d.,½¼¾⅓⅔⅛/]+(?:\s*[–-]\s*[\d.,]+)?)\s*(.*)$/

/** "1,5 kg" → { value: 1500, base: 'g' }, "3" → { value: 3, base: 'pcs' }, "" or "some" → null */
export function parseStock(text) {
  const m = String(text ?? '')
    .trim()
    .match(AMOUNT)
  if (!m) return null
  const a = parseAmount(m[1])
  if (!a) return null
  return toBase(a.max ?? a.min, m[2])
}

// Spoons and cups come out of liquids kept in ml (750 ml oil − 2 tbsp)
const SPOONS = { tbsp: ['ml', 14.79], tsp: ['ml', 4.93] }

function toBase(n, unitText) {
  const raw = String(unitText ?? '').trim().toLowerCase()
  const unit = canonicalUnit(raw) ?? raw
  const u = unit === '' ? 'pcs' : unit
  const [base, mult] = BASE[u] ?? SPOONS[u] ?? [u, 1]
  return { value: n * mult, base }
}

export function formatStock({ value, base }) {
  if (value <= 0) return base === 'pcs' ? '0' : `0 ${base}`
  const d = display(value, base === 'pcs' ? '' : base)
  return [d.qty, base === 'pcs' ? '' : d.unit].filter(Boolean).join(' ')
}

/** Stock text after taking out a recipe amount, or null when the units don't compare ("1 bottle" minus "2 tbsp"). */
export function takeFrom(stockText, qty, unit) {
  const have = parseStock(stockText)
  const a = parseAmount(qty)
  if (!have || !a) return null
  const use = toBase(a.max ?? a.min, unit)
  if (use.base !== have.base) return null
  return formatStock({ value: Math.max(0, have.value - use.value), base: have.base })
}

/** Stock text after adding a bought amount; without comparable amounts the bought one replaces it. */
export function addTo(stockText, qty, unit) {
  const bought = [qty, unit].filter((x) => String(x ?? '').trim()).join(' ')
  const have = parseStock(stockText)
  const add = parseStock(bought)
  if (!have || !add || have.base !== add.base) return bought || stockText || ''
  return formatStock({ value: have.value + add.value, base: have.base })
}

/** Used up: the amount is a number and it is 0. Unknown amounts count as having some. */
export const isOut = (item) => {
  const s = parseStock(item?.amount)
  return !!s && s.value <= 0
}

/** A staple below its minimum (or used up), and how much to buy to get back to it. */
export function shortfall(item) {
  if (!String(item?.min_amount ?? '').trim()) return null
  const min = parseStock(item.min_amount)
  const have = parseStock(item.amount)
  if (!min) return isOut(item) ? { need: item.min_amount } : null
  if (!have) return null // unknown amount: assume enough
  if (have.base !== min.base) return isOut(item) ? { need: item.min_amount } : null
  if (have.value >= min.value) return null
  return { need: formatStock({ value: min.value - have.value, base: min.base }) }
}

/** Whole days until the date (negative when past), or null. */
export function daysLeft(dateText, today = new Date()) {
  if (!dateText) return null
  const d = new Date(`${dateText}T00:00:00`)
  if (Number.isNaN(d.getTime())) return null
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((d - t) / 86400000)
}

export function expiryLabel(days) {
  if (days == null) return null
  if (days < 0) return days === -1 ? 'expired yesterday' : `expired ${-days} days ago`
  if (days === 0) return 'expires today'
  if (days === 1) return 'expires tomorrow'
  return days < 14 ? `expires in ${days} days` : `expires ${new Date(Date.now() + days * 86400000).toLocaleDateString()}`
}

/** "200 g" (or "2 tbsp + 1 tsp") → { qty, unit } for takeFrom; null without a number. */
const splitAmount = (text) => {
  const m = String(text ?? '').trim().match(AMOUNT)
  return m ? { qty: m[1], unit: m[2] } : null
}

/** Stock text after taking out `usedText` ("200 g"), or null when it can't be worked out. */
export function takeUsed(stockText, usedText) {
  const a = splitAmount(usedText)
  return a ? takeFrom(stockText, a.qty, a.unit) : null
}

/** One amount for several recipe lines of the same ingredient: added up when the units compare. */
function totalUsed(amounts) {
  const texts = amounts.map(([q, u]) => [q, u].filter((x) => String(x ?? '').trim()).join(' ')).filter(Boolean)
  if (texts.length <= 1) return texts[0] ?? ''
  const parts = amounts.map(([q, u]) => {
    const a = parseAmount(q)
    return a ? toBase(a.max ?? a.min, u) : null
  })
  if (parts.some((p) => !p) || parts.some((p) => p.base !== parts[0].base)) return texts.join(' + ')
  return formatStock({ value: parts.reduce((n, p) => n + p.value, 0), base: parts[0].base })
}

/**
 * What cooking could take out of the stock, for the cook to check after
 * cooking: [{ item, used, next, on }] for every ingredient kept at home.
 * `next` is what would be left; `on` is false when the amounts don't
 * compare (no amount, or "1 bottle" against "2 tbsp"), so nothing changes
 * unless the cook says how much is left.
 */
export function stockReview(ingredients, pantry, canonical) {
  const byKey = new Map(pantry.filter((p) => !isOut(p)).map((p) => [canonical(p.name), p]))
  const uses = new Map()
  for (const ing of ingredients) {
    if (!String(ing.name ?? '').trim()) continue
    const item = byKey.get(canonical(ing.name))
    if (!item) continue
    if (!uses.has(item.id)) uses.set(item.id, { item, amounts: [] })
    uses.get(item.id).amounts.push([ing.qty, ing.unit])
  }
  return [...uses.values()].map(({ item, amounts }) => {
    const used = totalUsed(amounts)
    const next = used ? takeUsed(item.amount, used) : null
    return { item, used, next: next ?? item.amount ?? '', on: next != null }
  })
}

/** True when cooking would use the item up and it goes from the pantry (staples stay at 0). */
export const usesUp = (item, next) => (parseStock(next)?.value ?? 1) <= 0 && !String(item.min_amount ?? '').trim()

/**
 * How much of a recipe is at home: { have, total, missing } over its named
 * ingredients. `canonical` maps a name to its catalog name.
 */
export function homeMatch(recipe, pantry, canonical) {
  const atHome = new Set(pantry.filter((p) => !isOut(p)).map((p) => canonical(p.name)))
  const names = (recipe.ingredients ?? []).map(sumRow).filter(Boolean).map((i) => i.name.trim())
  const missing = names.filter((n) => !atHome.has(canonical(n)))
  return { have: names.length - missing.length, total: names.length, missing }
}
