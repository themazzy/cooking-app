import { pickRecipe } from './recipeSource.js'
import { toEditable } from './recipeEdit.js'

const NUM_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, eight: 8, dva: 2, dvě: 2, tři: 3, čtyři: 4, pět: 5, šest: 6 }
const N = '(\\d{1,2}|one|two|three|four|five|six|eight|dva|dvě|tři|čtyři|pět|šest)'
const SERVINGS = [
  new RegExp(`\\b(?:serves|servings?|portions?|porce|porcí|yield)\\s*[:\\-]?\\s*${N}\\b`, 'iu'),
  new RegExp(`\\b${N}\\s*(?:servings?|portions?|people|persons|porc[eíi]|osob[ya]?|lidi)\\b`, 'iu'),
  new RegExp(`\\b(?:for|pro|na)\\s+${N}\\s*(?:servings?|portions?|people|persons|porc[eíi]|osob[ya]?|lidi)?\\b(?=[\\s:.,)]|$)`, 'iu'),
]

/** Number of portions mentioned in a recipe text, or null. */
export function detectServings(text) {
  if (!text) return null
  for (const re of SERVINGS) {
    const m = text.match(re)
    if (m) {
      const v = m[1].toLowerCase()
      const n = NUM_WORDS[v] ?? Number(v)
      if (n > 0 && n <= 30) return n
    }
  }
  return null
}

/** A readable title: the first line that is not just hashtags or emoji. */
export function titleFrom(text, fallback) {
  for (const line of (text ?? '').split('\n')) {
    const t = line.replace(/#\S+/g, '').replace(/[^\p{L}\p{N}\s,.'’&()-]/gu, '').replace(/\s+/g, ' ').trim()
    if (t.length >= 3) return t.length > 80 ? `${t.slice(0, 77)}…` : t
  }
  return fallback
}

/** A recipe ready to edit, from what an import (or paste) found. */
export function draftFromImport(result) {
  const picked = pickRecipe(result)
  const editable = toEditable(picked)
  return {
    id: null,
    title: titleFrom(result.description, result.author ? `Recipe from ${result.author}` : 'New recipe'),
    sourceUrl: result.url ?? null,
    platform: result.platform ?? null,
    author: result.author ?? null,
    servings: detectServings(picked?.text) ?? detectServings(result.description) ?? detectServings(result.transcript),
    ingredients: editable.ingredients,
    steps: editable.steps,
    source: picked?.source ?? null,
    raw: { description: result.description ?? null, transcript: result.transcript ?? null, comments: result.comments ?? [] },
    video: null,
    // The website's own picture, shown when there is no photo or video
    image: result.image ?? null,
  }
}
