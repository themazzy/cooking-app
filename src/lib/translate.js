import { registerPlugin } from '@capacitor/core'
import { canFetchCrossSite, postForm } from './http.js'

// Recipes in other languages translated into English, Czech or Bulgarian, for
// free. On phones with Gemini Nano (Android AICore) the whole recipe is
// translated on the phone (TranslatorPlugin.java); everywhere else Google
// Translate's free web endpoint does it. Either way the result is saved with
// the recipe, so it is translated only once.

const Translator = registerPlugin('Translator')
const GOOGLE = 'https://translate.googleapis.com/translate_a/single?client=gtx&dt=t'

export const TARGETS = { en: 'English', cs: 'Czech', bg: 'Bulgarian' }

const names = typeof Intl.DisplayNames === 'function' ? new Intl.DisplayNames(['en'], { type: 'language' }) : null
/** "German" for "de". */
export function languageName(code) {
  if (!code) return 'another language'
  try {
    return TARGETS[code] ?? names?.of(code) ?? code
  } catch {
    return code
  }
}

/** The texts of a recipe that get translated, in a fixed order, without repeats or blanks. */
export function recipeTexts(recipe) {
  const out = new Set()
  const add = (s) => s?.trim() && out.add(s.trim())
  add(recipe.title)
  for (const i of recipe.ingredients ?? []) {
    add(i.name)
    add(i.group)
  }
  for (const line of (recipe.steps ?? '').split('\n')) add(line)
  return [...out]
}

/** The recipe with its texts swapped for translations (a Map of original → translated). Amounts and units stay. */
export function applyTranslation(recipe, map) {
  const tr = (s) => (s?.trim() ? (map.get(s.trim()) ?? s) : s)
  return {
    ...recipe,
    title: tr(recipe.title),
    ingredients: (recipe.ingredients ?? []).map((i) => ({ ...i, name: tr(i.name), group: tr(i.group) })),
    steps: (recipe.steps ?? '')
      .split('\n')
      .map((line) => tr(line))
      .join('\n'),
  }
}

/** Splits texts into batches of about `max` characters, each a list of indexes. */
export function batches(texts, max) {
  const out = []
  let cur = []
  let size = 0
  texts.forEach((t, n) => {
    if (cur.length && size + t.length > max) {
      out.push(cur)
      cur = []
      size = 0
    }
    cur.push(n)
    size += t.length + 6
  })
  if (cur.length) out.push(cur)
  return out
}

/** Google Translate's answer as lines: [[["Line 1\n", "Řádek 1\n", …], …], null, "cs", …]. */
export function googleLines(data) {
  return (data?.[0] ?? [])
    .map((seg) => seg?.[0] ?? '')
    .join('')
    .split('\n')
}

async function google(texts, from, to) {
  const url = `${GOOGLE}&sl=${from ?? 'auto'}&tl=${to}`
  const q = texts.map((t) => t.replace(/\n/g, ' ')).join('\n')
  let text
  if (canFetchCrossSite()) {
    const res = await postForm(url, { q })
    if (res.status >= 400) throw new Error(`Google Translate answered ${res.status}`)
    text = res.text
  } else {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ q }) })
    if (!res.ok) throw new Error(`Google Translate answered ${res.status}`)
    text = await res.text()
  }
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Google Translate did not answer (it may be limiting requests, try again later)')
  }
  const lines = googleLines(data)
  return { texts: texts.map((t, n) => lines[n]?.trim() || t), lang: data?.[2] ?? null }
}

/** The prompt asking Gemini Nano to translate numbered lines. */
export function nanoPrompt(texts, from, to) {
  return [
    `Translate these lines of a cooking recipe from ${languageName(from)} to ${languageName(to)}.`,
    `Use the words a ${languageName(to)} cookbook would use for ingredients and cooking steps.`,
    'Keep numbers, amounts and units. Each line starts with its number and "|": keep the number and "|", translate only the text after it.',
    'Answer with the translated lines only, nothing else.',
    '',
    ...texts.map((t, n) => `${n + 1}| ${t.replace(/\n/g, ' ')}`),
  ].join('\n')
}

/** Gemini Nano's numbered answer back in order; null when lines are missing. */
export function nanoLines(answer, count) {
  const out = new Array(count).fill(null)
  for (const line of (answer ?? '').split('\n')) {
    const m = line.match(/^\s*(\d+)\s*[|.):]\s*(.*)$/)
    if (m && m[1] - 1 < count && m[2].trim()) out[m[1] - 1] = m[2].trim()
  }
  return out.filter(Boolean).length >= count * 0.9 ? out : null
}

async function nano(texts, from, to) {
  const out = []
  for (const batch of batches(texts, 1500)) {
    const part = batch.map((n) => texts[n])
    const { text } = await Translator.generate({ prompt: nanoPrompt(part, from, to) })
    const lines = nanoLines(text, part.length)
    if (!lines) throw new Error('Gemini Nano gave an incomplete translation')
    lines.forEach((l, i) => out.push(l ?? part[i]))
  }
  return out
}

/** "available" when this phone can translate with Gemini Nano. Asked once per app start. */
let nanoState = null
export async function nanoStatus() {
  if (!canFetchCrossSite()) return 'unavailable'
  if (nanoState === 'available' || nanoState === 'unavailable') return nanoState
  try {
    nanoState = (await Translator.nanoStatus()).status
  } catch {
    nanoState = 'unavailable'
  }
  return nanoState
}

/** The recipe's language from its own text: "de", or null when unsure. */
export async function detectLanguage(recipe) {
  const text = recipeTexts(recipe).join('\n').slice(0, 2000)
  if (text.length < 10) return null
  if (canFetchCrossSite()) {
    const { language } = await Translator.identify({ text })
    return language && language !== 'und' ? language.split('-')[0] : null
  }
  // The website has no on-device detection: ask Google with a short sample
  const { lang } = await google([text.slice(0, 300)], null, 'en')
  return lang && lang !== 'und' ? lang.split('-')[0] : null
}

/**
 * The recipe translated into `to`, keeping the untranslated texts in
 * `original` so the recipe page can switch back. `from` is detected when not
 * given. Returns null when there is nothing to translate.
 */
export async function translateRecipe(recipe, to, { from = null, onStep = () => {} } = {}) {
  const lang = from ?? (await detectLanguage(recipe))
  if (!lang || lang === to) return null
  const texts = recipeTexts(recipe)
  let done = null
  if ((await nanoStatus()) === 'available') {
    onStep(`Translating from ${languageName(lang)} with Gemini Nano on the phone…`)
    try {
      done = await nano(texts, lang, to)
    } catch (err) {
      onStep(`Gemini Nano could not translate it (${err?.message ?? err}), using Google Translate.`)
    }
  }
  if (!done) {
    onStep(`Translating from ${languageName(lang)} with Google Translate…`)
    done = []
    for (const batch of batches(texts, 4000)) done.push(...(await google(batch.map((n) => texts[n]), lang, to)).texts)
  }
  const map = new Map(texts.map((t, n) => [t, done[n] ?? t]))
  return {
    ...applyTranslation(recipe, map),
    lang: to,
    original: { lang, title: recipe.title, ingredients: recipe.ingredients, steps: recipe.steps },
  }
}

/** Switches a translated recipe between its translation and the original text (and back). */
export function swapOriginal(recipe) {
  const o = recipe.original
  if (!o) return recipe
  return {
    ...recipe,
    title: o.title,
    ingredients: o.ingredients,
    steps: o.steps,
    lang: o.lang,
    original: { lang: recipe.lang, title: recipe.title, ingredients: recipe.ingredients, steps: recipe.steps },
  }
}
