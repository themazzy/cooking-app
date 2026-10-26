import { describe, expect, it } from 'vitest'
import { applyTranslation, languageName, recipeTexts, swapOriginal } from './translate.js'

const recipe = {
  title: 'Apfelkuchen',
  ingredients: [
    { qty: '200', unit: 'g', name: 'Mehl', group: 'Teig' },
    { qty: '2', unit: '', name: 'Äpfel', group: 'Teig' },
    { qty: '', unit: '', name: '', group: '' },
  ],
  steps: 'Mehl sieben.\n\nÄpfel schneiden.',
}

describe('translate', () => {
  it('collects each text once, without blanks', () => {
    expect(recipeTexts(recipe)).toEqual(['Apfelkuchen', 'Mehl', 'Teig', 'Äpfel', 'Mehl sieben.', 'Äpfel schneiden.'])
  })

  it('swaps texts but keeps amounts, units and empty lines', () => {
    const map = new Map([
      ['Apfelkuchen', 'Apple cake'],
      ['Mehl', 'flour'],
      ['Teig', 'Dough'],
      ['Äpfel', 'apples'],
      ['Mehl sieben.', 'Sift the flour.'],
      ['Äpfel schneiden.', 'Cut the apples.'],
    ])
    const t = applyTranslation(recipe, map)
    expect(t.title).toBe('Apple cake')
    expect(t.ingredients[0]).toEqual({ qty: '200', unit: 'g', name: 'flour', group: 'Dough' })
    expect(t.ingredients[2].name).toBe('')
    expect(t.steps).toBe('Sift the flour.\n\nCut the apples.')
  })

  it('switches between translation and original', () => {
    const translated = { ...recipe, title: 'Apple cake', lang: 'en', original: { lang: 'de', title: 'Apfelkuchen', ingredients: recipe.ingredients, steps: recipe.steps } }
    const orig = swapOriginal(translated)
    expect(orig.title).toBe('Apfelkuchen')
    expect(orig.lang).toBe('de')
    expect(orig.original.title).toBe('Apple cake')
    expect(swapOriginal(orig).title).toBe('Apple cake')
  })

  it('names languages', () => {
    expect(languageName('de')).toBe('German')
    expect(languageName('cs')).toBe('Czech')
  })
})
