import { describe, expect, it } from 'vitest'
import { buildShoppingList, formatAmount, parseAmount, scaleAmount } from './scale.js'

describe('scaling', () => {
  it('reads amounts', () => {
    expect(parseAmount('1,5–2')).toEqual({ min: 1.5, max: 2 })
    expect(parseAmount('½')).toEqual({ min: 0.5, max: null })
    expect(parseAmount('to taste')).toBeNull()
  })
  it('formats friendly numbers', () => {
    expect(formatAmount(600, 'g')).toBe('600')
    expect(formatAmount(133.3, 'g')).toBe('135')
    expect(formatAmount(1.5, 'tbsp')).toBe('1 ½')
    expect(formatAmount(0.75, 'tsp')).toBe('¾')
    expect(formatAmount(2.5, 'dl')).toBe('2,5')
  })
  it('scales amounts and leaves words alone', () => {
    expect(scaleAmount('400', 1.5, 'g')).toBe('600')
    expect(scaleAmount('1–2', 2, 'tbsp')).toBe('2–4')
    expect(scaleAmount('2', 0.5, 'pcs')).toBe('1')
    expect(scaleAmount('', 2, '')).toBe('')
  })
})

describe('shopping list', () => {
  const shawarma = {
    title: 'Shawarma',
    ingredients: [
      { qty: '400', unit: 'g', name: 'Ground beef' },
      { qty: '2', unit: 'pcs', name: 'Flatbreads' },
      { qty: '', unit: '', name: 'Salt and pepper, to taste' },
    ],
  }
  const chili = {
    title: 'Chili',
    ingredients: [
      { qty: '0,8', unit: 'kg', name: 'ground beef' },
      { qty: '2', unit: 'dl', name: 'Smetana' },
      { qty: '300', unit: 'ml', name: 'smetana' },
      { qty: 'pinch', unit: '', name: 'Salt and pepper' },
    ],
  }
  it('adds up the same ingredient across recipes and units', () => {
    const list = buildShoppingList([
      { recipe: shawarma, factor: 2 },
      { recipe: chili, factor: 1 },
    ])
    const beef = list.find((i) => i.key === 'ground beef')
    expect([beef.qty, beef.unit]).toEqual(['1,6', 'kg'])
    expect(beef.from).toEqual(['Shawarma', 'Chili'])
    const cream = list.find((i) => i.key === 'smetana')
    expect([cream.qty, cream.unit]).toEqual(['500', 'ml'])
    expect(list.find((i) => i.key === 'flatbreads').qty).toBe('4')
    const salt = list.find((i) => i.key === 'salt and pepper')
    expect(salt.qty).toBe('')
    expect(salt.extra).toEqual(['pinch'])
  })
})
