import { UNIT_LOOKUP, parseQuantity, tidyIngredient } from './ingredients.js'

// Scaling recipes and adding up shopping lists. Amounts are the editable
// text fields of a recipe ("400", "1,5–2", "½"), units are free text.

/** "1,5–2" → { min: 1.5, max: 2 }, "½" → { min: 0.5, max: null }, "" or "a bit" → null */
export function parseAmount(text) {
  const t = String(text ?? '')
    .trim()
    .replace(/^(\d{1,3}) (\d{3})(?![\d/])/, '$1$2') // "1 000"
    .replace(/^(\d+)-(\d+\/\d+)$/, '$1 $2') // "1-1/2" is one and a half
  if (!t) return null
  const parts = t.split(/\s*(?:–|-|to|až)\s*/)
  const min = parseQuantity(parts[0])
  if (min == null) return null
  const max = parts[1] ? parseQuantity(parts[1]) : null
  if (!Number.isFinite(min) || (max != null && !Number.isFinite(max))) return null
  return { min, max }
}

const FRACTION_GLYPHS = [
  [0.125, '⅛'],
  [0.25, '¼'],
  [1 / 3, '⅓'],
  [0.5, '½'],
  [2 / 3, '⅔'],
  [0.75, '¾'],
]
// Spoons, cups and pieces read better as fractions; grams as whole numbers
const COUNTED = new Set(['tsp', 'tbsp', 'cup', 'pcs', 'clove', 'can', 'pack', 'head', 'slice', 'bunch', 'handful', 'pinch', 'stick', ''])
// Kilograms and litres keep quarters: 1,25 kg and 0,75 l, not 1,3 and 0,8
const LARGE = new Set(['kg', 'l'])
const quarters = (n) => {
  const r = Math.round(n * 100) / 100
  return Math.abs(r * 20 - Math.round(r * 20)) < 1e-9 ? r : Math.round(n * 10) / 10
}

/** A friendly number for display, with a decimal comma. */
export function formatAmount(n, unit = '') {
  if (n == null || !Number.isFinite(n)) return ''
  const u = canonicalUnit(unit) ?? ''
  if (COUNTED.has(u) && n < 20) {
    const whole = Math.floor(n)
    const rest = n - whole
    if (rest < 0.08) return whole ? String(whole) : String(Math.round(n * 100) / 100).replace('.', ',')
    if (rest > 0.92) return String(whole + 1)
    // Eighths only for spoons: ⅛ tsp, but not 2 ⅛ cups
    const glyphs = u === 'tsp' || u === 'tbsp' ? FRACTION_GLYPHS : FRACTION_GLYPHS.slice(1)
    const [, glyph] = glyphs.reduce((best, f) => (Math.abs(f[0] - rest) < Math.abs(best[0] - rest) ? f : best))
    return whole ? `${whole} ${glyph}` : glyph
  }
  let r
  if (n >= 100) r = Math.round(n / 5) * 5
  else if (n >= 10) r = Math.round(n)
  else if (LARGE.has(u) || n < 1) r = quarters(n)
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

// A stick of butter is 113 g; a cinnamon stick is just one piece
const STICK_FATS = new Set(['butter', 'vegan butter', 'lard', 'ghee'])
const named = (entry, set) => !!entry && (set.has(String(entry.name ?? '').toLowerCase()) || set.has(String(entry.base ?? '').toLowerCase()))
export const stickGrams = (entry) => (named(entry, STICK_FATS) ? 113 : null)

// Fats and soft cheeses that American recipes measure in cups and other kitchens weigh
const SOLIDS = new Set([...STICK_FATS, 'peanut butter', 'nut butter', 'cream cheese', 'mascarpone', 'quark', 'coconut oil'])
// In the dry aisles heavier things are weighed too (salt, baking soda, brown sugar), but not flavourings
const DRY_AISLES = new Set(['Baking', 'Pasta & grains', 'Nuts & seeds', 'Spices', 'Bakery'])
const KEEP_VOLUME = new Set(['vanilla', 'food colouring', 'rum flavouring', 'ice cream', 'whipped cream'])

/**
 * Whether an ingredient (a catalog entry with a density) is weighed rather
 * than measured: flour, sugar, rice, grated cheese, nuts, chopped vegetables
 * and butter are; milk, oil, stock, honey and syrups are not.
 */
export function weighed(entry) {
  const d = entry?.density
  if (d == null || named(entry, KEEP_VOLUME)) return false
  if (named(entry, SOLIDS)) return true
  if (entry.aisle === 'Drinks') return false
  return d < 0.9 || (d < 1.3 && DRY_AISLES.has(entry.aisle))
}

/** Whether an ingredient is poured (milk, stock, oil, juice), so ounces of it are fluid ounces. */
export const poured = (entry) => entry?.density != null && !weighed(entry) && entry.density < 1.25

// "For the filling" saved as an ingredient by an older import
const HEADING_ROW = /^(?:for|na|pro|за|für|para|pour)\s+\p{L}/iu

/**
 * A saved ingredient row as the sums need it: a unit left in its name moved
 * out ("1" + "tablespoon of cornstarch" → 1 tbsp cornstarch), or null for a
 * heading saved as a row ("For the custard filling").
 */
export function sumRow(ing) {
  const name = String(ing?.name ?? '').trim()
  if (!name || (!parseAmount(ing.qty) && HEADING_ROW.test(name) && name.split(/\s+/).length <= 5)) return null
  return tidyIngredient(ing)
}

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

const SPOON_ML = { tsp: 4.93, tbsp: 14.79 }

/**
 * One amount where the units allow it: spoons join millilitres or grams already
 * on the line (100 ml + 2 tbsp of oil), teaspoons join tablespoons, and flour or
 * butter measured in cups or ml is weighed with its density (1 cup + 300 g of flour).
 */
function foldTotals(totals, entry) {
  const t = { ...totals }
  const spoons = Object.keys(SPOON_ML).filter((u) => t[u] != null)
  if (spoons.length && (t.ml != null || t.g != null)) {
    for (const u of spoons) {
      t.ml = (t.ml ?? 0) + t[u] * SPOON_ML[u]
      delete t[u]
    }
  } else if (t.tsp != null && t.tbsp != null) {
    t.tbsp += t.tsp / 3
    delete t.tsp
  }
  if (t.ml != null && weighed(entry)) {
    t.g = (t.g ?? 0) + t.ml * entry.density
    delete t.ml
  }
  return t
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
    for (const ing of (recipe.ingredients ?? []).map(sumRow).filter(Boolean)) {
      const name = String(ing.name ?? '').trim()
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
      if (entry && !item.entry) item.entry = entry
      const amount = parseAmount(ing.qty)
      const unit = canonicalUnit(ing.unit)
      if (amount && unit !== null) {
        // "2 eggs" and "1 pcs egg" are the same; a stick of butter is grams
        const [base, mult] = unit === 'pcs' ? ['', 1] : unit === 'stick' && stickGrams(entry) ? ['g', stickGrams(entry)] : (BASE[unit] ?? [unit, 1])
        // Ranges count at their upper end: better one too many than one short
        item.totals[base] = (item.totals[base] ?? 0) + (amount.max ?? amount.min) * mult * factor
      } else {
        const text = [scaleAmount(ing.qty, factor, ing.unit), ing.unit].filter((s) => String(s ?? '').trim()).join(' ')
        if (text && !item.extra.includes(text)) item.extra.push(text)
      }
      items.set(key, item)
    }
  }
  return [...items.values()].map(({ totals, entry, ...item }) => {
    const parts = Object.entries(foldTotals(totals, entry)).map(([base, total]) => display(total, base))
    const [first, ...more] = parts
    return {
      ...item,
      qty: first?.qty ?? '',
      unit: first?.unit ?? '',
      extra: [...more.map((p) => `${p.qty} ${p.unit}`.trim()), ...item.extra],
    }
  })
}

const STEP_NUM = '(?:\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d+[½⅓⅔¼¾⅛]|\\d+(?:[.,]\\d+)?|[½⅓⅔¼¾⅛])'
const STEP_UNITS = [...UNIT_LOOKUP.keys()]
  .sort((a, b) => b.length - a.length)
  .map((u) => u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
const INTO = /(?:^|[^\p{L}])(?:into|na|на)\s+$/iu
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Step text with its amounts scaled: "add 200 g flour" or "beat in 2 eggs".
 * Only numbers followed by a unit, or by one of the recipe's ingredients
 * (with at most one word between), change; times, temperatures and sizes stay.
 */
export function scaleSteps(text, factor, ingredients = []) {
  if (!text || factor === 1 || !Number.isFinite(factor)) return text
  const words = new Set()
  for (const i of ingredients) {
    for (const w of String(i.name ?? '').toLowerCase().split(/[^\p{L}]+/u)) if (w.length >= 3) words.add(w.replace(/(es|s)$/, ''))
  }
  const things = [...words].map(escape)
  const unit = `(?:${STEP_UNITS.join('|')})(?![\\p{L}])`
  const thing = things.length ? `|(?:[\\p{L}-]+\\s+)?(?:${things.join('|')})\\p{L}*` : ''
  const re = new RegExp(`(?<![\\d.,/\\p{L}])(${STEP_NUM}(?:\\s*(?:–|-|to|až)\\s*${STEP_NUM})?)(\\s*)(?=(${unit}${thing}))`, 'giu')
  return text.replace(re, (all, amount, space, after, at, whole) => {
    const u = after.match(new RegExp(`^${unit}`, 'iu'))?.[0] ?? ''
    // "Cut the breasts into 4 pieces": how many pieces each one makes, not how many there are
    if (INTO.test(whole.slice(Math.max(0, at - 12), at)) && ['pcs', 'slice'].includes(UNIT_LOOKUP.get(u) ?? UNIT_LOOKUP.get(u.toLowerCase()))) return all
    const scaled = scaleAmount(amount.replace(/\s*(?:–|-|to|až)\s*/, '–'), factor, u)
    return scaled === amount ? all : `${scaled}${space}`
  })
}
