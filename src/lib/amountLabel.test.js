import { describe, expect, it } from 'vitest'
import { amountLabel } from './scale.js'

describe('amountLabel', () => {
  it('writes decimal spoons, cups and sticks as fractions', () => {
    expect(amountLabel('0,75', 'stick')).toBe('¾ stick')
    expect(amountLabel('0,33', 'cup')).toBe('⅓ cup')
    expect(amountLabel('0,67', 'cup')).toBe('⅔ cup')
    expect(amountLabel('1,25', 'cup')).toBe('1 ¼ cups')
    expect(amountLabel('2,5', 'tsp')).toBe('2 ½ tsp')
  })
  it('puts countable English units in the plural after more than one', () => {
    expect(amountLabel('5', 'cup')).toBe('5 cups')
    expect(amountLabel('1', 'cup')).toBe('1 cup')
    expect(amountLabel('3', 'clove')).toBe('3 cloves')
    expect(amountLabel('1 ½', 'cup')).toBe('1 ½ cups')
    expect(amountLabel('1–2', 'pinch')).toBe('1–2 pinches')
    expect(amountLabel('1', 'cups')).toBe('1 cup')
  })
  it('leaves whole numbers, metric units and other languages as written', () => {
    expect(amountLabel('113', 'g')).toBe('113 g')
    expect(amountLabel('1,5', 'lb')).toBe('1,5 lb')
    expect(amountLabel('1,25', 'kg')).toBe('1,25 kg')
    expect(amountLabel('2', 'tbsp')).toBe('2 tbsp')
    expect(amountLabel('2', 'lžíce')).toBe('2 lžíce')
    expect(amountLabel('a bit', '')).toBe('a bit')
    expect(amountLabel('', '')).toBe('')
    expect(amountLabel('4', '')).toBe('4')
    expect(amountLabel('2', 'Cup')).toBe('2 Cup')
  })
})
