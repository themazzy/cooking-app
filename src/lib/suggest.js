import { lastCooked } from './history.js'
import { averageRating } from './ratings.js'
import { daysLeft, homeMatch, isOut } from './stock.js'

// Suggestions for the meal plan, from the household's own recipes only:
// recipes that use up what other planned meals leave over (half a bunch of
// coriander, the rest of the cream) or what is at home and must be used
// soon, and a whole week filled from well-rated recipes that were not cooked
// lately and can mostly be cooked from stock. No AI, nothing leaves the phone.

// Aisles whose leftovers go off; a half-used bag of rice can wait
const PERISHABLE = new Set(['Vegetables', 'Fruit', 'Herbs', 'Meat', 'Fish', 'Dairy & eggs', 'Bakery'])
// Recipes in only these categories are not a meal on their own
const NOT_A_MEAL = new Set(['breakfast', 'dessert', 'baking', 'drink', 'sauce', 'snack', 'side', 'starter'])
const SOON = 3 // days

const DAY = 864e5

/** Whether a recipe can be the day's meal (no categories counts as yes). */
export const isMeal = (recipe) => !(recipe.categories?.length) || recipe.categories.some((c) => !NOT_A_MEAL.has(String(c).toLowerCase()))

const keysOf = (recipe, canonical) => [...new Set((recipe.ingredients ?? []).map((i) => i.name?.trim()).filter(Boolean).map(canonical))]

/**
 * Ingredients so common in the household's recipes (onion, garlic in more
 * than half of them) that sharing them says nothing.
 */
export function commonKeys(recipes, canonical) {
  if (recipes.length < 6) return new Set()
  const count = new Map()
  for (const r of recipes) for (const k of keysOf(r, canonical)) count.set(k, (count.get(k) ?? 0) + 1)
  return new Set([...count].filter(([, n]) => n > recipes.length / 2).map(([k]) => k))
}

/**
 * What wants using up: perishable ingredients of the `planned` recipes, and
 * pantry items within a few days of their use-by date.
 * A Map of canonical key → { name, soon } (soon: from the pantry's use-by date).
 */
export function leftovers(planned, pantry, { canonical, match }, { common = new Set(), today = new Date() } = {}) {
  const out = new Map()
  for (const r of planned) {
    for (const i of r.ingredients ?? []) {
      const name = i.name?.trim()
      if (!name) continue
      const key = canonical(name)
      if (common.has(key) || out.has(key) || !PERISHABLE.has(match(name)?.aisle)) continue
      out.set(key, { name: match(name)?.name ?? name, soon: false })
    }
  }
  for (const p of pantry) {
    const d = daysLeft(p.expires_on, today)
    if (d == null || d > SOON || isOut(p)) continue
    const key = canonical(p.name)
    out.set(key, { name: match(p.name)?.name ?? p.name, soon: true })
  }
  return out
}

/** The leftovers a recipe uses: [{ name, soon }]. */
export const leftoversUsed = (recipe, left, canonical) => keysOf(recipe, canonical).filter((k) => left.has(k)).map((k) => left.get(k))

/**
 * Recipes that use up leftovers, best first: [{ recipe, uses }]. `exclude`
 * holds ids already planned.
 */
export function leftoverSuggestions(recipes, left, canonical, { exclude = new Set(), limit = 5 } = {}) {
  if (!left.size) return []
  return recipes
    .filter((r) => !exclude.has(r.id))
    .map((recipe) => ({ recipe, uses: leftoversUsed(recipe, left, canonical) }))
    .filter((s) => s.uses.length)
    .sort((a, b) => b.uses.filter((u) => u.soon).length - a.uses.filter((u) => u.soon).length || b.uses.length - a.uses.length || (averageRating(b.recipe) ?? 0) - (averageRating(a.recipe) ?? 0))
    .slice(0, limit)
}

/** Why a recipe was picked, in a few words each. */
function reasons({ rating, days, home, uses }) {
  const out = []
  if (uses.length) out.push(`uses ${uses.slice(0, 3).map((u) => u.name.toLowerCase()).join(', ')}`)
  if (home.total && home.have / home.total >= 0.5) out.push(`${home.have}/${home.total} at home`)
  if (rating >= 4) out.push(`rated ${rating}`)
  if (days == null) out.push('not cooked yet')
  else if (days >= 21) out.push(`not cooked for ${days >= 60 ? `${Math.round(days / 30)} months` : `${Math.round(days / 7)} weeks`}`)
  return out
}

/** How good a recipe is for a free day, and why. */
function score(recipe, { pantry, left, canonical, now }) {
  const rating = averageRating(recipe)
  const last = lastCooked(recipe)
  const days = last == null ? null : Math.floor((now - last) / DAY)
  const home = homeMatch(recipe, pantry, canonical)
  const uses = leftoversUsed(recipe, left, canonical)
  let s = ((rating ?? 3) / 5) * 2
  // Cooked last week: not again yet; long ago or never: more welcome
  s += days == null ? 0.6 : days < 7 ? -2 : Math.min(days / 30, 1) * 1.5
  s += home.total ? (home.have / home.total) * 1.5 : 0
  s += Math.min(uses.length, 3) * 0.8 + uses.filter((u) => u.soon).length * 0.6
  return { score: s, why: reasons({ rating, days, home, uses }) }
}

/**
 * Picks a recipe for each of `days`, one after another, so later picks use
 * up what earlier ones leave. `planned` are recipes already on the week
 * (their leftovers count, and they are not picked again). `random` (0–1)
 * adds variety, so asking again gives another week.
 * Returns [{ day, recipe, why }] (a day is left out when nothing is left to pick).
 */
export function planWeek(days, recipes, { planned = [], pantry = [], canonical, match, now = Date.now(), random = Math.random } = {}) {
  const ctx = { canonical, match }
  const common = commonKeys(recipes, canonical)
  const taken = new Set(planned.map((r) => r.id))
  const chosen = [...planned]
  const picks = []
  for (const day of days) {
    const left = leftovers(chosen, pantry, ctx, { common, today: new Date(now) })
    const best = recipes
      .filter((r) => !taken.has(r.id) && isMeal(r))
      .map((r) => ({ r, ...score(r, { pantry, left, canonical, now }), jitter: random() * 1.2 }))
      .sort((a, b) => b.score + b.jitter - (a.score + a.jitter))[0]
    if (!best) break
    taken.add(best.r.id)
    chosen.push(best.r)
    picks.push({ day, recipe: best.r, why: best.why })
  }
  return picks
}
