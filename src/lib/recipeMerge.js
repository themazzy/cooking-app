// Joins two versions of a recipe that were changed on two phones (or on one
// phone while the other's change arrived), so neither change is lost.
//   base    the version both started from (null when unknown)
//   mine    this phone's version
//   theirs  the other version
// A field changed on one side only takes that side's value. A field changed on
// both takes the newer one (updatedAt). The cooking history is joined entry
// by entry (by the time it was cooked) and ratings person by person, so two
// people adding entries or rating at once both keep theirs.

// Kept by each phone for itself, never merged
const LOCAL_ONLY = new Set(['updatedAt', 'syncedAt', 'syncBase', 'photo'])

function same(a, b) {
  if (a === b) return true
  if (a == null || b == null) return a == null && b == null
  if (typeof a !== 'object' || typeof b !== 'object') return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  const ka = Object.keys(a).filter((k) => a[k] !== undefined)
  const kb = Object.keys(b).filter((k) => b[k] !== undefined)
  return ka.length === kb.length && ka.every((k) => same(a[k], b[k]))
}

/** One value from three: the side that changed it, or `newer` when both did. */
function pick(base, mine, theirs, mineNewer) {
  if (same(mine, theirs)) return mine
  if (same(mine, base)) return theirs
  if (same(theirs, base)) return mine
  return mineNewer ? mine : theirs
}

/** Entries by key: added on either side stay, removed on either side go, changed ones as `pick`. */
function mergeKeyed(base, mine, theirs, mineNewer) {
  const keys = new Set([...Object.keys(mine), ...Object.keys(theirs)])
  const out = {}
  for (const k of keys) {
    const v = pick(base?.[k], mine[k], theirs[k], mineNewer)
    if (v !== undefined) out[k] = v
  }
  return out
}

const byAt = (list) => Object.fromEntries((list ?? []).map((c) => [String(c.at), c]))

/** The cooking history from both: entries added on either phone, minus ones removed. */
export function mergeCooked(base, mine, theirs, mineNewer = true) {
  // Without a base nothing is known to be removed: everything stays
  const b = base ? byAt(base) : null
  const joined = mergeKeyed(b, byAt(mine), byAt(theirs), mineNewer)
  return Object.values(joined).sort((x, y) => x.at - y.at)
}

/** Ratings per person: { who: stars } */
export const mergeRatings = (base, mine, theirs, mineNewer = true) => mergeKeyed(base ?? null, mine ?? {}, theirs ?? {}, mineNewer)

export function mergeRecipe(base, mine, theirs) {
  const mineNewer = (mine.updatedAt ?? 0) >= (theirs.updatedAt ?? 0)
  const out = {}
  const keys = new Set([...Object.keys(mine), ...Object.keys(theirs)].filter((k) => !LOCAL_ONLY.has(k)))
  for (const k of keys) {
    let v
    if (k === 'cooked') v = mergeCooked(base?.cooked ?? (base ? [] : null), mine.cooked, theirs.cooked, mineNewer)
    else if (k === 'ratings') v = mergeRatings(base ? (base.ratings ?? {}) : null, mine.ratings, theirs.ratings, mineNewer)
    else if (base) v = pick(base[k], mine[k], theirs[k], mineNewer)
    else v = mineNewer ? mine[k] : theirs[k]
    if (v !== undefined) out[k] = v
  }
  // The photo shown on screen goes with the photo version that won
  if ('photo' in mine && out.photoKey === mine.photoKey) out.photo = mine.photo
  return out
}
