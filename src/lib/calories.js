import { NUTRITION_LINES } from '../data/nutrition.js'
import { canonicalUnit, parseAmount, stickGrams, sumRows } from './scale.js'

// Estimated calories of a recipe: each ingredient's amount turned into grams,
// times its kcal per 100 g from the catalog. Ingredients without an amount
// ("salt to taste") or without known calories are left out and listed.

const num = (s) => (String(s ?? '').trim() === '' ? null : Number(s))

/** Catalog name (lowercase) → { kcal, piece_g, density, protein, carbs, fat, sugar, fibre, salt } from data/nutrition.js. */
export const NUTRITION = new Map(
  NUTRITION_LINES.trim()
    .split('\n')
    .map((line) => {
      const [name, kcal, piece, density, protein, carbs, fat, sugar, fibre, salt] = line.split('|').map((s) => s.trim())
      return [
        name.toLowerCase(),
        { kcal: num(kcal), piece_g: num(piece), density: num(density), protein: num(protein), carbs: num(carbs), fat: num(fat), sugar: num(sugar), fibre: num(fibre), salt: num(salt) },
      ]
    }),
)

export const MACROS = ['protein', 'carbs', 'fat']
/** Sugars (part of the carbs), fibre and salt, grams per 100 g too. */
export const EXTRAS = ['sugar', 'fibre', 'salt']

const MASS = { g: 1, kg: 1000, oz: 28.35, lb: 453.6 }
const VOLUME = { ml: 1, dl: 100, l: 1000, tsp: 4.93, tbsp: 14.79, cup: 240, floz: 29.57, pint: 473.2, quart: 946.4 }
// Units that weigh about the same whatever the ingredient
const FIXED = { pinch: 0.4, handful: 30, bunch: 30 }
// Counted units: one piece of the ingredient (a clove of garlic, a slice of bread, a pack)
const COUNTED = new Set(['', 'pcs', 'clove', 'slice', 'head', 'pack', 'can', 'stick'])

/** Grams of an ingredient row ({ qty, unit }) for a catalog entry, or null when it can't be told. */
export function gramsOf(ing, entry) {
  const a = parseAmount(ing.qty)
  const unit = canonicalUnit(ing.unit)
  // "a pinch of salt": a unit that weighs the same without a number is one of it
  if (!a) return unit && FIXED[unit] ? FIXED[unit] : null
  const n = a.max != null ? (a.min + a.max) / 2 : a.min
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

/**
 * Grams per portion counted for things recipes add "to taste", without an
 * amount: about ⅙ tsp of salt, a few turns of pepper, half a teaspoon of
 * sugar, a teaspoon of oil. By catalog name (or what an own one counts as).
 */
export const TO_TASTE = new Map(
  Object.entries({
    salt: 1,
    'sea salt': 1,
    'himalayan salt': 1,
    'salt and pepper': 1.2,
    'garlic salt': 1,
    'celery salt': 1,
    'onion salt': 1,
    'sharena sol': 1,
    msg: 0.3,
    'black pepper': 0.2,
    'black peppercorns': 0.2,
    'white pepper': 0.2,
    'white peppercorns': 0.2,
    'cayenne pepper': 0.2,
    'chilli flakes': 0.3,
    'chilli powder': 0.3,
    sugar: 2,
    'brown sugar': 2,
    'caster sugar': 2,
    'icing sugar': 2,
    honey: 3,
    'olive oil': 5,
    'vegetable oil': 5,
    'sunflower oil': 5,
    'rapeseed oil': 5,
    'lemon juice': 5,
  }),
)

/** Grams of a row with no amount that is usually added to taste, for `portions`; null otherwise. */
export function tasteGrams(ing, entry, portions) {
  if (!entry || !(portions > 0) || parseAmount(ing.qty)) return null
  const per = TO_TASTE.get(entry.name?.toLowerCase()) ?? TO_TASTE.get(entry.base?.toLowerCase())
  return per == null ? null : per * portions
}

/** kcal of one ingredient row, or null. */
export function ingredientKcal(ing, entry) {
  if (entry?.kcal == null) return null
  const g = gramsOf(ing, entry)
  return g == null ? null : (g * entry.kcal) / 100
}

/**
 * Calories of a list of ingredients: { total, rows: [{ name, kcal }], missing: [name], guessed: [name] }.
 * `match` finds an ingredient's catalog entry by name. With `portions`,
 * oil, sugar and the like "to taste" count as a typical amount (TO_TASTE)
 * and are listed in `guessed`.
 */
export function recipeCalories(ingredients, match, { portions } = {}) {
  const rows = []
  const missing = []
  const guessed = []
  for (const i of (ingredients ?? []).flatMap(sumRows)) {
    const entry = match(i.name)
    // Salt, water and the like count as nothing, with or without an amount
    let kcal = entry?.kcal === 0 ? 0 : ingredientKcal(i, entry)
    if (kcal == null && entry?.kcal != null) {
      const g = tasteGrams(i, entry, portions)
      if (g != null) {
        kcal = (g * entry.kcal) / 100
        guessed.push(i.name.trim())
      }
    }
    if (kcal == null) missing.push(i.name.trim())
    else rows.push({ name: i.name.trim(), kcal })
  }
  return { total: rows.reduce((s, r) => s + r.kcal, 0), rows, missing, guessed }
}

/**
 * kcal of one portion of a recipe as written, or null when the recipe has no
 * portion count or no ingredient with known calories.
 */
export function portionKcal(recipe, match) {
  if (!recipe.servings) return null
  const c = recipeCalories(recipe.ingredients, match, { portions: recipe.servings })
  return c.rows.some((r) => r.kcal > 0) ? c.total / recipe.servings : null
}

/**
 * Protein, carbs, fat, sugar, fibre and salt (grams) of a list of
 * ingredients, counted like calories: { protein, carbs, fat, sugar, fibre,
 * salt, missing: [name], unweighed: [name] }. Ingredients without calories
 * count as nothing for the macros (water); salt with an amount counts as
 * salt, and salty things without one ("salt to taste") are in `unweighed`.
 */
export function recipeMacros(ingredients, match, { portions } = {}) {
  const out = { protein: 0, carbs: 0, fat: 0, sugar: 0, fibre: 0, salt: 0, missing: [], unweighed: [], guessed: [] }
  // Grams of a row, or a typical amount when it is added to taste
  const grams = (i, entry) => {
    const g = gramsOf(i, entry)
    if (g != null) return g
    const t = tasteGrams(i, entry, portions)
    if (t != null) out.guessed.push(i.name.trim())
    return t
  }
  for (const i of (ingredients ?? []).flatMap(sumRows)) {
    const entry = match(i.name)
    if (entry?.kcal === 0) {
      if (!(entry.salt > 0)) continue
      const g = grams(i, entry)
      if (g == null) {
        if (entry.salt >= 5) out.unweighed.push(i.name.trim())
      }
      else out.salt += (g * entry.salt) / 100
      continue
    }
    const g = entry && MACROS.every((m) => entry[m] != null) ? grams(i, entry) : null
    if (g == null) {
      out.missing.push(i.name.trim())
      continue
    }
    for (const m of [...MACROS, ...EXTRAS]) out[m] += (g * (entry[m] ?? 0)) / 100
  }
  return out
}

/** Grams for display: one decimal under 10 g, whole grams above. */
export const formatGrams = (n) => (n < 10 ? Math.round(n * 10) / 10 : Math.round(n)).toLocaleString('cs-CZ')

/** "2 080" style rounding: to 10 above 100 kcal. */
export const formatKcal = (n) => (n >= 100 ? Math.round(n / 10) * 10 : Math.round(n)).toLocaleString('cs-CZ')
