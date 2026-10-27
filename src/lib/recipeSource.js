import { parseRecipeText } from './ingredients.js'

/**
 * Whether a parsed text is a recipe one can cook from without hearing the
 * video: three ingredients with amounts, two with amounts plus a step, or a
 * longer list (five or more) with at least two steps. "Recipe in bio",
 * hashtags or a single "2 eggs" don't count.
 */
export function usableRecipe(parsed) {
  if (!parsed) return false
  const withAmount = parsed.ingredients.filter((i) => i.quantity != null).length
  const steps = parsed.steps.length
  return withAmount >= 3 || (withAmount >= 2 && steps >= 1) || (parsed.ingredients.length >= 5 && steps >= 2)
}

/** The recipe found in the description or comments when it is usable on its own, else null. */
export function recipeInText({ description, comments, author }) {
  const picked = pickRecipe({ description, comments, author })
  return picked && picked.source !== 'transcript' && usableRecipe(picked) ? picked : null
}

/**
 * Picks the text that holds the recipe: the description, a comment (often the
 * author's pinned one: "recipe in the comments"), or the transcript.
 * Returns { ingredients, steps, source, text } or null.
 */
export function pickRecipe({ description, comments = [], author, transcript }) {
  const candidates = []
  if (description) candidates.push({ text: description, source: 'description', bonus: 1 })
  for (const c of comments) {
    const byAuthor = !!author && c.author === author
    candidates.push({
      text: c.text,
      source: byAuthor ? "author's comment" : `comment by ${c.author ?? 'someone'}`,
      bonus: (byAuthor ? 2 : 0) + (c.pinned ? 1 : 0),
      minIngredients: 2, // a stray "2 eggs?" reply is not a recipe
    })
  }

  let best = null
  for (const c of candidates) {
    const parsed = parseRecipeText(c.text)
    if (parsed.ingredients.length < (c.minIngredients ?? 1)) continue
    const score = parsed.ingredients.length * 3 + parsed.steps.length + c.bonus
    if (!best || score > best.score) best = { ...parsed, source: c.source, text: c.text, score }
  }
  const heard = transcript ? readTranscript(transcript) : null
  // A thin caption ("2 eggs and love") loses to a transcript that holds more
  if (best && !(heard && !usableRecipe(best) && heard.ingredients.length > best.ingredients.length)) {
    const { score: _score, ...rest } = best
    return rest
  }
  if (heard) return heard
  return description ? { ...parseRecipeText(description), source: 'description', text: description } : null
}

/** Spoken recipes come as one paragraph; one sentence per line reads better. */
function readTranscript(transcript) {
  const text = transcript.replace(/([.!?])\s+/g, '$1\n')
  return { ...parseRecipeText(text), source: 'transcript', text: transcript }
}

/**
 * The recipe with what only the video names added: ingredients not yet in the
 * list (compared by `canonical` name) go at the end, and the heard steps are
 * used when the recipe has none. Editable shapes ({ ingredients, steps text }).
 */
export function addFromTranscript(current, heard, canonical = (n) => n.trim().toLowerCase()) {
  const have = new Set(current.ingredients.filter((i) => i.name?.trim()).map((i) => canonical(i.name)))
  const extra = heard.ingredients.filter((i) => i.name?.trim() && !have.has(canonical(i.name))).map((i) => ({ ...i, group: '' }))
  const ingredients = [...current.ingredients.filter((i) => i.name?.trim() || i.qty), ...extra]
  const steps = current.steps?.trim() ? current.steps : heard.steps
  return { ingredients, steps, added: extra.length, addedSteps: steps !== current.steps }
}
