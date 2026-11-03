import { describe, expect, it } from 'vitest'
import { energySplit, mealHealth } from './health.js'

describe('energySplit', () => {
  it('counts fat as 9 kcal per gram', () => {
    const s = energySplit({ protein: 10, carbs: 10, fat: 10 })
    expect(s.fat).toBeCloseTo(9 / 17)
    expect(s.protein + s.carbs + s.fat).toBeCloseTo(1)
  })
  it('is null with nothing', () => expect(energySplit({})).toBe(null))
})

describe('mealHealth', () => {
  it('calls a lean chicken and rice plate balanced', () => {
    const h = mealHealth({ kcal: 520, protein: 40, carbs: 60, fat: 12 })
    expect(h.level).toBe('good')
    expect(h.checks.map((c) => c.level)).toEqual(['good', 'good', 'good', 'good'])
  })
  it('calls a heavy creamy pasta indulgent', () => {
    const h = mealHealth({ kcal: 1100, protein: 18, carbs: 90, fat: 70 })
    expect(h.level).toBe('poor')
    expect(h.checks.find((c) => c.key === 'fat').level).toBe('high')
  })
  it('flags sweet things that are nearly all carbs', () => {
    const h = mealHealth({ kcal: 300, protein: 3, carbs: 65, fat: 3 })
    expect(h.checks.find((c) => c.key === 'carbs').level).toBe('high')
    expect(h.checks.find((c) => c.key === 'protein').level).toBe('low')
  })
  it('leaves out the calorie check without portions', () => {
    const h = mealHealth({ kcal: null, protein: 40, carbs: 60, fat: 12 })
    expect(h.checks.map((c) => c.key)).toEqual(['protein', 'fat', 'carbs'])
  })
  it('is null without numbers', () => expect(mealHealth({ kcal: null, protein: 0, carbs: 0, fat: 0 })).toBe(null))
})

describe('sugar, fibre and salt checks', () => {
  it('flags a sweet, salty meal with little fibre', () => {
    const h = mealHealth({ kcal: 600, protein: 25, carbs: 80, fat: 18, sugar: 40, fibre: 2, salt: 4 })
    const lv = Object.fromEntries(h.checks.map((c) => [c.key, c.level]))
    expect(lv).toMatchObject({ sugar: 'high', fibre: 'low', salt: 'high' })
  })
  it('praises a lentil stew', () => {
    const h = mealHealth({ kcal: 450, protein: 24, carbs: 55, fat: 12, sugar: 8, fibre: 14, salt: 1 })
    expect(h.checks.filter((c) => c.level !== 'good')).toEqual([])
    expect(h.level).toBe('good')
  })
  it('says salt to taste when it has no amount', () => {
    const h = mealHealth({ kcal: 450, protein: 24, carbs: 55, fat: 12, sugar: 8, fibre: 14, salt: 0, saltToTaste: true })
    expect(h.checks.find((c) => c.key === 'salt')).toMatchObject({ level: 'ok', text: expect.stringContaining('to taste') })
  })
})
