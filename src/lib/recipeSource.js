import { parseRecipeText } from './ingredients.js'

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
  if (best) {
    const { score: _score, ...rest } = best
    return rest
  }
  if (transcript) {
    // Spoken recipes come as one paragraph; one sentence per line reads better
    const text = transcript.replace(/([.!?])\s+/g, '$1\n')
    return { ...parseRecipeText(text), source: 'transcript', text: transcript }
  }
  return description ? { ...parseRecipeText(description), source: 'description', text: description } : null
}
