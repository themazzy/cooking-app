import { expect, it } from 'vitest'
import { SEED_INGREDIENTS } from '../data/ingredients.js'
import { defaultUnit, joinAmount, splitAmount, STOCK_UNITS } from './defaultUnit.js'

it('gives every catalog ingredient a unit people stock it in', () => {
  const byName = Object.fromEntries(SEED_INGREDIENTS.map((e) => [e.name, defaultUnit(e)]))
  expect(byName).toMatchObject({ Milk: 'ml', Eggs: 'pcs', Flour: 'g', Garlic: 'head', Parsley: 'bunch', 'Olive oil': 'ml', Onion: 'pcs', Penne: 'g', Feta: 'g' })
  for (const e of SEED_INGREDIENTS) expect(STOCK_UNITS).toContain(defaultUnit(e))
  expect(defaultUnit({ name: 'Madeta butter', base: 'Butter', aisle: 'Dairy & eggs' })).toBe('g')
})

it('splits and joins amounts', () => {
  expect(splitAmount('1,5 kg')).toEqual(['1,5', 'kg'])
  expect(splitAmount('6')).toEqual(['6', 'pcs'])
  expect(splitAmount('')).toEqual(['', ''])
  expect(joinAmount('6', 'pcs')).toBe('6')
  expect(joinAmount('500', 'ml')).toBe('500 ml')
  expect(joinAmount('', 'ml')).toBe('')
})
