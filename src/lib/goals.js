// Personal daily targets from age, sex, height, weight, activity and goal.
// Saved per phone (settings.body), so each of you has your own.
//
// Sources, cross-checked 2026-11-03:
// - Resting energy: Mifflin-St Jeor (Am J Clin Nutr 1990;51:241), 10 × kg +
//   6.25 × cm − 5 × age, +5 men / −161 women. Same coefficients in Medscape,
//   Wikipedia, Omni and calculator.net; Frankenfield 2005 (J Am Diet Assoc
//   105:775) found it the most accurate of the common equations.
// - Activity: physical activity level (PAL) bands of FAO/WHO/UNU 2001 Human
//   energy requirements, table 5.3: sedentary/light 1.40-1.69, active
//   1.70-1.99, vigorous 2.00-2.40 (above 2.40 is hard to keep up).
// - Protein: EFSA 2012 PRI 0.83 g/kg (minimum for everyone, 2× is safe);
//   Morton 2018 (BJSM 52:376) muscle gain levels off at 1.62 g/kg (CI to 2.2);
//   Iraki 2019 (Sports 7:154) off-season 1.6-2.2 g/kg. Losing fat: the higher
//   end, to keep muscle.
// - Gaining: Iraki 2019, ~10-20 % over maintenance, 0.25-0.5 % body weight a
//   week; the low end for less fat. Losing: CDC, 1-2 lb (0.5-0.9 kg) a week
//   is the pace that stays off; a 20 % deficit is about 0.3-0.6 kg a week.
// - Fat: EFSA 20-35 % of energy, WHO up to 30 %. Carbs: the rest, EFSA 45-60 %.
// - Fibre: EFSA 25 g/day adequate, EU reference intake 30 g. Salt: WHO under
//   5 g/day. Sugar: WHO free sugars under 10 % of energy; the app only knows
//   total sugars, so the limit is the EU reference intake (90 g per 2000 kcal),
//   scaled to your calories.

export const ACTIVITY = {
  sedentary: { pal: 1.4, label: 'Sitting most of the day', hint: 'desk job, little walking' },
  light: { pal: 1.55, label: 'Lightly active', hint: 'on your feet some of the day, or 1-2 workouts a week' },
  moderate: { pal: 1.7, label: 'Active', hint: 'daily walks or 3-4 workouts a week' },
  active: { pal: 1.9, label: 'Very active', hint: 'hard training most days, or a physical job' },
  athlete: { pal: 2.2, label: 'Athlete', hint: 'training twice a day, or heavy manual work' },
}

export const GOALS = {
  cut: { label: 'Lose fat', energy: -0.2, protein: 2.0, fat: 0.25 },
  maintain: { label: 'Keep weight', energy: 0, protein: 1.4, fat: 0.3 },
  bulk: { label: 'Build muscle', energy: 0.1, protein: 1.8, fat: 0.25 },
}

/** The defaults used without a profile (EU reference intakes). */
export const DEFAULT_DAY = { kcal: 2000, protein: null, fatShare: 0.35, sugar: 90, fibre: 30, salt: 6, meals: 3, personal: false }

const num = (v) => {
  const n = Number(String(v ?? '').replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : null
}

/** Resting energy (kcal/day), Mifflin-St Jeor. */
export function restingKcal({ sex, age, weight, height }) {
  const a = num(age)
  const w = num(weight)
  const h = num(height)
  if (!a || !w || !h || (sex !== 'male' && sex !== 'female')) return null
  return 10 * w + 6.25 * h - 5 * a + (sex === 'male' ? 5 : -161)
}

/** True when the profile has everything the targets need. */
export const hasProfile = (body) => !!body && restingKcal(body) != null

const round = (n, to = 1) => Math.round(n / to) * to

/**
 * Daily targets: { kcal, maintenance, resting, protein, fat, carbs, fatShare,
 * sugar, fibre, salt, meals, personal, proteinPerKg, weekly } or DEFAULT_DAY
 * when the profile is incomplete. Grams are per day.
 */
export function dailyTargets(body) {
  const resting = body ? restingKcal(body) : null
  if (resting == null) return DEFAULT_DAY
  const weight = num(body.weight)
  const height = num(body.height)
  const pal = (ACTIVITY[body.activity] ?? ACTIVITY.light).pal
  const goal = GOALS[body.goal] ?? GOALS.maintain
  const meals = Math.min(6, Math.max(1, Math.round(num(body.meals) ?? 3)))
  const maintenance = resting * pal
  // Never below resting energy, however small the person
  const kcal = round(Math.max(resting, maintenance * (1 + goal.energy)), 10)
  // Protein per kg of a weight capped at BMI 27, so a heavy body does not
  // ask for steak-house amounts; at most 35 % of energy.
  const capWeight = 27 * (height / 100) ** 2
  const basis = Math.min(weight, capWeight)
  const protein = round(Math.min(goal.protein * basis, (kcal * 0.35) / 4))
  const fat = round((kcal * goal.fat) / 9)
  const carbs = round(Math.max(0, kcal - protein * 4 - fat * 9) / 4)
  return {
    kcal,
    maintenance: round(maintenance, 10),
    resting: round(resting, 10),
    protein,
    fat,
    carbs,
    fatShare: goal.fat,
    sugar: round((kcal * 0.045)),
    fibre: 30,
    salt: 5,
    meals,
    personal: true,
    proteinPerKg: goal.protein,
    // kg a week, from 7700 kcal per kg of body fat
    weekly: Math.round(((kcal - maintenance) * 7) / 7700 * 10) / 10,
  }
}
