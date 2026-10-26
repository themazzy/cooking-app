import { NUTRITION_LINES } from '../data/nutrition.js'
import { canonicalUnit, parseAmount, stickGrams, sumRow } from './scale.js'

// Estimated calories of a recipe: each ingredient's amount turned into grams,
// times its kcal per 100 g from the catalog. Ingredients without an amount
// ("salt to taste") or without known calories are left out and listed.

const num = (s) => (String(s ?? '').trim() === '' ? null : Number(s))

/** Catalog name (lowercase) → { kcal, piece_g, density, protein, carbs, fat } from data/nutrition.js. */
export const NUTRITION = new Map(
  NUTRITION_LINES.trim()
    .split('\n')
    .map((line) => {
      const [name, kcal, piece, density, protein, carbs, fat] = line.split('|').map((s) => s.trim())
      return [name.toLowerCase(), { kcal: num(kcal), piece_g: num(piece), density: num(density), protein: num(protein), carbs: num(carbs), fat: num(fat) }]
    }),
)

export const MACROS = ['protein', 'carbs', 'fat']

const MASS = { g: 1, kg: 1000, oz: 28.35, lb: 453.6 }
const VOLUME = { ml: 1, dl: 100, l: 1000, tsp: 4.93, tbsp: 14.79, cup: 240, floz: 29.57, pint: 473.2, quart: 946.4 }
// Units that weigh about the same whatever the ingredient
const FIXED = { pinch: 0.4, handful: 30, bunch: 30 }
// Counted units: one piece of the ingredient (a clove of garlic, a slice of bread, a pack)
const COUNTED = new Set(['', 'pcs', 'clove', 'slice', 'head', 'pack', 'can', 'stick'])

/** Grams of an ingredient row ({ qty, unit }) for a catalog entry, or null when it can't be told. */
export function gramsOf(ing, entry) {
  const a = parseAmount(ing.qty)
  if (!a) return null
  const n = a.max != null ? (a.min + a.max) / 2 : a.min
  const unit = canonicalUnit(ing.unit)
  if (unit == null) return null
  if (MASS[unit]) return n * MASS[unit]
  if (VOLUME[unit]) return n * VOLUME[unit] * (entry?.density ?? 1)
  if (FIXED[unit]) return n * FIXED[unit]
  if (unit === 'stick' && stickGrams(entry)) return n * stickGrams(entry)
  if (COUNTED.has(unit)) {
    if (entry?.piece_g) return n * entry.piece_g
    if (unit === 'can') return n * 400
  }
  return null
}

/** kcal of one ingredient row, or null. */
export function ingredientKcal(ing, entry) {
  if (entry?.kcal == null) return null
  const g = gramsOf(ing, entry)
  return g == null ? null : (g * entry.kcal) / 100
}

/**
 * Calories of a list of ingredients: { total, rows: [{ name, kcal }], missing: [name] }.
 * `match` finds an ingredient's catalog entry by name.
 */
export function recipeCalories(ingredients, match) {
  const rows = []
  const missing = []
  for (const i of (ingredients ?? []).map(sumRow).filter(Boolean)) {
    const entry = match(i.name)
    // Salt, water and the like count as nothing, with or without an amount
    const kcal = entry?.kcal === 0 ? 0 : ingredientKcal(i, entry)
    if (kcal == null) missing.push(i.name.trim())
    else rows.push({ name: i.name.trim(), kcal })
  }
  return { total: rows.reduce((s, r) => s + r.kcal, 0), rows, missing }
}

/**
 * kcal of one portion of a recipe as written, or null when the recipe has no
 * portion count or no ingredient with known calories.
 */
export function portionKcal(recipe, match) {
  if (!recipe.servings) return null
  const c = recipeCalories(recipe.ingredients, match)
  return c.rows.some((r) => r.kcal > 0) ? c.total / recipe.servings : null
}

/**
 * Protein, carbs and fat (grams) of a list of ingredients, counted like
 * calories: { protein, carbs, fat, missing: [name] }. Ingredients without
 * calories count as nothing here too (salt, water).
 */
export function recipeMacros(ingredients, match) {
  const out = { protein: 0, carbs: 0, fat: 0, missing: [] }
  for (const i of (ingredients ?? []).map(sumRow).filter(Boolean)) {
    const entry = match(i.name)
    if (entry?.kcal === 0) continue
    const g = entry && MACROS.every((m) => entry[m] != null) ? gramsOf(i, entry) : null
    if (g == null) {
      out.missing.push(i.name.trim())
      continue
    }
    for (const m of MACROS) out[m] += (g * entry[m]) / 100
  }
  return out
}

/** Grams for display: one decimal under 10 g, whole grams above. */
export const formatGrams = (n) => (n < 10 ? Math.round(n * 10) / 10 : Math.round(n)).toLocaleString('cs-CZ')

/** "2 080" style rounding: to 10 above 100 kcal. */
export const formatKcal = (n) => (n >= 100 ? Math.round(n / 10) * 10 : Math.round(n)).toLocaleString('cs-CZ')
