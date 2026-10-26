import { describe, expect, it } from 'vitest'
import { convertIngredient, convertTemperatures, hasUnits } from './units.js'
import { buildCatalogIndex, matchIngredient } from './catalog.js'
import { SEED_INGREDIENTS } from '../data/ingredients.js'
import { NUTRITION } from './calories.js'

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

describe('dry ingredients in metric', () => {
  const index = buildCatalogIndex(SEED_INGREDIENTS)
  const match = (name) => {
    const e = matchIngredient(index, name)
    return e && { ...e, density: NUTRITION.get(e.name.toLowerCase())?.density ?? null }
  }
  const d = (qty, unit, name) => {
    const r = convertIngredient({ qty, unit, name }, 'metric', match)
    return `${r.qty} ${r.unit}`
  }
  it('weighs flour, sugar and semolina', () => {
    expect(d('2', 'cups', 'all-purpose flour')).toBe('260 g')
    expect(d('1', 'cup', 'sugar')).toBe('205 g')
    expect(d('1 ¼', 'cups', 'cream of wheat')).toBe('210 g')
    expect(d('2', 'dl', 'krupice')).toBe('140 g')
  })
  it('keeps spoons, and liquids in ml', () => {
    expect(d('0,5', 'tbsp', 'potato starch')).toBe('0,5 tbsp')
    expect(d('1', 'cup', 'milk')).toBe('240 ml')
    expect(d('250', 'ml', 'milk')).toBe('250 ml')
    expect(d('2', 'tbsp', 'olive oil')).toBe('2 tbsp')
    expect(d('1', 'cup', 'olive oil')).toBe('240 ml')
    expect(d('½', 'cup', 'honey')).toBe('120 ml')
    expect(d('1', 'tsp', 'vanilla extract')).toBe('1 tsp')
  })
  it('weighs grated cheese, chopped vegetables, berries and brown sugar', () => {
    expect(d('1', 'cup', 'grated parmesan')).toBe('96 g')
    expect(d('1', 'cup', 'diced onion')).toBe('160 g')
    expect(d('1', 'cup', 'blueberries')).toBe('145 g')
    expect(d('1', 'cup', 'brown sugar')).toBe('215 g')
    expect(d('1', 'cup', 'rolled oats')).toBe('96 g')
  })
})
