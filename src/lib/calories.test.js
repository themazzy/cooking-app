import { describe, expect, it } from 'vitest'
import { NUTRITION, formatKcal, gramsOf, ingredientKcal, recipeCalories } from './calories.js'
import { SEED_INGREDIENTS } from '../data/ingredients.js'

const egg = NUTRITION.get('eggs')
const flour = NUTRITION.get('flour')

describe('nutrition data', () => {
  it('has calories for every catalog ingredient', () => {
    const missing = SEED_INGREDIENTS.filter((e) => NUTRITION.get(e.name.toLowerCase())?.kcal == null).map((e) => e.name)
    expect(missing).toEqual([])
  })
})

describe('gramsOf', () => {
  it('reads weights, volumes with density, and pieces', () => {
    expect(gramsOf({ qty: '200', unit: 'g' }, flour)).toBe(200)
    expect(gramsOf({ qty: '0,5', unit: 'kg' }, flour)).toBe(500)
    expect(gramsOf({ qty: '1', unit: 'cup' }, flour)).toBeCloseTo(127, 0)
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
  it('formats with a space for thousands', () => {
    expect(formatKcal(2083).replace(/\s/g, ' ')).toBe('2 080')
    expect(formatKcal(47.4)).toBe('47')
  })
})
