// The order of the shop's sections on the shopping list. The household's own
// order is kept with the shared list ({ aisles: ['Bakery', 'Vegetables', …] });
// sections it does not name keep their place after the one before them.

import { AISLES } from '../data/ingredients.js'

/** Every aisle once, in the saved order where there is one. */
export function aisleOrder(saved, all = AISLES) {
  const known = (Array.isArray(saved) ? saved : []).filter((a, n, list) => all.includes(a) && list.indexOf(a) === n)
  const out = [...known]
  // A section new since the order was saved goes after its neighbour in the default order
  all.forEach((a, n) => {
    if (out.includes(a)) return
    const before = all.slice(0, n).reverse().find((b) => out.includes(b))
    out.splice(before ? out.indexOf(before) + 1 : 0, 0, a)
  })
  return out
}

/** The order with aisle `n` moved `by` places (−1 up, 1 down). */
export function moveAisle(order, n, by) {
  const to = n + by
  if (to < 0 || to >= order.length) return order
  const next = [...order]
  ;[next[n], next[to]] = [next[to], next[n]]
  return next
}

/** True when the order is the app's default one, so nothing needs saving. */
export const isDefaultOrder = (order, all = AISLES) => order.length === all.length && order.every((a, n) => a === all[n])
