// How balanced a meal is, from numbers the app already has: calories of one
// portion, the energy split between protein, carbs and fat, and sugar, fibre
// and salt. Simple checks, each good / ok / high, loosely after WHO and EFSA
// guidance (fat 20-35 % of energy, protein 10-35 %, a main meal about a third
// of a 2000 kcal day, sugars mostly under 10 % of energy, a meal with a third
// of the day's 30 g fibre and 5-6 g salt; without portions per 1000 kcal). Figures are
// estimates from raw ingredients, so it is a hint, not a verdict.

/** kcal per gram of each macro. */
export const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9 }

/** Share of energy (0-1) from protein, carbs and fat, or null when there is nothing. */
export function energySplit({ protein = 0, carbs = 0, fat = 0 }) {
  const e = { protein: protein * 4, carbs: carbs * 4, fat: fat * 9 }
  const sum = e.protein + e.carbs + e.fat
  if (!(sum > 0)) return null
  return { protein: e.protein / sum, carbs: e.carbs / sum, fat: e.fat / sum }
}

export const DAY_KCAL = 2000
/** EU reference intakes for a day (Regulation 1169/2011), for the meters. */
export const DAY = { sugar: 90, fibre: 30, salt: 6 }
const POINTS = { good: 2, ok: 1, high: 0, low: 0 }

const pct = (x) => Math.round(x * 100)

/**
 * Checks of one portion: { level, label, checks: [{ key, level, title, text }] }.
 * level is 'good' | 'ok' | 'poor'. `kcal` is per portion (null when the recipe
 * has no portion count: that check is then left out). Sugar, fibre and salt
 * are grams in the same amount of food as the macros; leave them out to skip
 * their checks. `saltToTaste` says salt is added without an amount.
 */
export function mealHealth({ kcal, protein, carbs, fat, sugar, fibre, salt, saltToTaste = false }) {
  const split = energySplit({ protein, carbs, fat })
  const checks = []
  if (kcal != null && kcal > 0) {
    const level = kcal <= 650 ? 'good' : kcal <= 900 ? 'ok' : 'high'
    checks.push({
      key: 'kcal',
      level,
      title: 'Calories',
      text: `${pct(kcal / DAY_KCAL)} % of a ${DAY_KCAL.toLocaleString('cs-CZ')} kcal day${level === 'good' ? '' : level === 'ok' ? ', a filling meal' : ', a heavy meal'}`,
    })
  }
  if (split) {
    const p = split.protein
    checks.push({
      key: 'protein',
      level: p >= 0.15 ? 'good' : p >= 0.1 ? 'ok' : 'low',
      title: 'Protein',
      text: `${pct(p)} % of energy${p >= 0.15 ? ', keeps you full' : p >= 0.1 ? ', a bit low' : ', low'}`,
    })
    const f = split.fat
    checks.push({
      key: 'fat',
      level: f <= 0.35 ? 'good' : f <= 0.45 ? 'ok' : 'high',
      title: 'Fat',
      text: `${pct(f)} % of energy${f <= 0.35 ? '' : f <= 0.45 ? ', on the rich side' : ', rich'}`,
    })
    const c = split.carbs
    checks.push({
      key: 'carbs',
      level: c <= 0.65 ? 'good' : c <= 0.75 ? 'ok' : 'high',
      title: 'Carbs',
      text: `${pct(c)} % of energy${c <= 0.65 ? '' : c <= 0.75 ? ', mostly starch or sugar' : ', almost all starch or sugar'}`,
    })
  }
  // Energy of the food itself, for the per-1000-kcal checks
  const energy = (protein ?? 0) * 4 + (carbs ?? 0) * 4 + (fat ?? 0) * 9
  const grams = (n) => `${n < 10 ? Math.round(n * 10) / 10 : Math.round(n)} g`.replace('.', ',')
  const each = kcal != null ? ' per portion' : ''
  if (energy > 0 && sugar != null) {
    const sh = (sugar * 4) / energy
    checks.push({
      key: 'sugar',
      level: sh <= 0.12 ? 'good' : sh <= 0.25 ? 'ok' : 'high',
      title: 'Sugar',
      text: `${grams(sugar)}${each}, ${pct(sh)} % of energy${sh <= 0.12 ? '' : sh <= 0.25 ? ', sweet' : ', very sweet'}`,
    })
  }
  if (energy > 0 && fibre != null) {
    // A third of the 30 g day per meal, or 14 g per 1000 kcal without portions
    const level = kcal != null ? (fibre >= 6 ? 'good' : fibre >= 3 ? 'ok' : 'low') : (fibre / energy) * 1000 >= 12 ? 'good' : (fibre / energy) * 1000 >= 7 ? 'ok' : 'low'
    checks.push({
      key: 'fibre',
      level,
      title: 'Fibre',
      text: `${grams(fibre)}${each}${level === 'good' ? ', plenty' : level === 'ok' ? ', some' : ', little'}`,
    })
  }
  if (energy > 0 && salt != null && (salt > 0 || !saltToTaste)) {
    // A third of the 5-6 g day per meal, or 2.5 g per 1000 kcal without portions
    const per = (salt / energy) * 1000
    const level = kcal != null ? (salt <= 2 ? 'good' : salt <= 3 ? 'ok' : 'high') : per <= 2.5 ? 'good' : per <= 4 ? 'ok' : 'high'
    checks.push({
      key: 'salt',
      level,
      title: 'Salt',
      text: `${grams(salt)}${each}${saltToTaste ? ' plus salt to taste' : ''}${level === 'good' ? '' : level === 'ok' ? ', salty' : ', very salty'}`,
    })
  } else if (saltToTaste) {
    checks.push({ key: 'salt', level: 'ok', title: 'Salt', text: 'to taste, so it depends on your hand' })
  }
  if (!checks.length) return null
  const score = checks.reduce((s, c) => s + POINTS[c.level], 0) / (checks.length * 2)
  const level = score >= 0.75 ? 'good' : score >= 0.45 ? 'ok' : 'poor'
  const label = { good: 'Balanced', ok: 'Fairly balanced', poor: 'Indulgent' }[level]
  return { level, label, score, split, checks }
}
