import { describe, expect, it } from 'vitest'
import { MACROS, NUTRITION, formatGrams, formatKcal, gramsOf, ingredientKcal, portionKcal, recipeCalories, recipeMacros } from './calories.js'
import { SEED_INGREDIENTS } from '../data/ingredients.js'

const egg = NUTRITION.get('eggs')
const flour = NUTRITION.get('flour')

describe('nutrition data', () => {
  it('has calories for every catalog ingredient', () => {
    const missing = SEED_INGREDIENTS.filter((e) => NUTRITION.get(e.name.toLowerCase())?.kcal == null).map((e) => e.name)
    expect(missing).toEqual([])
  })
  it('has protein, carbs and fat for every catalog ingredient', () => {
    const missing = SEED_INGREDIENTS.filter((e) => MACROS.some((m) => !(NUTRITION.get(e.name.toLowerCase())?.[m] >= 0))).map((e) => e.name)
    expect(missing).toEqual([])
  })
  it('has protein, carbs and fat that add up to about the calories', () => {
    // Alcohol has calories of its own (7 kcal/g) that are none of the three
    const ALCOHOL = /wine|beer|sake|brandy|rum|vodka|rakia|port|becherovka|slivovice|mead|mirin|vanilla$/i
    const off = [...NUTRITION]
      .filter(([name]) => !ALCOHOL.test(name))
      .filter(([, n]) => Math.abs(4 * n.protein + 4 * n.carbs + 9 * n.fat - n.kcal) > Math.max(25, 0.2 * n.kcal))
      .map(([name]) => name)
    expect(off).toEqual([])
  })
  it('never has more than 100 g of the three in 100 g', () => {
    const over = [...NUTRITION].filter(([, n]) => n.protein + n.carbs + n.fat > 100.5).map(([name]) => name)
    expect(over).toEqual([])
  })
})

describe('gramsOf', () => {
  it('reads weights, volumes with density, and pieces', () => {
    expect(gramsOf({ qty: '200', unit: 'g' }, flour)).toBe(200)
    expect(gramsOf({ qty: '0,5', unit: 'kg' }, flour)).toBe(500)
    expect(gramsOf({ qty: '1', unit: 'cup' }, flour)).toBeCloseTo(129.6, 0)
    expect(gramsOf({ qty: '2', unit: '' }, egg)).toBe(100)
    expect(gramsOf({ qty: '3', unit: 'ks' }, egg)).toBe(150)
    expect(gramsOf({ qty: '2', unit: 'lžíce' }, { density: 1 })).toBeCloseTo(29.6, 1)
  })
  it('gives up on missing amounts and unknown pieces', () => {
    expect(gramsOf({ qty: '', unit: '' }, egg)).toBeNull()
    expect(gramsOf({ qty: '1', unit: '' }, flour)).toBeNull()
    expect(gramsOf({ qty: '1', unit: 'sklenice' }, flour)).toBeNull()
  })
  it('uses the middle of a range', () => {
    expect(gramsOf({ qty: '2–4', unit: '' }, egg)).toBe(150)
  })
})

describe('recipeCalories', () => {
  const match = (name) => (/egg/i.test(name) ? egg : /flour/i.test(name) ? flour : /salt/i.test(name) ? NUTRITION.get('salt') : null)
  it('adds up what it can and lists the rest', () => {
    const r = recipeCalories(
      [
        { qty: '2', unit: '', name: 'eggs' },
        { qty: '100', unit: 'g', name: 'flour' },
        { qty: '', unit: '', name: 'salt' },
        { qty: '1', unit: '', name: 'mystery' },
      ],
      match,
    )
    expect(Math.round(r.total)).toBe(143 + 364)
    expect(r.missing).toEqual(['mystery'])
    expect(ingredientKcal({ qty: '1', unit: 'tsp' }, NUTRITION.get('salt'))).toBe(0)
  })
  it('adds up protein, carbs and fat the same way', () => {
    const r = recipeMacros(
      [
        { qty: '2', unit: '', name: 'eggs' },
        { qty: '100', unit: 'g', name: 'flour' },
        { qty: '', unit: '', name: 'salt' },
        { qty: '1', unit: '', name: 'mystery' },
      ],
      match,
    )
    expect(r.protein).toBeCloseTo(12.6 + 10, 1)
    expect(r.carbs).toBeCloseTo(0.7 + 76, 1)
    expect(r.fat).toBeCloseTo(9.5 + 1, 1)
    expect(r.missing).toEqual(['mystery'])
    expect(formatGrams(4.26)).toBe('4,3')
    expect(formatGrams(42.6)).toBe('43')
  })
  it('formats with a space for thousands', () => {
    expect(formatKcal(2083).replace(/\s/g, ' ')).toBe('2 080')
    expect(formatKcal(47.4)).toBe('47')
  })
})

describe('portionKcal', () => {
  const match = (name) => NUTRITION.get(name.toLowerCase())
  it('divides the recipe by its portions', () => {
    const r = { servings: 4, ingredients: [{ name: 'flour', qty: '400', unit: 'g' }] }
    expect(portionKcal(r, match)).toBeCloseTo(flour.kcal, 5)
  })
  it('is unknown without portions or calories', () => {
    expect(portionKcal({ ingredients: [{ name: 'flour', qty: '400', unit: 'g' }] }, match)).toBeNull()
    expect(portionKcal({ servings: 2, ingredients: [{ name: 'flour' }] }, match)).toBeNull()
  })
})
