import { describe, expect, it } from 'vitest'
import { convertIngredient, convertTemperatures, hasUnits } from './units.js'

const c = (qty, unit, system) => {
  const r = convertIngredient({ qty, unit, name: 'x' }, system)
  return `${r.qty} ${r.unit}`
}

describe('metric', () => {
  it('converts US units', () => {
    expect(c('8', 'oz', 'metric')).toBe('225 g')
    expect(c('2', 'lb', 'metric')).toBe('905 g')
    expect(c('3', 'lb', 'metric')).toBe('1,4 kg')
    expect(c('1', 'cup', 'metric')).toBe('240 ml')
    expect(c('1–2', 'cups', 'metric')).toBe('240–480 ml')
    expect(c('2', 'tbsp', 'metric')).toBe('2 tbsp')
  })
})

describe('imperial', () => {
  it('converts metric units', () => {
    expect(c('200', 'g', 'imperial')).toBe('7 oz')
    expect(c('500', 'g', 'imperial')).toBe('1 lb')
    expect(c('1', 'kg', 'imperial')).toBe('2 ¼ lb')
    expect(c('250', 'ml', 'imperial')).toBe('1 cup')
    expect(c('120', 'ml', 'imperial')).toBe('½ cup')
    expect(c('30', 'ml', 'imperial')).toBe('2 tbsp')
    expect(c('2', 'l', 'imperial')).toBe('2 qt')
  })
  it('leaves amounts without units alone', () => {
    expect(c('2', '', 'imperial')).toBe('2 ')
    expect(c('', 'g', 'imperial')).toBe(' g')
  })
})

it('converts oven temperatures', () => {
  expect(convertTemperatures('Bake at 350°F for 20 min', 'metric')).toBe('Bake at 175 °C for 20 min')
  expect(convertTemperatures('Bake at 180 °C', 'imperial')).toBe('Bake at 355 °F')
  expect(convertTemperatures('Bake at 180 °C', 'metric')).toBe('Bake at 180 °C')
})

it('tells whether there is anything to convert', () => {
  expect(hasUnits([{ qty: '200', unit: 'g' }], 'imperial')).toBe(true)
  expect(hasUnits([{ qty: '2', unit: 'tbsp' }], 'imperial')).toBe(false)
})
