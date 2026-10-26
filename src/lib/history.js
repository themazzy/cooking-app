// When a recipe was cooked, with a note each time: recipe.cooked = [{ at, note }], newest last.

export const addCooked = (recipe, at = Date.now(), note = '') => [...(recipe.cooked ?? []), { at, ...(note.trim() ? { note: note.trim() } : {}) }]

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
