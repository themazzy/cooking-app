import { canonicalUnit, formatAmount, parseAmount, poured, stickGrams, weighed } from './scale.js'

// Showing recipes in metric or US units. Amounts are converted for display
// only; the saved recipe keeps the units it was written in.

const TO_METRIC = { oz: ['g', 28.35], lb: ['g', 453.6], floz: ['ml', 29.57], pint: ['ml', 473.2], quart: ['ml', 946.4], cup: ['ml', 240] }
const FROM_METRIC = { g: ['g', 1], kg: ['g', 1000], ml: ['ml', 1], dl: ['ml', 100], l: ['ml', 1000] }

function toMetric(n, unit) {
  const [base, mult] = TO_METRIC[unit]
  const v = n * mult
  if (base === 'g' && v >= 1000) return [v / 1000, 'kg']
  if (base === 'ml' && v >= 1000) return [v / 1000, 'l']
  return [v, base]
}

function toImperial(n, unit) {
  const [base, mult] = FROM_METRIC[unit]
  const v = n * mult
  if (base === 'g') return v >= 453.6 ? [v / 453.6, 'lb'] : [v / 28.35, 'oz']
  // Small volumes read better in spoons, then cups, then quarts
  if (v < 15) return [v / 4.93, 'tsp']
  if (v < 60) return [v / 14.79, 'tbsp']
  if (v >= 1892) return [v / 946.4, 'quart']
  return [v / 240, 'cup']
}

const LABEL = { floz: 'fl oz', quart: 'qt' }
// "1 cup" and "½ cup", but "1 ½ cups"
const label = (unit, text) => (unit === 'cup' ? (/^(1|½|⅓|⅔|¼|¾|0,\d+)$/.test(text) ? 'cup' : 'cups') : (LABEL[unit] ?? unit))

// Ounces and pounds round to a quarter so they read like a recipe
const quarter = (n) => (n >= 10 ? Math.round(n) : Math.round(n * 4) / 4)

// Weighed ingredients (flour, sugar, butter, grated cheese, nuts) are weighed in
// metric kitchens, so cups and millilitres of them become grams, and so does a
// stick of butter. Spoons stay spoons: half a spoon of starch reads better than 7 g.
const ML = { ml: 1, dl: 100, l: 1000, floz: 29.57, pint: 473.2, quart: 946.4, cup: 240 }

function toGrams(n, unit, entry) {
  const v = unit === 'stick' ? n * stickGrams(entry) : n * ML[unit] * entry.density
  return v >= 1000 ? [v / 1000, 'kg'] : [v, 'g']
}

// Ounces of milk or stock are fluid ounces
function fluidOunces(n) {
  const v = n * 29.57
  return v >= 1000 ? [v / 1000, 'l'] : [v, 'ml']
}

/**
 * One ingredient ({ qty, unit, name }) in `system` ('metric' or 'imperial');
 * anything else is left as it is. `match` (name → catalog entry) lets metric
 * weigh dry ingredients instead of measuring them in ml.
 */
export function convertIngredient(ing, system, match) {
  const unit = canonicalUnit(ing.unit)
  const entry = system === 'metric' && (ML[unit] || unit === 'stick' || unit === 'oz') ? match?.(ing.name) : null
  const dry = unit === 'stick' ? stickGrams(entry) != null : !!ML[unit] && weighed(entry)
  const fluid = unit === 'oz' && poured(entry)
  const table = system === 'metric' ? TO_METRIC : system === 'imperial' ? FROM_METRIC : null
  if (!table || !unit || (!table[unit] && !dry)) return ing
  const a = parseAmount(ing.qty)
  if (!a) return ing
  const conv = dry ? (n, u) => toGrams(n, u, entry) : fluid ? fluidOunces : system === 'metric' ? toMetric : toImperial
  // Both ends of a range in the unit the larger one needs: 905 g–1,4 kg reads as 0,9–1,4 kg
  const [top, u] = conv(a.max ?? a.min, unit)
  const min = a.max != null ? (top * a.min) / a.max : top
  const max = a.max != null ? top : null
  const fmt = (n) => (['oz', 'lb', 'quart'].includes(u) ? formatAmount(quarter(n), 'cup') : formatAmount(n, u))
  const last = fmt(max ?? min)
  return { ...ing, qty: max != null ? `${fmt(min)}–${last}` : last, unit: label(u, last) }
}

export const convertIngredients = (list, system, match) => list.map((i) => convertIngredient(i, system, match))

// A temperature in a step: "180 °C", "350F", "200 degrees Celsius", Czech "180 stupňů", Bulgarian "200 градуса", "gas mark 4"
const DEGREE_WORD = 'degrees?|deg\\.?|stup(?:ň|n)(?:ů|u|ě|e|ích|ich)?|градус(?:а|и)?'
const TEMP = new RegExp(
  `(?<![\\d.,])(?<n>\\d{2,3})(?:\\s*(?:-|–|to|až|до)\\s*(?<hi>\\d{2,3}))?\\s*(?:(?<deg>[°º˚])\\s*(?<degScale>[CF](?![\\p{L}])|celsius|fahrenheit)?|(?<word>${DEGREE_WORD})(?:\\s*(?<wordScale>C(?![\\p{L}])|F(?![\\p{L}])|celsius|celsia|fahrenheit|по\\s+целзий))?|(?<letter>[CF])(?![\\p{L}]))` +
    '|gas\\s+mark\\s+(?<gas>\\d)(?!\\d)',
  'giu',
)
// Gas mark to °C and °F
const GAS = { 1: [140, 275], 2: [150, 300], 3: [170, 325], 4: [180, 350], 5: [190, 375], 6: [200, 400], 7: [220, 425], 8: [230, 450], 9: [240, 475] }
// Ways two temperatures are written together: "180 °C / 350 °F", "425°F (220°C)", "180 °C or 350 °F"
const BETWEEN = /^\s*(?:\/|\(|or|nebo|или|,|=|–|-)?\s*$/iu

function readTemp(m) {
  const g = m.groups
  if (g.gas) return GAS[g.gas] ? { gas: GAS[g.gas] } : null
  const n = Number(g.n)
  const hi = g.hi ? Number(g.hi) : null
  const scale = (g.degScale ?? g.wordScale ?? g.letter ?? '').trim().toLowerCase()
  if (scale.startsWith('f')) return { n, hi, f: true }
  if (scale) return { n, hi, f: false }
  // Czech and Bulgarian recipes count in Celsius; a bare "220°" or "400 degrees" is Fahrenheit only when too hot for Celsius
  if (g.word && !/^deg/i.test(g.word)) return { n, hi, f: false }
  return n < 30 ? null : { n, hi, f: (hi ?? n) >= 260 }
}

// Oven dials step by 10 °C and 25 °F; lower temperatures (sugar, meat inside) stay closer
const toC = (f) => {
  const c = ((f - 32) * 5) / 9
  return c >= 150 ? Math.round(c / 10) * 10 : c >= 100 ? Math.round(c / 5) * 5 : Math.round(c)
}
const toF = (c) => {
  const f = (c * 9) / 5 + 32
  return f >= 250 ? Math.round(f / 25) * 25 : Math.round(f / 5) * 5
}

/**
 * Oven temperatures in step text: "350°F" → "180 °C" (metric), "180 °C" → "350 °F" (imperial).
 * Where both are written ("180 °C / 350 °F") only the one for `system` stays.
 */
export function convertTemperatures(text, system) {
  if (system !== 'metric' && system !== 'imperial') return text
  const s = String(text ?? '')
  const found = [...s.matchAll(TEMP)].map((m) => ({ at: m.index, end: m.index + m[0].length, t: readTemp(m), raw: m[0] })).filter((x) => x.t)
  const show = (x) => {
    const { t } = x
    if (t.gas) return system === 'metric' ? `${t.gas[0]} °C` : `${t.gas[1]} °F`
    const range = (fn) => (t.hi != null ? `${fn(t.n)}–${fn(t.hi)}` : `${fn(t.n)}`)
    if (system === 'metric' && t.f) return `${range(toC)} °C`
    if (system === 'imperial' && !t.f) return `${range(toF)} °F`
    return x.raw
  }
  // The one written in the wanted scale, of a pair
  const wanted = (x) => !x.t.gas && x.t.f === (system === 'imperial')
  let out = ''
  let pos = 0
  for (let i = 0; i < found.length; i++) {
    const a = found[i]
    const b = found[i + 1]
    const gap = b ? s.slice(a.end, b.at) : null
    const paired = b && BETWEEN.test(gap) && (a.t.gas || b.t.gas || a.t.f !== b.t.f)
    out += s.slice(pos, a.at)
    if (paired) {
      const keep = wanted(b) && !wanted(a) ? b : a
      out += show(keep)
      pos = b.end
      // the bracket around the second one goes with it
      if (gap.includes('(') && s[pos] === ')') pos++
      i++
    } else {
      out += show(a)
      pos = a.end
    }
  }
  return out + s.slice(pos)
}

/** Whether a recipe uses any units that `system` would change. */
export const hasUnits = (list, system, match) => list.some((i) => convertIngredient(i, system, match) !== i)
