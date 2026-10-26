// The week's meal plan: recipes and portions per day, kept with the shared
// shopping list ({ plan: { '2026-10-26': [{ id, portions }] } }) so both
// phones see it without another table.

const pad = (n) => String(n).padStart(2, '0')

/** A Date as '2026-10-26' in local time. */
export const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

const fromKey = (key) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** The Monday of the week `offset` weeks from the one holding `date`. */
export function weekStart(date = new Date(), offset = 0) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + offset * 7)
  return dayKey(d)
}

/** Seven day keys from a Monday. */
export function weekDays(start) {
  const d = fromKey(start)
  return Array.from({ length: 7 }, (_, n) => dayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)))
}

/** "Mon 26 Oct" */
export const dayLabel = (key) => fromKey(key).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

export function addToPlan(plan, day, entry) {
  return { ...plan, [day]: [...(plan?.[day] ?? []), entry] }
}

export function removeFromPlan(plan, day, index) {
  const list = (plan?.[day] ?? []).filter((_, n) => n !== index)
  const next = { ...plan }
  if (list.length) next[day] = list
  else delete next[day]
  return next
}

export function setPlanPortions(plan, day, index, portions) {
  return { ...plan, [day]: (plan?.[day] ?? []).map((e, n) => (n === index ? { ...e, portions } : e)) }
}

/** The plan without days more than `keepDays` before `today`, so it does not grow forever. */
export function prunePlan(plan, today = new Date(), keepDays = 56) {
  const cut = dayKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - keepDays))
  return Object.fromEntries(Object.entries(plan ?? {}).filter(([day]) => day >= cut))
}

/**
 * Shopping list entries ({ id, portions }) for these days: a recipe planned
 * twice is bought for both. Recipes that were deleted are left out.
 */
export function planEntries(plan, days, recipes) {
  const known = new Set(recipes.map((r) => r.id))
  const total = new Map()
  for (const day of days) for (const e of plan?.[day] ?? []) if (known.has(e.id)) total.set(e.id, (total.get(e.id) ?? 0) + e.portions)
  return [...total].map(([id, portions]) => ({ id, portions }))
}
