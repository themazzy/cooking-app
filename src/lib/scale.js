import { UNIT_LOOKUP, parseQuantity } from './ingredients.js'

// Scaling recipes and adding up shopping lists. Amounts are the editable
// text fields of a recipe ("400", "1,5–2", "½"), units are free text.

/** "1,5–2" → { min: 1.5, max: 2 }, "½" → { min: 0.5, max: null }, "" or "a bit" → null */
export function parseAmount(text) {
  const t = String(text ?? '').trim()
  if (!t) return null
  const parts = t.split(/\s*(?:–|-|to|až)\s*/)
  const min = parseQuantity(parts[0])
  if (min == null) return null
  const max = parts[1] ? parseQuantity(parts[1]) : null
  return { min, max }
}

const FRACTION_GLYPHS = [
  [0.25, '¼'],
  [1 / 3, '⅓'],
  [0.5, '½'],
  [2 / 3, '⅔'],
  [0.75, '¾'],
]
// Spoons, cups and pieces read better as fractions; grams as whole numbers
const COUNTED = new Set(['tsp', 'tbsp', 'cup', 'pcs', 'clove', 'can', 'pack', 'head', 'slice', 'bunch', 'handful', 'pinch', ''])

/** A friendly number for display, with a decimal comma. */
export function formatAmount(n, unit = '') {
  if (n == null || !Number.isFinite(n)) return ''
  const u = canonicalUnit(unit) ?? ''
  if (COUNTED.has(u) && n < 20) {
    const whole = Math.floor(n)
    const rest = n - whole
    if (rest < 0.08) return whole ? String(whole) : String(Math.round(n * 100) / 100).replace('.', ',')
    if (rest > 0.92) return String(whole + 1)
    const [, glyph] = FRACTION_GLYPHS.reduce((best, f) => (Math.abs(f[0] - rest) < Math.abs(best[0] - rest) ? f : best))
    return whole ? `${whole} ${glyph}` : glyph
  }
  let r
  if (n >= 100) r = Math.round(n / 5) * 5
  else if (n >= 10) r = Math.round(n)
  else r = Math.round(n * 10) / 10
  return String(r).replace('.', ',')
}

export const canonicalUnit = (unit) => {
  const u = String(unit ?? '').trim().toLowerCase().replace(/\.$/, '')
  if (!u) return ''
  return UNIT_LOOKUP.get(u) ?? null
}

/** Amount text multiplied by `factor`. Text that is not a number stays as it is. */
export function scaleAmount(text, factor, unit) {
  if (factor === 1) return text
  const a = parseAmount(text)
  if (!a) return text
  const min = formatAmount(a.min * factor, unit)
  return a.max != null ? `${min}–${formatAmount(a.max * factor, unit)}` : min
}

export const scaleIngredients = (ingredients, factor) =>
  ingredients.map((i) => ({ ...i, qty: scaleAmount(i.qty, factor, i.unit) }))

// Units that add up with each other, in their base unit
export const BASE = { g: ['g', 1], kg: ['g', 1000], ml: ['ml', 1], dl: ['ml', 100], l: ['ml', 1000], oz: ['g', 28.35], lb: ['g', 453.6], floz: ['ml', 29.57], pint: ['ml', 473.2], quart: ['ml', 946.4], cup: ['ml', 240] }

/** The name without notes ("Salt and pepper, to taste" → "salt and pepper"), for matching. */
const nameKey = (name) =>
  String(name ?? '')
    .split(/[,(]/)[0]
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')

export function display(total, base) {
  if (base === 'g' && total >= 1000) return { qty: formatAmount(total / 1000, 'kg'), unit: 'kg' }
  if (base === 'ml' && total >= 1000) return { qty: formatAmount(total / 1000, 'l'), unit: 'l' }
  return { qty: formatAmount(total, base), unit: base }
}

/**
 * Shopping list from [{ recipe, factor }]: the same ingredient from several
 * recipes is added up when the units allow (g with kg, ml with dl and l).
 * With a catalog `match`, "minced beef" and "ground beef" become one line
 * under the catalog's name and aisle.
 * Returns [{ key, name, aisle, qty, unit, from: [titles], extra: [texts that could not be added] }].
 */
export function buildShoppingList(selection, match = () => null) {
  const items = new Map()
  for (const { recipe, factor } of selection) {
    for (const ing of recipe.ingredients ?? []) {
      const name = String(ing.name ?? '').trim()
      if (!name) continue
      const entry = match(name)
      const key = entry ? entry.name.toLowerCase() : nameKey(name)
      const item = items.get(key) ?? {
        key,
        name: entry?.name ?? (name.split(/[,(]/)[0].trim() || name),
        aisle: entry?.aisle ?? 'Other',
        totals: {},
        extra: [],
        from: [],
        uses: [],
      }
      if (!item.from.includes(recipe.title)) item.from.push(recipe.title)
      // What each recipe (and part of it) needs, for the tap-to-see breakdown
      item.uses.push({ recipe: recipe.title ?? '', group: ing.group || '', qty: scaleAmount(ing.qty, factor, ing.unit) ?? '', unit: ing.unit ?? '', name })
      const amount = parseAmount(ing.qty)
      const unit = canonicalUnit(ing.unit)
      if (amount && unit !== null) {
        const [base, mult] = BASE[unit] ?? [unit, 1]
        // Ranges count at their upper end: better one too many than one short
        item.totals[base] = (item.totals[base] ?? 0) + (amount.max ?? amount.min) * mult * factor
      } else {
        const text = [scaleAmount(ing.qty, factor, ing.unit), ing.unit].filter((s) => String(s ?? '').trim()).join(' ')
        if (text && !item.extra.includes(text)) item.extra.push(text)
      }
      items.set(key, item)
    }
  }
  return [...items.values()].map(({ totals, ...item }) => {
    const parts = Object.entries(totals).map(([base, total]) => display(total, base))
    const [first, ...more] = parts
    return {
      ...item,
      qty: first?.qty ?? '',
      unit: first?.unit ?? '',
      extra: [...more.map((p) => `${p.qty} ${p.unit}`.trim()), ...item.extra],
    }
  })
}
