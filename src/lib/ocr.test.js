import { describe, expect, it } from 'vitest'
import { joinPages } from './ocr.js'

describe('joining recipe photos', () => {
  it('keeps the lines two photos share once', () => {
    const a = 'Pancakes\nIngredients:\n200 g flour\n2 eggs\n300 ml milk\n1 tbsp sugar'
    const b = '2 eggs\n300 ml milk\n1 tbsp sugar\nPinch of salt\nSteps:\n1. Mix everything.'
    expect(joinPages([a, b])).toBe('Pancakes\nIngredients:\n200 g flour\n2 eggs\n300 ml milk\n1 tbsp sugar\nPinch of salt\nSteps:\n1. Mix everything.')
  })

  it('matches lines that were read slightly differently', () => {
    const a = 'Ingredients:\n200 g hladké mouky\n2 vejce\n300 ml mléka'
    const b = '10:17 ⏰ 63\n2 vejce\n300 ml mlěka\n1 lžíce cukru'
    expect(joinPages([a, b])).toBe('Ingredients:\n200 g hladké mouky\n2 vejce\n300 ml mléka\n1 lžíce cukru')
  })

  it('drops the bottom bar of a screenshot that sits under the overlap', () => {
    const a = 'Steps:\n1. Melt the butter in a large pan.\n2. Add the onion and fry until soft.\nHome  Search  Saved'
    const b = '2. Add the onion and fry until soft.\n3. Pour in the stock and simmer.'
    expect(joinPages([a, b])).toBe('Steps:\n1. Melt the butter in a large pan.\n2. Add the onion and fry until soft.\n3. Pour in the stock and simmer.')
  })

  it('keeps photos that do not overlap apart', () => {
    expect(joinPages(['Dough:\n500 g flour', 'Filling:\n200 g cheese'])).toBe('Dough:\n500 g flour\n\nFilling:\n200 g cheese')
  })

  it('does not take a repeated short line for an overlap', () => {
    expect(joinPages(['Cake\nSalt', 'Salt\nIcing'])).toBe('Cake\nSalt\n\nSalt\nIcing')
  })
})
