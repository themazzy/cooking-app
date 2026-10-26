// When a recipe was cooked, with a note each time: recipe.cooked = [{ at, note, by }], newest last.
// `at` names the entry (phones join their histories by it); `by` is who added it (ratings.js raterId).

export const addCooked = (recipe, at = Date.now(), note = '', by = null) => {
  const taken = new Set((recipe.cooked ?? []).map((c) => c.at))
  while (taken.has(at)) at++
  return [...(recipe.cooked ?? []), { at, ...(note.trim() ? { note: note.trim() } : {}), ...(by ? { by } : {}) }]
}

/** Changes the note of one entry (an empty note removes it). */
export const editCooked = (recipe, at, note) =>
  (recipe.cooked ?? []).map((c) => {
    if (c.at !== at) return c
    const { note: _old, ...rest } = c
    return note.trim() ? { ...rest, note: note.trim() } : rest
  })

export const removeCooked = (recipe, at) => (recipe.cooked ?? []).filter((c) => c.at !== at)

export const lastCooked = (recipe) => (recipe.cooked?.length ? Math.max(...recipe.cooked.map((c) => c.at)) : null)

/** "today", "yesterday", "5 days ago", "3 weeks ago", "12 Mar 2026" */
export function cookedAgo(at, now = Date.now()) {
  const day = (t) => {
    const d = new Date(t)
    return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5
  }
  const days = day(now) - day(at)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 14) return `${days} days ago`
  if (days < 60) return `${Math.round(days / 7)} weeks ago`
  return new Date(at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
