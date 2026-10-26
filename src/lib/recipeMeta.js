// Categories, cuisine and prep/cook times of a recipe: lists to pick from,
// reading them from schema.org data or a caption, and formatting them.

export const DEFAULT_CATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Starter', 'Soup', 'Salad', 'Main', 'Side', 'Sauce', 'Dessert', 'Baking', 'Snack', 'Drink']

export const CUISINES = [
  'Czech', 'Slovak', 'Bulgarian', 'Hungarian', 'Polish', 'German', 'Austrian', 'British', 'French', 'Italian', 'Spanish', 'Portuguese', 'Greek',
  'Turkish', 'Middle Eastern', 'Indian', 'Chinese', 'Japanese', 'Korean', 'Thai', 'Vietnamese', 'Asian', 'Mexican', 'American', 'Mediterranean',
]

// Words sites and hashtags use for the names above (lower case, no "#")
const CATEGORY_WORDS = {
  Breakfast: ['breakfast', 'brunch', 'snídaně', 'snidane', 'закуска'],
  Lunch: ['lunch', 'oběd', 'obed'],
  Dinner: ['dinner', 'supper', 'večeře', 'vecere', 'вечеря'],
  Starter: ['starter', 'starters', 'appetizer', 'appetizers', 'předkrm', 'předkrmy', 'предястие'],
  Soup: ['soup', 'soups', 'polévka', 'polévky', 'polevka', 'супа', 'супи'],
  Salad: ['salad', 'salads', 'salát', 'saláty', 'salat', 'салата', 'салати'],
  Main: ['main', 'main course', 'main dish', 'mains', 'entree', 'entrée', 'hlavní jídlo', 'hlavní jídla', 'основно', 'основни ястия'],
  Side: ['side', 'side dish', 'sides', 'příloha', 'přílohy'],
  Sauce: ['sauce', 'sauces', 'omáčka', 'omáčky', 'dip', 'dressing'],
  Dessert: ['dessert', 'desserts', 'dezert', 'dezerty', 'moučník', 'moučníky', 'sladké', 'десерт', 'десерти'],
  Baking: ['baking', 'bread', 'cake', 'cakes', 'pečení', 'pečivo', 'koláč', 'koláče', 'dort', 'dorty', 'тесто'],
  Snack: ['snack', 'snacks', 'svačina', 'chuťovky', 'mezzi'],
  Drink: ['drink', 'drinks', 'beverage', 'cocktail', 'smoothie', 'nápoj', 'nápoje', 'напитка', 'напитки'],
}
const CUISINE_WORDS = {
  Czech: ['czech', 'česká', 'český', 'české', 'ceska'],
  Slovak: ['slovak', 'slovenská'],
  Bulgarian: ['bulgarian', 'bulharská', 'българска'],
  Hungarian: ['hungarian', 'maďarská'],
  Polish: ['polish', 'polská'],
  German: ['german', 'německá'],
  Austrian: ['austrian', 'rakouská'],
  British: ['british', 'english', 'anglická', 'britská'],
  French: ['french', 'francouzská'],
  Italian: ['italian', 'italská', 'италианска'],
  Spanish: ['spanish', 'španělská'],
  Portuguese: ['portuguese', 'portugalská'],
  Greek: ['greek', 'řecká', 'гръцка'],
  Turkish: ['turkish', 'turecká', 'турска'],
  'Middle Eastern': ['middle eastern', 'lebanese', 'arabic', 'blízkovýchodní', 'arabská', 'libanonská'],
  Indian: ['indian', 'indická'],
  Chinese: ['chinese', 'čínská'],
  Japanese: ['japanese', 'japonská'],
  Korean: ['korean', 'korejská'],
  Thai: ['thai', 'thajská'],
  Vietnamese: ['vietnamese', 'vietnamská'],
  Asian: ['asian', 'asijská'],
  Mexican: ['mexican', 'mexická', 'tex-mex'],
  American: ['american', 'americká'],
  Mediterranean: ['mediterranean', 'středomořská'],
}

const norm = (s) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/\s+(kuchyně|kuchyne|cuisine|food|kuchnia|кухня|recipes?|recepty?)$/u, '')
    .replace(/^(kuchyně|cuisine)\s+/u, '')
    .trim()

const lookup = (words) => {
  const map = new Map()
  for (const [name, list] of Object.entries(words)) for (const w of [name.toLowerCase(), ...list]) map.set(w, name)
  return map
}
const CATEGORY_MAP = lookup(CATEGORY_WORDS)
const CUISINE_MAP = lookup(CUISINE_WORDS)

/** "Hlavní jídla" → "Main"; unknown names come back tidied, or null. */
export function categoryName(s) {
  const n = norm(s)
  if (!n) return null
  return CATEGORY_MAP.get(n) ?? null
}
export function cuisineName(s) {
  const n = norm(s)
  if (!n) return null
  return CUISINE_MAP.get(n) ?? null
}

const capital = (s) => s.charAt(0).toLocaleUpperCase() + s.slice(1)
const list = (value) =>
  [].concat(value ?? []).flatMap((v) => String(v).split(/[,;|/]/)).map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean)

/** Categories from schema.org recipeCategory: known ones by our names, short unknown ones as given. */
export function categoriesFrom(value) {
  const out = []
  for (const s of list(value)) {
    const name = categoryName(s) ?? (s.length <= 24 && !/recept|recipe/i.test(s) ? capital(s) : null)
    if (name && !out.some((c) => c.toLowerCase() === name.toLowerCase())) out.push(name)
  }
  return out.slice(0, 3)
}

export function cuisineFrom(value) {
  for (const s of list(value)) {
    const name = cuisineName(s)
    if (name) return name
  }
  const first = list(value)[0]
  return first && first.length <= 24 ? capital(norm(first) || first) : null
}

/** Categories and a cuisine named by a caption's hashtags (#dessert, #italianfood). */
export function tagsFromHashtags(text) {
  const categories = []
  let cuisine = null
  for (const m of String(text ?? '').matchAll(/#([\p{L}-]+)/gu)) {
    const tag = m[1].toLowerCase()
    const c = CATEGORY_MAP.get(tag) ?? CATEGORY_MAP.get(tag.replace(/(recipes?|ideas?|time)$/, ''))
    if (c && !categories.includes(c)) categories.push(c)
    cuisine ??= CUISINE_MAP.get(tag) ?? CUISINE_MAP.get(tag.replace(/(food|cuisine|cooking|recipes?)$/, '')) ?? null
  }
  return { categories: categories.slice(0, 3), cuisine }
}

/** Minutes in a schema.org ISO 8601 duration ("PT1H30M", "P0DT0H20M"), or in plain text ("20 min"). */
export function durationMinutes(value) {
  if (value == null) return null
  const s = String(value).trim()
  const iso = s.match(/^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i)
  if (iso) {
    const [, d = 0, h = 0, m = 0, sec = 0] = iso.map((x) => Number(x ?? 0))
    const total = Math.round(d * 1440 + h * 60 + m + sec / 60)
    return total > 0 ? total : null
  }
  return textDuration(s)?.minutes ?? null
}

const NUM = '(\\d+(?:[.,]\\d+)?|½|půl|pul|half an?|an?)'
const HOURS = 'h|hrs?|hours?|hod(?:in[ay]?|iny)?\\.?|hodin[auy]?|час(?:а|ове)?|ч\\.?'
const MINS = 'm|min(?:s|ut[ay]?|utes?|uty)?\\.?|minut[ay]?|мин(?:ути?)?\\.?'
const value = (s) => {
  const v = s.toLowerCase()
  if (v === '½' || v === 'půl' || v === 'pul' || v.startsWith('half')) return 0.5
  if (v === 'a' || v === 'an') return 1
  return Number(v.replace(',', '.'))
}
const AMOUNT = new RegExp(`^${NUM}(?:\\s*(?:-|–|to|až|do)\\s*${NUM})?\\s*(${HOURS}|${MINS})(?![\\p{L}])`, 'iu')
const MORE_MINS = new RegExp(`^\\s*(?:and\\s+|a\\s+)?(\\d+)\\s*(?:${MINS})(?![\\p{L}])`, 'iu')

/** The duration at the start of `s` ("1 h 30 min", "20–25 minut", "1,5 hodiny"): { minutes, length }. */
export function textDuration(s) {
  const m = String(s ?? '').match(AMOUNT)
  if (!m) return null
  const isHours = new RegExp(`^(?:${HOURS})$`, 'iu').test(m[3])
  // A range counts at its upper end, like the cooking timers
  const n = value(m[2] ?? m[1])
  let minutes = isHours ? n * 60 : n
  let length = m[0].length
  if (isHours) {
    const more = s.slice(length).match(MORE_MINS)
    if (more) {
      minutes += Number(more[1])
      length += more[0].length
    }
  }
  minutes = Math.round(minutes)
  return minutes > 0 && minutes <= 72 * 60 ? { minutes, length } : null
}

// Labels that come before a time in a caption or a page ("Prep time: 15 min", "Doba pečení 40 minut")
const LABELS = {
  prepMin: ['prep(?:aration)?(?: time)?', 'příprava', 'doba přípravy', 'čas přípravy', 'приготвяне', 'подготовка', 'време за подготовка'],
  cookMin: ['cook(?:ing)?(?: time)?', 'bak(?:e|ing)(?: time)?', 'vaření', 'doba vaření', 'čas vaření', 'pečení', 'doba pečení', 'čas pečení', 'tepelná úprava', 'готвене', 'печене', 'време за готвене'],
  totalMin: ['total(?: time)?', 'ready in', 'celkem', 'celkový čas', 'celková doba', 'общо', 'общо време'],
}

/** { prepMin, cookMin, totalMin } written out in a recipe text; missing ones are null. */
export function timesFromText(text) {
  const out = { prepMin: null, cookMin: null, totalMin: null }
  for (const raw of String(text ?? '').split('\n')) {
    const line = raw.replace(/[⏱⏲🕐⌚⏰🔥🍳⌛⏳\uFE0F]/gu, ' ').trim()
    // In a step ("Cook 20 minutes until soft") a time is not the recipe's; there it needs a colon
    const sep = line.length <= 40 ? '(?:\\s*[:\\-–=]\\s*|\\s+)' : '\\s*[:\\-–=]\\s*'
    for (const [field, labels] of Object.entries(LABELS)) {
      if (out[field] != null) continue
      // Several can share a line: "Prep 10 min | Cook 20 min"
      const re = new RegExp(`(?:^|[\\s|,;•·(])(?:${labels.join('|')})${sep}(?:about\\s+|approx\\.?\\s+|cca\\.?\\s+|asi\\s+|около\\s+|~\\s*)?`, 'giu')
      for (const m of line.matchAll(re)) {
        const d = textDuration(line.slice(m.index + m[0].length))
        if (d) {
          out[field] = d.minutes
          break
        }
      }
    }
  }
  return out
}

const STEP_TIME = new RegExp(`(?:^|[^\\p{L}\\d])${NUM}(?:\\s*(?:-|–|to|až|do)\\s*${NUM})?\\s*(${HOURS}|${MINS})(?![\\p{L}])`, 'giu')

/** Rough cooking time: the times the steps mention, added up (minutes), or null. */
export function timeFromSteps(steps) {
  let total = 0
  for (const line of String(steps ?? '').split('\n')) {
    for (const m of line.matchAll(STEP_TIME)) {
      const d = textDuration(m[0].replace(/^[^\d½\p{L}]+/u, ''))
      if (d) total += d.minutes
    }
  }
  return total > 0 && total <= 24 * 60 ? total : null
}

/** Total minutes: the written total, else prep + cook. */
export const totalMinutes = (r) => r?.totalMin ?? (r?.prepMin != null || r?.cookMin != null ? (r.prepMin ?? 0) + (r.cookMin ?? 0) || null : null)

/** 95 → "1 h 35 min". */
export function formatMinutes(min) {
  if (min == null || !(min > 0)) return ''
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  if (!h) return `${m} min`
  return m ? `${h} h ${m} min` : `${h} h`
}

/** Categories used by any recipe, then the defaults, without duplicates. */
export function allCategories(recipes = []) {
  const seen = new Map()
  for (const r of recipes) for (const c of r.categories ?? []) if (c && !seen.has(c.toLowerCase())) seen.set(c.toLowerCase(), c)
  for (const c of DEFAULT_CATEGORIES) if (!seen.has(c.toLowerCase())) seen.set(c.toLowerCase(), c)
  return [...seen.values()]
}

export function allCuisines(recipes = []) {
  const used = recipes.map((r) => r.cuisine).filter((c) => c && !CUISINES.includes(c))
  return [...new Set([...CUISINES, ...used])].sort((a, b) => a.localeCompare(b))
}

// Portions: "Serves 4", "4–6 servings", "Porce: 4", "pro 6 osob", "Порции: 4", "за 4 човека"
const NUM_WORDS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, eight: 8,
  dva: 2, dvě: 2, tři: 3, čtyři: 4, pět: 5, šest: 6,
  две: 2, два: 2, три: 3, четири: 4, пет: 5, шест: 6, осем: 8,
}
// "4-6", and Bulgarian "4-ма" / "4-ри"
const COUNT = `(\\d{1,2}|${Object.keys(NUM_WORDS).join('|')})(?:-?(?:ма|ри))?(?:\\s*(?:-|–|to|až|до)\\s*\\d{1,2})?`
// \b only knows ASCII letters, so Czech and Bulgarian words need these
const START = '(?<![\\p{L}\\d])'
const END = '(?![\\p{L}\\d])'
const LABEL = 'serves|servings?|portions?|yields?|makes|počet porcí|porce|porcí|porcie|брой порции|порции|порция|portionen|porzioni|raciones|porciones|porcje|porcji|порций|порции'
const PEOPLE =
  'servings?|portions?|people|persons|porc[eíi]|porcie|porciu|osob[ya]?|osôb|lidi|порции|порция|човека|човек|души|personen|portionen|porzioni|persone|raciones|porciones|personas|personnes|parts|porcje|porcji|osoby|osób|порций|персоны|персон|человека|человек'
const SERVINGS = [
  new RegExp(`${START}(?:${LABEL})\\s*[:\\-–]?\\s*(?:about\\s+|cca\\.?\\s+|около\\s+)?${COUNT}${END}`, 'iu'),
  new RegExp(`${START}${COUNT}\\s*(?:${PEOPLE})${END}`, 'iu'),
  // "2人分", "2人前", "4人份", "2인분": no space and a word may follow
  new RegExp(`${START}(\\d{1,2})\\s*(?:人分|人前|人份|人用|인분)`, 'u'),
  // "for 4" only at the end of a phrase, so "за 10 минути" (for 10 minutes) is not a portion count
  new RegExp(`${START}(?:for|pro|na|za|за|für|para|per|pour|dla|на)\\s+${COUNT}(?:\\s*(?:${PEOPLE})${END}|(?=[ \\t]*(?:[:.,)\\n]|$)))`, 'iu'),
]

/** Number of portions mentioned in a recipe text, or null. */
export function detectServings(text) {
  if (!text) return null
  for (const re of SERVINGS) {
    const m = String(text).match(re)
    if (m) {
      const v = m[1].toLowerCase()
      const n = NUM_WORDS[v] ?? Number(v)
      if (n > 0 && n <= 30) return n
    }
  }
  return null
}

/**
 * Portions from schema.org recipeYield: a number, "4", "4 servings", "4-6",
 * "Porce: 4", "12 cookies", or a list of those. Null when there is none.
 */
export function servingsFrom(value) {
  const items = [].concat(value ?? []).filter((v) => v != null && v !== '')
  for (const v of items) {
    const n = typeof v === 'number' ? Math.round(v) : detectServings(String(v))
    if (n > 0 && n <= 100) return n
  }
  // No portion word: the first number counts ("4", "12 cookies", "1 cake")
  for (const v of items) {
    const n = Number(String(v).match(/\d+(?:[.,]\d+)?/)?.[0].replace(',', '.'))
    if (n >= 1 && n <= 100) return Math.round(n)
  }
  return null
}
