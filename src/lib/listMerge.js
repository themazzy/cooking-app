// Joins two edits of the shared shopping list (with its meal plan) made on
// different phones since they last agreed (`base`). A change on one side
// wins over no change on the other; where both changed the same thing, this
// phone's version wins. Items and recipes are matched by key, and each
// item's fields separately, so a tick on one phone and new amounts on the
// other both stay.

const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
const isObject = (x) => x != null && typeof x === 'object' && !Array.isArray(x)

const KEYED = { items: (i) => i.key, recipes: (r) => r.id }

function mergeKeyed(base, mine, theirs, keyOf) {
  const index = (list) => new Map((Array.isArray(list) ? list : []).map((x) => [keyOf(x), x]))
  const b = index(base)
  const m = index(mine)
  const t = index(theirs)
  // This phone's order, then what only the other phone has
  const keys = [...new Set([...m.keys(), ...t.keys()])]
  return keys.map((k) => merge3(b.get(k), m.get(k), t.get(k))).filter((x) => x !== undefined)
}

function merge3(base, mine, theirs, key = '') {
  if (same(mine, base)) return theirs
  if (same(theirs, base)) return mine
  if (KEYED[key] && Array.isArray(mine) && Array.isArray(theirs)) return mergeKeyed(base, mine, theirs, KEYED[key])
  if (isObject(mine) && isObject(theirs)) {
    const b = isObject(base) ? base : {}
    const out = {}
    for (const k of new Set([...Object.keys(mine), ...Object.keys(theirs)])) {
      const v = merge3(b[k], mine[k], theirs[k], k)
      if (v !== undefined) out[k] = v
    }
    return out
  }
  // Both changed, or one removed what the other changed: keep what is left, this phone's first
  return mine ?? theirs
}

/** The list with both phones' changes since `base`. Leaves `updatedAt` to the caller. */
export function mergeLists(base, mine, theirs) {
  const strip = (l) => {
    if (!l) return l
    const { updatedAt: _u, ...rest } = l
    return rest
  }
  return merge3(strip(base), strip(mine), strip(theirs)) ?? null
}
