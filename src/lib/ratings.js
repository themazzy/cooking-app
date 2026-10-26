// Each person rates a recipe on their own: recipe.ratings = { who: stars }.
// `who` is the account id; on a login the household shares, the name set on
// the phone (Settings) is added after a colon, so two people on one account
// still rate separately: "uid:Jan". Recipes rated before this have one
// `rating` for everyone, shown until someone rates again.

/** Who rates on this phone. */
export const raterId = (userId, name = '') => {
  const n = name.trim()
  return `${userId ?? 'me'}${n ? `:${n}` : ''}`
}

/** The name in a rater id, if the phone set one. */
export const raterName = (who) => (who.includes(':') ? who.slice(who.indexOf(':') + 1) : null)

const entries = (recipe) => Object.entries(recipe?.ratings ?? {}).filter(([, v]) => v)

export function myRating(recipe, me) {
  const mine = recipe?.ratings?.[me]
  if (mine) return mine
  return entries(recipe).length ? null : (recipe?.rating ?? null)
}

/** The ratings of everyone else: [{ who, name, stars }] */
export const otherRatings = (recipe, me) =>
  entries(recipe)
    .filter(([who]) => who !== me)
    .map(([who, stars]) => ({ who, name: raterName(who), stars }))

/** The household's average (one decimal), for the list and sorting. */
export function averageRating(recipe) {
  const all = entries(recipe).map(([, v]) => v)
  if (!all.length) return recipe?.rating ?? null
  return Math.round((all.reduce((a, b) => a + b, 0) / all.length) * 10) / 10
}

/** The patch that sets (or with null, clears) this person's rating. The old shared rating goes. */
export function ratePatch(recipe, me, stars) {
  const { [me]: _old, ...rest } = recipe?.ratings ?? {}
  return { ratings: stars ? { ...rest, [me]: stars } : rest, rating: null }
}
