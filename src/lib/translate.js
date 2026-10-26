import { registerPlugin } from '@capacitor/core'
import { canFetchCrossSite } from './http.js'

// Recipes in other languages translated on the phone with Google ML Kit
// (TranslatorPlugin.java): free, offline once a language's model (~30 MB) has
// downloaded. The website has no translator, so recipes stay as imported there.

const Translator = registerPlugin('Translator')

export const TARGETS = { en: 'English', cs: 'Czech', bg: 'Bulgarian' }

export const canTranslate = () => canFetchCrossSite()

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

/** The recipe's language from its own text: "de", or null when unsure. */
export async function detectLanguage(recipe) {
  const text = recipeTexts(recipe).join('\n').slice(0, 2000)
  if (text.length < 10) return null
  const { language } = await Translator.identify({ text })
  return language && language !== 'und' ? language.split('-')[0] : null
}

/**
 * The recipe translated into `to`, keeping the untranslated texts in
 * `original` so the recipe page can switch back. `from` is detected when not
 * given. Returns null when there is nothing to translate.
 */
export async function translateRecipe(recipe, to, { from = null, onStep = () => {} } = {}) {
  const lang = from ?? (await detectLanguage(recipe))
  if (!lang || lang === to) return null
  const status = await Translator.status({ from: lang, to })
  if (!status.supported) throw new Error(`${languageName(lang)} can't be translated on the phone.`)
  onStep(
    status.downloaded
      ? `Translating from ${languageName(lang)} to ${languageName(to)}…`
      : `Downloading the ${languageName(lang)} → ${languageName(to)} translator (about 30 MB, only once)…`,
  )
  const texts = recipeTexts(recipe)
  const { texts: done } = await Translator.translate({ from: lang, to, texts })
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
