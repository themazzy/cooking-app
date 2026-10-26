// Collections: the household's own folders of recipes ("Christmas", "Quick
// weekday"). Each recipe keeps the names of the collections it is in
// (recipe.collections), so they sync with the recipe and need no table of
// their own; a collection exists while a recipe is in it.

const key = (name) => name.toLocaleLowerCase()

/** "  quick   weekday " → "Quick weekday" */
export function collectionName(text) {
  const name = String(text ?? '').trim().replace(/\s+/g, ' ')
  return name.charAt(0).toLocaleUpperCase() + name.slice(1)
}

/** True when the recipe is in the collection (names compare without case). */
export const inCollection = (recipe, name) => (recipe.collections ?? []).some((c) => key(c) === key(name))

/** Every collection in use: [{ name, count, recipes }], by name. */
export function allCollections(recipes = []) {
  const out = new Map()
  for (const r of recipes) {
    for (const c of r.collections ?? []) {
      if (!c) continue
      const k = key(c)
      if (!out.has(k)) out.set(k, { name: c, count: 0, recipes: [] })
      const entry = out.get(k)
      if (!entry.recipes.includes(r)) {
        entry.count++
        entry.recipes.push(r)
      }
    }
  }
  return [...out.values()].sort((a, b) => a.name.localeCompare(b.name))
}

/** The recipe's collections with `name` added, or taken out when it is there. */
export function toggleCollection(list = [], name) {
  const clean = collectionName(name)
  if (!clean) return list
  return list.some((c) => key(c) === key(clean)) ? list.filter((c) => key(c) !== key(clean)) : [...list, clean]
}

/** The recipe's collections with `from` renamed to `to` (or removed when `to` is empty), once. */
export function renameCollection(list = [], from, to) {
  const clean = collectionName(to)
  const out = []
  for (const c of list) {
    const next = key(c) === key(from) ? clean : c
    if (next && !out.some((o) => key(o) === key(next))) out.push(next)
  }
  return out
}
