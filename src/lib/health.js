// How balanced a meal is, from numbers the app already has: calories of one
// portion and the energy split between protein, carbs and fat. Four simple
// checks, each good / ok / high, loosely after WHO and EFSA guidance
// (fat 20-35 % of energy, protein 10-35 %, a main meal about a third of a
// 2000 kcal day). It knows nothing of fibre, sugar or salt, so it is a hint,
// not a verdict.

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
const POINTS = { good: 2, ok: 1, high: 0, low: 0 }

const pct = (x) => Math.round(x * 100)

/**
 * Checks of one portion: { level, label, checks: [{ key, level, title, text }] }.
 * level is 'good' | 'ok' | 'poor'. `kcal` is per portion (null when the recipe
 * has no portion count: that check is then left out).
 */
export function mealHealth({ kcal, protein, carbs, fat }) {
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
  if (!checks.length) return null
  const score = checks.reduce((s, c) => s + POINTS[c.level], 0) / (checks.length * 2)
  const level = score >= 0.75 ? 'good' : score >= 0.45 ? 'ok' : 'poor'
  const label = { good: 'Balanced', ok: 'Fairly balanced', poor: 'Indulgent' }[level]
  return { level, label, score, split, checks }
}
