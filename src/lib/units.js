import { canonicalUnit, formatAmount, parseAmount, poured, stickGrams, weighed } from './scale.js'

// Showing recipes in metric or US units. Amounts are converted for display
// only; the saved recipe keeps the units it was written in.

const TO_METRIC = { oz: ['g', 28.35], lb: ['g', 453.6], floz: ['ml', 29.57], pint: ['ml', 473.2], quart: ['ml', 946.4], cup: ['ml', 240] }
const FROM_METRIC = { g: ['g', 1], kg: ['g', 1000], ml: ['ml', 1], dl: ['ml', 100], l: ['ml', 1000] }

function toMetric(n, unit) {
  const [base, mult] = TO_METRIC[unit]
  const v = n * mult
  if (base === 'g' && v >= 1000) return [v / 1000, 'kg']
  if (base === 'ml' && v >= 1000) return [v / 1000, 'l']
  return [v, base]
}

function toImperial(n, unit) {
  const [base, mult] = FROM_METRIC[unit]
  const v = n * mult
  if (base === 'g') return v >= 453.6 ? [v / 453.6, 'lb'] : [v / 28.35, 'oz']
  // Small volumes read better in spoons, then cups, then quarts
  if (v < 15) return [v / 4.93, 'tsp']
  if (v < 60) return [v / 14.79, 'tbsp']
  if (v >= 1892) return [v / 946.4, 'quart']
  return [v / 240, 'cup']
}

const LABEL = { floz: 'fl oz', quart: 'qt' }
// "1 cup" and "½ cup", but "1 ½ cups"
const label = (unit, text) => (unit === 'cup' ? (/^(1|½|⅓|⅔|¼|¾|0,\d+)$/.test(text) ? 'cup' : 'cups') : (LABEL[unit] ?? unit))

// Ounces and pounds round to a quarter so they read like a recipe
const quarter = (n) => (n >= 10 ? Math.round(n) : Math.round(n * 4) / 4)

// Weighed ingredients (flour, sugar, butter, grated cheese, nuts) are weighed in
// metric kitchens, so cups and millilitres of them become grams, and so does a
// stick of butter. Spoons stay spoons: half a spoon of starch reads better than 7 g.
const ML = { ml: 1, dl: 100, l: 1000, floz: 29.57, pint: 473.2, quart: 946.4, cup: 240 }

function toGrams(n, unit, entry) {
  const v = unit === 'stick' ? n * stickGrams(entry) : n * ML[unit] * entry.density
  return v >= 1000 ? [v / 1000, 'kg'] : [v, 'g']
}

// Ounces of milk or stock are fluid ounces
function fluidOunces(n) {
  const v = n * 29.57
  return v >= 1000 ? [v / 1000, 'l'] : [v, 'ml']
}

/**
 * One ingredient ({ qty, unit, name }) in `system` ('metric' or 'imperial');
 * anything else is left as it is. `match` (name → catalog entry) lets metric
 * weigh dry ingredients instead of measuring them in ml.
 */
export function convertIngredient(ing, system, match) {
  const unit = canonicalUnit(ing.unit)
  const entry = system === 'metric' && (ML[unit] || unit === 'stick' || unit === 'oz') ? match?.(ing.name) : null
  const dry = unit === 'stick' ? stickGrams(entry) != null : !!ML[unit] && weighed(entry)
  const fluid = unit === 'oz' && poured(entry)
  const table = system === 'metric' ? TO_METRIC : system === 'imperial' ? FROM_METRIC : null
  if (!table || !unit || (!table[unit] && !dry)) return ing
  const a = parseAmount(ing.qty)
  if (!a) return ing
  const conv = dry ? (n, u) => toGrams(n, u, entry) : fluid ? fluidOunces : system === 'metric' ? toMetric : toImperial
  // Both ends of a range in the unit the larger one needs: 905 g–1,4 kg reads as 0,9–1,4 kg
  const [top, u] = conv(a.max ?? a.min, unit)
  const min = a.max != null ? (top * a.min) / a.max : top
  const max = a.max != null ? top : null
  const fmt = (n) => (['oz', 'lb', 'quart'].includes(u) ? formatAmount(quarter(n), 'cup') : formatAmount(n, u))
  const last = fmt(max ?? min)
  return { ...ing, qty: max != null ? `${fmt(min)}–${last}` : last, unit: label(u, last) }
}

export const convertIngredients = (list, system, match) => list.map((i) => convertIngredient(i, system, match))

/** Oven temperatures in step text: "350°F" → "175 °C" (metric), "180 °C" → "355 °F" (imperial). */
export function convertTemperatures(text, system) {
  if (system !== 'metric' && system !== 'imperial') return text
  return String(text ?? '').replace(/(\d{2,3})\s*°?\s*(?:degrees\s*)?([CF])\b/gi, (all, num, scale) => {
    const n = Number(num)
    const f = scale.toUpperCase() === 'F'
    if (system === 'metric' && f) return `${Math.round(((n - 32) * 5) / 9 / 5) * 5} °C`
    if (system === 'imperial' && !f) return `${Math.round(((n * 9) / 5 + 32) / 5) * 5} °F`
    return all
  })
}

/** Whether a recipe uses any units that `system` would change. */
export const hasUnits = (list, system, match) => list.some((i) => convertIngredient(i, system, match) !== i)
