import { describe, expect, it } from 'vitest'
import { DEFAULT_DAY, dailyTargets, hasProfile, restingKcal } from './goals.js'
import { mealHealth } from './health.js'

describe('restingKcal (Mifflin-St Jeor)', () => {
  it('matches worked examples', () => {
    // 10×80 + 6.25×180 − 5×30 + 5 = 1780
    expect(restingKcal({ sex: 'male', age: 30, weight: 80, height: 180 })).toBe(1780)
    // 10×60 + 6.25×165 − 5×28 − 161 = 1330.25
    expect(restingKcal({ sex: 'female', age: '28', weight: '60', height: '165' })).toBeCloseTo(1330.25)
  })
  it('reads decimal commas', () => expect(restingKcal({ sex: 'male', age: 30, weight: '80,5', height: 180 })).toBe(1785))
  it('needs every field', () => {
    expect(restingKcal({ sex: 'male', age: 30, weight: 80 })).toBe(null)
    expect(hasProfile({ age: 30, weight: 80, height: 180 })).toBe(false)
  })
})

describe('dailyTargets', () => {
  const man = { sex: 'male', age: 30, weight: 80, height: 180, activity: 'moderate' }
  it('falls back to the EU day without a profile', () => expect(dailyTargets({})).toBe(DEFAULT_DAY))
  it('keeps weight at resting × activity', () => {
    const t = dailyTargets({ ...man, goal: 'maintain' })
    expect(t.kcal).toBe(3030) // 1780 × 1.7 = 3026
    expect(t.protein).toBe(112) // 1.4 × 80
    expect(t.fat).toBe(Math.round((3030 * 0.3) / 9))
    expect(t.protein * 4 + t.carbs * 4 + t.fat * 9).toBeGreaterThan(3020)
    expect(t.weekly).toBe(0)
  })
  it('cuts 20 % with more protein', () => {
    const t = dailyTargets({ ...man, goal: 'cut' })
    expect(t.kcal).toBe(2420)
    expect(t.protein).toBe(160)
    expect(t.weekly).toBeCloseTo(-0.6, 1)
  })
  it('bulks 10 %', () => {
    const t = dailyTargets({ ...man, goal: 'bulk' })
    expect(t.kcal).toBe(3330)
    expect(t.protein).toBe(144)
  })
  it('never goes under resting energy', () => {
    const t = dailyTargets({ sex: 'female', age: 70, weight: 45, height: 150, activity: 'sedentary', goal: 'cut' })
    expect(t.kcal).toBeGreaterThanOrEqual(Math.round(restingKcal({ sex: 'female', age: 70, weight: 45, height: 150 }) / 10) * 10)
  })
  it('counts protein on a weight up to BMI 27', () => {
    const t = dailyTargets({ sex: 'male', age: 40, weight: 130, height: 175, activity: 'light', goal: 'maintain' })
    expect(t.protein).toBe(Math.round(1.4 * 27 * 1.75 ** 2))
  })
})

describe('mealHealth with a personal day', () => {
  const day = dailyTargets({ sex: 'female', age: 28, weight: 60, height: 165, activity: 'light', goal: 'cut' })
  it('judges calories against her meal, not 2000 kcal', () => {
    // day ≈ 1650 kcal, a 600 kcal portion is over a third of it
    const general = mealHealth({ kcal: 600, protein: 35, carbs: 60, fat: 20 })
    const mine = mealHealth({ kcal: 600, protein: 35, carbs: 60, fat: 20 }, day)
    expect(general.checks[0].level).toBe('good')
    expect(mine.checks[0].level).toBe('ok')
    expect(mine.checks[0].text).toContain('your')
  })
  it('measures protein against grams per meal', () => {
    const h = mealHealth({ kcal: 450, protein: 12, carbs: 60, fat: 12 }, day)
    expect(h.checks.find((c) => c.key === 'protein')).toMatchObject({ level: 'low', text: expect.stringContaining('per meal') })
  })
})

describe('mealHealth keeps fat and carbs checks with a personal day', () => {
  it('has all energy checks', () => {
    const day = dailyTargets({ sex: 'male', age: 30, weight: 80, height: 180, activity: 'light', goal: 'maintain' })
    const h = mealHealth({ kcal: 600, protein: 35, carbs: 60, fat: 20 }, day)
    expect(h.checks.map((c) => c.key)).toEqual(['kcal', 'protein', 'fat', 'carbs'])
  })
})
