import { registerPlugin } from '@capacitor/core'
import { capitalizeName, tidyIngredient } from './ingredients.js'
import { canFetchCrossSite, getText, postForm } from './http.js'
import { decodeEntities } from './reel/html.js'

// Recipes in other languages translated into English, Czech or Bulgarian, for
// free. On phones with Gemini Nano (Android AICore) the whole recipe is
// translated on the phone (TranslatorPlugin.java); everywhere else Google
// Translate's free web endpoint does it. That endpoint is unofficial and can
// refuse (a captcha, a limit), so MyMemory's free API (about 5000 characters
// a day, no key) is the last resort. Either way the result is saved with the
// recipe, so it is translated only once.

const Translator = registerPlugin('Translator')
const GOOGLE = 'https://translate.googleapis.com/translate_a/single?client=gtx&dt=t'
const MYMEMORY = 'https://api.mymemory.translated.net/get'

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
    // A unit the parser didn't know can come back in the name: "tablespoon of cornstarch"
    ingredients: (recipe.ingredients ?? []).map((i) => {
      const row = tidyIngredient({ ...i, name: tr(i.name), group: tr(i.group) })
      return { ...row, name: capitalizeName(row.name) }
    }),
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

/** A text cut at sentence ends (or spaces) into pieces of at most `max` characters. */
export function pieces(text, max) {
  const out = []
  let rest = text.trim()
  while (rest.length > max) {
    const head = rest.slice(0, max)
    const cut = Math.max(head.lastIndexOf('. '), head.lastIndexOf('! '), head.lastIndexOf('? '), head.lastIndexOf('; '))
    const at = cut > max / 3 ? cut + 1 : head.lastIndexOf(' ') > max / 3 ? head.lastIndexOf(' ') : max
    out.push(rest.slice(0, at).trim())
    rest = rest.slice(at).trim()
  }
  if (rest) out.push(rest)
  return out
}

async function myMemoryText(q, from, to) {
  const url = `${MYMEMORY}?q=${encodeURIComponent(q)}&langpair=${from}|${to}`
  const data = canFetchCrossSite() ? JSON.parse((await getText(url, { allowError: true })).text) : await (await fetch(url)).json()
  if (Number(data?.responseStatus) !== 200) throw new Error(`MyMemory: ${data?.responseDetails || data?.responseStatus || 'no answer'}`)
  return decodeEntities(data.responseData?.translatedText ?? '')
}

/** Texts translated with MyMemory, a few lines per request (it takes 500 bytes at most). */
async function myMemory(texts, from, to) {
  // Cyrillic and accented letters take two bytes, so pieces stay well under the limit
  const parts = texts.map((t) => pieces(t.replace(/\n/g, ' '), 200))
  const flat = parts.flat()
  const done = []
  for (const batch of batches(flat, 200)) {
    const lines = batch.map((n) => flat[n])
    let out = (await myMemoryText(lines.join('\n'), from, to)).split('\n')
    if (out.length !== lines.length) {
      out = []
      for (const line of lines) out.push(await myMemoryText(line, from, to))
    }
    done.push(...out.map((l, i) => l.trim() || lines[i]))
  }
  let n = 0
  return parts.map((p) => done.slice(n, (n += p.length)).join(' '))
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
let nanoReason = null
export async function nanoStatus() {
  if (!canFetchCrossSite()) {
    nanoReason = 'Only the Android app can use Gemini Nano'
    return 'unavailable'
  }
  if (nanoState === 'available' || nanoState === 'unavailable') return nanoState
  try {
    const answer = await Translator.nanoStatus()
    nanoState = answer.status
    nanoReason = answer.reason ?? null
  } catch (err) {
    nanoState = 'unavailable'
    nanoReason = err?.message ?? String(err)
  }
  return nanoState
}
/** Why Gemini Nano is not available on this phone, after nanoStatus(); null when it is. */
export const nanoUnavailableReason = () => nanoReason

/** A short line translated with Gemini Nano, for the check in Settings: { text, ms }. */
export async function tryNano(text = 'Hladká mouka, 2 lžíce másla', from = 'cs', to = 'en') {
  const started = Date.now()
  const [out] = await nano([text], from, to)
  return { text: out, ms: Date.now() - started }
}

// Which service did the last translateTexts(): saved with the recipe as translatedBy
let lastEngine = null

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
  const done = await translateTexts(texts, lang, to, onStep)
  const map = new Map(texts.map((t, n) => [t, done[n] ?? t]))
  const out = applyTranslation(recipe, map)
  return {
    ...out,
    lang: to,
    translatedBy: lastEngine,
    // A recipe read through English (an unknown language) keeps its real original
    original: recipe.original ?? { lang, title: recipe.title, ingredients: recipe.ingredients, steps: recipe.steps },
    translatedFrom: recipe.original ? null : pairsOf(recipe, out, to),
  }
}

/**
 * Which text each translated text came from: { lang, map: { translated: source } }.
 * Saved with the recipe, so translating again can tell the lines the cook
 * edited (not in the map) from the ones still as the translation made them.
 */
export function pairsOf(source, translated, lang) {
  const map = {}
  const add = (t, s) => {
    if (t?.trim() && s?.trim() && !(t.trim() in map)) map[t.trim()] = s.trim()
  }
  for (const [t, s] of alignTexts(translated, source)) add(t, s)
  return { lang, map }
}

/** [text, text at the same place in `other`] for the title, ingredient names and groups, and step lines that line up. */
export function alignTexts(recipe, other) {
  const out = [[recipe.title, other.title]]
  const a = recipe.ingredients ?? []
  const b = other.ingredients ?? []
  if (a.length === b.length) a.forEach((i, n) => out.push([i.name, b[n].name], [i.group, b[n].group]))
  const lines = (r) => (r.steps ?? '').split('\n').filter((l) => l.trim())
  const sa = lines(recipe)
  const sb = lines(other)
  if (sa.length === sb.length) sa.forEach((l, n) => out.push([l, sb[n]]))
  return out.filter(([x, y]) => x?.trim() && y?.trim())
}

/** Czech or Bulgarian letters in a short line the language detector was unsure about. */
function lettersLanguage(text) {
  if (/[\u0400-\u04ff]/.test(text)) return 'bg'
  if (/[ěščřžůťďň]/i.test(text)) return 'cs'
  return null
}

/** The language of one line the cook typed: "cs", or null when unsure. */
export async function lineLanguage(text) {
  try {
    if (canFetchCrossSite()) {
      const { language } = await Translator.identify({ text })
      if (language && language !== 'und') return language.split('-')[0]
      return lettersLanguage(text)
    }
    // The website asks Google, but only about lines with letters English has not
    const letters = lettersLanguage(text)
    if (letters || !/[^\x00-\x7f]/.test(text)) return letters
    const { lang } = await google([text], null, 'en')
    if (lang && lang !== 'und') return lang.split('-')[0]
  } catch {
    // Unsure: guessed from its letters below
  }
  return lettersLanguage(text)
}

/**
 * A translated recipe translated again from its original, keeping what the
 * cook changed: lines still as the last translation made them are translated
 * afresh, edited or added lines stay (or are translated, when they were typed
 * in another language, such as steps pasted from the website). The original
 * follows the edits, so switching languages shows them too.
 */
export async function translateAgain(recipe, to, { onStep = () => {}, translate = translateTexts, detect = lineLanguage } = {}) {
  const from = recipe.original?.lang
  if (!from || recipe.lang !== to) return null
  const known = recipe.translatedFrom?.lang === to ? (recipe.translatedFrom.map ?? {}) : {}
  // Older recipes saved no pairs: all their lines count as edited (kept), and
  // their original lines up by place, where it still does
  const older = !Object.keys(known).length
  const byPlace = new Map(alignTexts(recipe, recipe.original).map(([t, s]) => [t.trim(), s.trim()]))
  const texts = recipeTexts(recipe)
  const fromSource = texts.filter((t) => known[t])
  const edited = texts.filter((t) => !known[t])

  const shown = new Map() // current text → new text in `to`
  const source = new Map() // current text → text in the original's language
  let engine = recipe.translatedBy ?? null

  if (fromSource.length) {
    const sources = fromSource.map((t) => known[t])
    const done = await translate(sources, from, to, onStep)
    engine = lastEngine ?? engine
    fromSource.forEach((t, n) => {
      shown.set(t, done[n] ?? t)
      source.set(t, sources[n])
    })
  }

  // Edited lines: translated when typed in another language, else kept as they are
  const langs = await Promise.all(edited.map((t) => detect(t)))
  const kept = []
  const foreign = new Map() // lang → texts
  edited.forEach((t, n) => {
    const lang = langs[n]
    if (lang && lang !== to) foreign.set(lang, [...(foreign.get(lang) ?? []), t])
    else kept.push(t)
  })
  for (const [lang, group] of foreign) {
    try {
      const done = await translate(group, lang, to, onStep)
      engine = lastEngine ?? engine
      group.forEach((t, n) => {
        shown.set(t, done[n] ?? t)
        // Typed in the original's language: that is its original text
        if (lang === from) source.set(t, t)
      })
    } catch {
      kept.push(...group)
    }
  }
  for (const t of kept) shown.set(t, t)

  // The original of an edited line: what stood in its place before, unless the cook changed it there
  for (const t of edited) if (!source.has(t) && older && byPlace.has(t)) source.set(t, byPlace.get(t))
  const back = edited.filter((t) => !source.has(t))
  if (back.length) {
    try {
      const done = await translate(back, to, from, () => {})
      back.forEach((t, n) => source.set(t, done[n] ?? t))
    } catch {
      for (const t of back) source.set(t, t)
    }
  }

  const out = applyTranslation(recipe, shown)
  const orig = applyTranslation(recipe, source)
  const original = { lang: from, title: orig.title, ingredients: orig.ingredients, steps: orig.steps }
  return { ...out, lang: to, translatedBy: engine, original, translatedFrom: pairsOf(original, out, to) }
}

/** Texts translated with Gemini Nano on the phone, else Google Translate, else MyMemory. Same order. */
export async function translateTexts(texts, from, to, onStep = () => {}) {
  if ((await nanoStatus()) === 'available') {
    onStep(`Translating from ${languageName(from)} with Gemini Nano on the phone…`)
    try {
      const done = await nano(texts, from, to)
      lastEngine = 'Gemini Nano'
      return done
    } catch (err) {
      onStep(`Gemini Nano could not translate it (${err?.message ?? err}), using Google Translate.`)
    }
  }
  onStep(`Translating from ${languageName(from)} with Google Translate…`)
  try {
    const done = []
    for (const batch of batches(texts, 4000)) done.push(...(await google(batch.map((n) => texts[n]), from, to)).texts)
    lastEngine = 'Google Translate'
    return done
  } catch (err) {
    onStep(`Google Translate refused (${err?.message ?? err}), trying MyMemory…`)
    const done = await myMemory(texts, from, to)
    lastEngine = 'MyMemory'
    return done
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
