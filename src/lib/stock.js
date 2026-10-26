import { BASE, canonicalUnit, display, parseAmount } from './scale.js'

// Amounts kept at home ("1,5 kg", "3", "1 bottle"), what cooking takes out of
// them, staples that run low, and expiry dates.

/** "1,5 kg" → { value: 1500, base: 'g' }, "3" → { value: 3, base: 'pcs' }, "" or "some" → null */
export function parseStock(text) {
  const m = String(text ?? '')
    .trim()
    .match(/^([\d.,½¼¾⅓⅔/]+(?:\s*[–-]\s*[\d.,]+)?)\s*(.*)$/)
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

/**
 * What cooking these ingredients takes out of the stock:
 * [{ item, used: '200 g', next: '300 g' }] for every stock item with an amount that compares.
 */
export function planCooking(ingredients, pantry, canonical) {
  const byKey = new Map(pantry.map((p) => [canonical(p.name), p]))
  const plan = new Map()
  for (const ing of ingredients) {
    if (!String(ing.name ?? '').trim()) continue
    const item = byKey.get(canonical(ing.name))
    if (!item) continue
    const current = plan.get(item.id)?.next ?? item.amount
    const next = takeFrom(current, ing.qty, ing.unit)
    if (next == null) continue
    const used = [ing.qty, ing.unit].filter((x) => String(x ?? '').trim()).join(' ')
    const prev = plan.get(item.id)
    plan.set(item.id, { item, used: prev ? `${prev.used} + ${used}` : used, next })
  }
  return [...plan.values()]
}

/**
 * How much of a recipe is at home: { have, total, missing } over its named
 * ingredients. `canonical` maps a name to its catalog name.
 */
export function homeMatch(recipe, pantry, canonical) {
  const atHome = new Set(pantry.filter((p) => !isOut(p)).map((p) => canonical(p.name)))
  const names = (recipe.ingredients ?? []).map((i) => i.name?.trim()).filter(Boolean)
  const missing = names.filter((n) => !atHome.has(canonical(n)))
  return { have: names.length - missing.length, total: names.length, missing }
}
