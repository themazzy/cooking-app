// Matches recipe ingredient names ("2 boneless chicken breasts, diced") to
// the ingredient catalog, which gives each one a canonical name, an aisle
// for the shopping list and a picture.

const IRREGULAR = { leaves: 'leaf', tomatoes: 'tomato', potatoes: 'potato', knives: 'knife', halves: 'half', loaves: 'loaf' }

const singular = (w) => {
  if (IRREGULAR[w]) return IRREGULAR[w]
  if (w.length > 4 && w.endsWith('ies')) return `${w.slice(0, -3)}y`
  if (w.length > 4 && /(ches|shes|xes|oes)$/.test(w)) return w.slice(0, -2)
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1)
  return w
}

/** Lowercase words without punctuation or plurals: "Cherry Tomatoes" → "cherry tomato". */
export function normalizeName(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .split(/[,;]| - | – /)[0]
    .replace(/[^\p{L}\p{N}' -]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(singular)
    .join(' ')
}

// Words that describe how an ingredient is prepared, not what it is
const DESCRIPTORS = new Set(
  'fresh chopped diced sliced grated finely roughly thinly large small medium big ripe peeled boneless skinless cooked raw whole halved quartered crushed softened melted cold warm room temperature organic good quality extra about approx approximately of a an the some few handful pinch'.split(' '),
)

const stripDescriptors = (normalized) =>
  normalized
    .split(' ')
    .filter((w) => !DESCRIPTORS.has(w))
    .join(' ')

/** Lookup structure for a list of catalog entries ({ name, aisle, image, aliases }). */
export function buildCatalogIndex(entries) {
  const exact = new Map()
  for (const e of entries) {
    for (const phrase of [e.name, ...(e.aliases ?? [])]) {
      const key = normalizeName(phrase)
      // The first entry to claim a phrase keeps it (custom entries come first)
      if (key && !exact.has(key)) exact.set(key, e)
    }
  }
  // Longest phrases first, so "chicken breast" wins over "chicken"
  const phrases = [...exact.keys()].sort((a, b) => b.length - a.length)
  return { exact, phrases, cache: new Map() }
}

// Bulgarian puts "the" on the end of a word: доматите, солта, лукът, брашното
const BG_ARTICLE = /(?<=\p{L}{3})(?:ът|ят|та|то|те)$/u
const withoutArticles = (normalized) =>
  normalized
    .split(' ')
    .map((w) => (/^\p{Script=Cyrillic}+$/u.test(w) ? w.replace(BG_ARTICLE, '') : w))
    .join(' ')

/** A phrase inside a longer name, but not the first part of "cream of tartar" or "cream of mushroom soup". */
function phraseIn(index, text) {
  const padded = ` ${text} `
  return index.phrases.find((p) => padded.includes(` ${p} `) && !padded.includes(` ${p} of `)) ?? null
}

/** The catalog entry for an ingredient name, or null. */
export function matchIngredient(index, name) {
  if (!index || !name) return null
  if (index.cache.has(name)) return index.cache.get(name)
  // "butter or margarine", "med nebo javorový sirup": the first one is what the recipe means
  const [first, other] = String(name).split(/\s+(?:or|nebo|или|oder)\s+/i)
  if (other) {
    const found = matchIngredient(index, first) ?? matchIngredient(index, other)
    index.cache.set(name, found)
    return found
  }
  const full = normalizeName(name)
  const bare = stripDescriptors(full)
  const plain = withoutArticles(bare)
  // "pepper" alone is ground black pepper; "peppers" are the vegetable
  const pepper = bare === 'pepper' && !/peppers/i.test(name) ? index.exact.get('black pepper') : null
  let found = pepper ?? index.exact.get(full) ?? index.exact.get(bare) ?? index.exact.get(plain) ?? null
  if (!found) {
    const phrase = phraseIn(index, bare) ?? (plain !== bare ? phraseIn(index, plain) : null)
    found = phrase ? index.exact.get(phrase) : null
  }
  index.cache.set(name, found)
  return found
}

/** TheMealDB's small picture for a catalog entry. */
export const imageUrl = (entry) =>
  entry?.image ? `https://www.themealdb.com/images/ingredients/${encodeURIComponent(entry.image.toLowerCase().replace(/ /g, '_'))}-small.png` : null
