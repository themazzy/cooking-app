// Rule-based reader for recipe captions and transcripts, in Czech and English.
// It finds ingredient lines ("200 g hladké mouky", "Flour - 2 cups") and
// method steps. Anything it can't place is left for the user to edit.

const UNITS = {
  g: ['g', 'gr', 'gram', 'gramy', 'gramů', 'gramu', 'grams', 'gramm'],
  kg: ['kg', 'kilo', 'kila'],
  ml: ['ml', 'mililitr', 'mililitry', 'mililitrů'],
  dl: ['dl', 'decilitr', 'decilitry', 'decilitrů'],
  l: ['l', 'litr', 'litry', 'litrů', 'liter', 'liters', 'litre', 'litres'],
  tbsp: ['lžíce', 'lžic', 'lžíci', 'lž', 'pl', 'tbsp', 'tbs', 'tablespoon', 'tablespoons'],
  tsp: ['lžička', 'lžičky', 'lžiček', 'lžičku', 'lžl', 'kl', 'tsp', 'teaspoon', 'teaspoons'],
  cup: ['hrnek', 'hrnky', 'hrnku', 'hrnků', 'cup', 'cups'],
  pcs: ['ks', 'kus', 'kusy', 'kusů', 'piece', 'pieces', 'pcs'],
  clove: ['stroužek', 'stroužky', 'stroužků', 'clove', 'cloves'],
  pinch: ['špetka', 'špetku', 'špetky', 'pinch'],
  can: ['plechovka', 'plechovky', 'plechovku', 'konzerva', 'konzervy', 'can', 'cans', 'tin', 'tins'],
  pack: ['balení', 'bal', 'balíček', 'balíčky', 'balíčku', 'pack', 'packs', 'packet', 'packets'],
  head: ['hlava', 'hlavy', 'hlav', 'head', 'heads'],
  slice: ['plátek', 'plátky', 'plátků', 'slice', 'slices'],
  bunch: ['svazek', 'svazky', 'svazku', 'bunch'],
  handful: ['hrst', 'hrsti', 'handful'],
  oz: ['oz', 'ounce', 'ounces'],
  lb: ['lb', 'lbs', 'pound', 'pounds'],
}

const UNIT_LOOKUP = new Map(Object.entries(UNITS).flatMap(([canon, words]) => words.map((w) => [w, canon])))
const UNIT_RE = [...UNIT_LOOKUP.keys()].sort((a, b) => b.length - a.length).join('|')

const FRACTIONS = { '½': 0.5, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 0.25, '¾': 0.75, '⅛': 0.125 }
const NUM = `(?:\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d+[½⅓⅔¼¾⅛]|\\d+(?:[.,]\\d+)?|[½⅓⅔¼¾⅛])`
const QTY = `(${NUM})(?:\\s*(?:-|–|to|až)\\s*(${NUM}))?`
const UNIT = `(${UNIT_RE})\\.?(?![\\p{L}])`

// "200 g mouky", "2 eggs", "1/2 cup sugar", "200g flour"
const QTY_FIRST = new RegExp(`^${QTY}\\s*(?:${UNIT})?\\s*(?:of\\s+)?(.+)$`, 'iu')
// "Garlic: 2 heads (for roasting)", "Spices — 1 teaspoon each": name, separator, amount, note
const LABELLED = new RegExp(`^(.+?)\\s*[:–—-]\\s+${QTY}\\s*(?:${UNIT})?\\s*(.*)$`, 'iu')
// "mouka 200 g", "Flour - 200g", "cukr: 2 lžíce"
// "Salt and pepper: to taste", "Sůl: podle chuti"
const TO_TASTE = /^(.+?)\s*[:–—-]\s+(to taste|as needed|optional|podle chuti|dle chuti|podle potřeby|dle potřeby|volitelně)\.?$/iu
const NAME_FIRST = new RegExp(`^(.+?)\\s*[-–:,]?\\s+${QTY}\\s*(?:${UNIT})?\\s*$`, 'iu')

const INGREDIENT_HEADER = /^(ingredients?|ingredience|suroviny|potřebujete|budete potřebovat|you('ll)? need|what you need)\b/i
const STEP_HEADER = /^(postup|příprava|method|instructions|directions|steps|how to make( it)?)\b/i
const NUMBERED_STEP = /^(?:step\s*)?\d{1,2}\s*[.)]\s+(?=\p{L})/iu
const DECORATION = /^[\s\-–—•*·>]+|^[\p{Extended_Pictographic}️‍\s]+/u

export function parseQuantity(s) {
  if (!s) return null
  s = s.trim()
  if (FRACTIONS[s] != null) return FRACTIONS[s]
  let m = s.match(/^(\d+)\s+(\d+)\/(\d+)$/)
  if (m) return Number(m[1]) + Number(m[2]) / Number(m[3])
  m = s.match(/^(\d+)\/(\d+)$/)
  if (m) return Number(m[1]) / Number(m[2])
  m = s.match(/^(\d+)([½⅓⅔¼¾⅛])$/)
  if (m) return Number(m[1]) + FRACTIONS[m[2]]
  const n = Number(s.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function cleanLine(line) {
  return line
    .replace(DECORATION, '')
    .replace(/(\s#[\p{L}\d_]+)+\s*$/u, '') // trailing hashtags
    .trim()
}

const cleanName = (s) => s.replace(/^[-–:,\s]+|[\s.,;:]+$/g, '').trim()

/** Reads one ingredient line. Returns null when the line has no quantity. */
export function parseIngredientLine(line) {
  const text = cleanLine(line)
  if (!text) return null
  let m = text.match(QTY_FIRST)
  if (m) {
    const name = cleanName(m[4])
    if (name)
      return {
        raw: text,
        quantity: parseQuantity(m[1]),
        quantityMax: parseQuantity(m[2]),
        unit: m[3] ? UNIT_LOOKUP.get(m[3].toLowerCase()) : null,
        name,
      }
  }
  m = text.match(LABELLED)
  if (m) {
    const name = cleanName(m[1])
    const note = m[5].trim()
    if (name)
      return {
        raw: text,
        quantity: parseQuantity(m[2]),
        quantityMax: parseQuantity(m[3]),
        unit: m[4] ? UNIT_LOOKUP.get(m[4].toLowerCase()) : null,
        name,
        ...(note ? { note } : {}),
      }
  }
  m = text.match(TO_TASTE)
  if (m && cleanName(m[1])) return { raw: text, quantity: null, quantityMax: null, unit: null, name: cleanName(m[1]), note: m[2] }
  m = text.match(NAME_FIRST)
  if (m) {
    const name = cleanName(m[1])
    if (name)
      return {
        raw: text,
        quantity: parseQuantity(m[2]),
        quantityMax: parseQuantity(m[3]),
        unit: m[4] ? UNIT_LOOKUP.get(m[4].toLowerCase()) : null,
        name,
      }
  }
  return null
}

const wordCount = (s) => s.split(/\s+/).filter(Boolean).length

/**
 * Splits a caption or transcript into ingredients and steps.
 * Returns { ingredients: [{ raw, quantity, quantityMax, unit, name, note?, group? }], steps: [string] }.
 */
export function parseRecipeText(text) {
  const ingredients = []
  const steps = []
  let section = null // 'ingredients' | 'steps' | null
  let group = null // sub-list inside the ingredients, e.g. "Tzatziki sauce"
  const add = (ing) => ingredients.push(group ? { ...ing, group } : ing)

  for (const rawLine of (text ?? '').split(/\r?\n/)) {
    const line = cleanLine(rawLine)
    if (!line || /^(#[\p{L}\d_]+\s*)+$/u.test(line)) continue

    const header = line.replace(/[:\s]+$/, '')
    if (INGREDIENT_HEADER.test(header) && wordCount(header) <= 4) {
      section = 'ingredients'
      continue
    }
    if (STEP_HEADER.test(header) && wordCount(header) <= 4) {
      section = 'steps'
      continue
    }

    if (NUMBERED_STEP.test(line) && !(section === 'ingredients' && parseIngredientLine(line.replace(NUMBERED_STEP, '')))) {
      steps.push(line.replace(NUMBERED_STEP, ''))
      section ??= 'steps'
      continue
    }

    if (section === 'steps') {
      steps.push(line)
      continue
    }

    const ing = parseIngredientLine(line)
    if (!ing && section === 'ingredients' && /:\s*$/.test(line) && wordCount(line) <= 5) {
      group = cleanName(line)
      continue
    }
    // Outside an ingredient list, only short lines with a quantity count, so
    // sentences like "Bake for 25 minutes at 180 °C" don't become ingredients
    if (ing && (section === 'ingredients' || ing.unit || wordCount(line) <= 5)) {
      add(ing)
    } else if (section === 'ingredients' && !/[.!?]$/.test(line) && wordCount(line) <= 20) {
      add({ raw: line, quantity: null, quantityMax: null, unit: null, name: cleanName(line) })
    }
  }
  return { ingredients, steps }
}
