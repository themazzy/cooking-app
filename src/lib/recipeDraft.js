import { pickRecipe } from './recipeSource.js'
import { toEditable } from './recipeEdit.js'
import { detectServings, tagsFromHashtags, timeFromSteps, timesFromText } from './recipeMeta.js'

export { detectServings }

/** A readable title: the first line that is not just hashtags or emoji. */
export function titleFrom(text, fallback) {
  for (const line of (text ?? '').split('\n')) {
    const t = line.replace(/#\S+/g, '').replace(/[^\p{L}\p{N}\s,.'’&()-]/gu, '').replace(/\s+/g, ' ').trim()
    if (t.length >= 3) return t.length > 80 ? `${t.slice(0, 77)}…` : t
  }
  return fallback
}

/**
 * Prep, cook and total minutes: the website's data, else times written in the
 * recipe text, else the step times added up as the cooking time (estimated).
 */
export function detectTimes(result, picked, steps) {
  const fields = ['prepMin', 'cookMin', 'totalMin']
  const out = { prepMin: null, cookMin: null, totalMin: null, timesEstimated: false }
  for (const found of [result.meta, timesFromText(picked?.text), timesFromText(result.description)]) {
    for (const f of fields) out[f] ??= found?.[f] ?? null
  }
  if (fields.every((f) => out[f] == null)) {
    out.cookMin = timeFromSteps(steps)
    out.timesEstimated = out.cookMin != null
  }
  return out
}

/** A recipe ready to edit, from what an import (or paste) found. */
export function draftFromImport(result) {
  const picked = pickRecipe(result)
  const editable = toEditable(picked)
  const tags = tagsFromHashtags([result.description, picked?.text].filter(Boolean).join('\n'))
  return {
    id: null,
    title: titleFrom(result.description, result.author ? `Recipe from ${result.author}` : 'New recipe'),
    sourceUrl: result.url ?? null,
    platform: result.platform ?? null,
    author: result.author ?? null,
    servings: result.meta?.servings ?? detectServings(picked?.text) ?? detectServings(result.description) ?? detectServings(result.transcript),
    ingredients: editable.ingredients,
    steps: editable.steps,
    categories: result.meta?.categories?.length ? result.meta.categories : tags.categories,
    cuisine: result.meta?.cuisine ?? tags.cuisine,
    ...detectTimes(result, picked, editable.steps),
    source: picked?.source ?? null,
    raw: { description: result.description ?? null, transcript: result.transcript ?? null, comments: result.comments ?? [] },
    video: null,
    // The website's own picture, shown when there is no photo or video
    image: result.image ?? null,
  }
}
