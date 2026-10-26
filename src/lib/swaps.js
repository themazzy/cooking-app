import { SWAPS } from '../data/swaps.js'
import { canonicalUnit, scaleAmount } from './scale.js'

// What else to use for an ingredient, with the amount worked out from the
// recipe's own amount (data/swaps.js).

// Units that count pieces, so "1 tbsp per egg" or "per clove" can be multiplied out
const PIECES = new Set(['', 'pcs', 'clove', 'pack'])

/** Swaps for a catalog entry, also through the ingredient it counts as. */
export function swapsFor(entry) {
  if (!entry) return []
  return SWAPS.get(entry.name.toLowerCase()) ?? (entry.base ? SWAPS.get(entry.base.toLowerCase()) : null) ?? []
}

/**
 * The ingredient row ({ qty, unit, name }) with the swap in its place, or
 * with an empty amount when it can't be worked out (the note says how much).
 */
export function swapIngredient(ing, swap) {
  const out = { ...ing, name: swap.name }
  if (!swap.unit) return { ...out, qty: scaleAmount(ing.qty, swap.ratio, ing.unit) }
  // An amount per piece only works for counted ingredients
  if (!PIECES.has(canonicalUnit(ing.unit))) return { ...out, qty: '', unit: '' }
  const qty = scaleAmount(ing.qty, swap.ratio, swap.unit)
  return { ...out, qty: qty === ing.qty && swap.ratio !== 1 ? '' : qty, unit: swap.unit === 'pcs' ? ing.unit : swap.unit }
}
