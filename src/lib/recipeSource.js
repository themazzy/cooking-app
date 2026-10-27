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

// What a screenshot of Instagram, TikTok, Facebook or YouTube shows around a comment:
// buttons, times, like counts, "Liked by creator" (English, Czech, Bulgarian, German)
const SCREEN_NOISE = [
  /^(reply|replies|odpov[eě]d[eě]t|отговор(и|ете)?|antworten|see translation|zobrazit p[řr]eklad|вижте превода|[üu]bersetzung anzeigen|hide replies|skr[ýy]t odpov[eě]di|скриване на отговорите|see more|more|v[íi]ce|още|mehr|edited|upraveno|редактирано|author|autor|автор|pinned|připnuto|закачено|creator|liked by (the )?(author|creator)|se zalíbilo autorovi|харесано от автора|translate|přeložit|преведи)$/iu,
  /^(view|zobrazit|вижте|show|alle)\b.{0,30}\b(repl|odpov|отговор|antwort)/iu,
  /^\d+([.,]\d+)?\s*[kKmM]?\s*(likes?|to se mi líbí|líbí se|харесвания|харесване|gefällt|odpovědi|replies)?$/iu,
  /^\d{1,3}\s*(s|m|min|h|hod|d|dn[íy]?|w|t|týd|wk|y|r|ч|д|седм|мин)\.?(\s+ago|\s+zpět)?$/iu,
  /^(just now|právě teď|току-що|gerade eben|yesterday|včera|вчера|gestern)$/iu,
  // "chef.maria 2h", "chef.maria · 3 d", "@chef_maria • Author"
  /^@?[\w.]{2,30}\s*[·•]?\s*(\d{1,3}\s*(s|m|h|d|w|t|y|r|ч|д)\.?|author|autor|автор|creator)\s*([·•]\s*)?(author|autor|автор|creator)?$/iu,
  // A bare handle needs a handle's look ("chef.maria", "@cook_99"), so "salt" stays
  /^(@[\w.]{2,30}|[a-z][a-z\d]*[._\d][\w.]*)$/u,
]
const STATUS_LINE = /^\s*\d{1,2}[:.]\d{2}\b[^\p{L}]{0,30}$/u

/**
 * The comment text from a screenshot's lines, without the app's buttons,
 * times, counts and user names around it. Lines that read as a recipe stay
 * (a lone word like "salt" is not taken for a user name).
 */
export function commentFromScreenshot(text) {
  return (text ?? '')
    .split(/\r?\n/)
    .map((l) => l.replace(/[♡♥❤️🤍]+\s*$/u, '').trim())
    .filter((l) => !STATUS_LINE.test(l) && !SCREEN_NOISE.some((re) => re.test(l)))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * A recipe's saved source texts with more added: a description or transcript
 * only fills in when the recipe has none, and comments are added after its own.
 */
export function addRaw(raw = {}, more = {}) {
  return {
    description: raw.description ?? more.description ?? null,
    transcript: raw.transcript ?? more.transcript ?? null,
    comments: [...(raw.comments ?? []), ...(more.comments ?? [])],
  }
}
