import { describe, expect, it } from 'vitest'
import { applyTranslation, batches, googleLines, languageName, nanoLines, nanoPrompt, pieces, recipeTexts, swapOriginal } from './translate.js'

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

describe('translation engines', () => {
  it('batches texts by size', () => {
    expect(batches(['aaaa', 'bbbb', 'cccc'], 12)).toEqual([[0], [1], [2]])
    expect(batches(['a', 'b', 'c'], 100)).toEqual([[0, 1, 2]])
  })

  it('reads Google Translate lines', () => {
    const data = [[['Chicken paprikash\n', 'Kuře na paprice\n'], ['plain flour\n', 'hladká mouka\n'], ['salt', 'sůl']], null, 'cs']
    expect(googleLines(data)).toEqual(['Chicken paprikash', 'plain flour', 'salt'])
  })

  it('numbers lines for Gemini Nano and reads them back', () => {
    const prompt = nanoPrompt(['hladká mouka', 'sůl'], 'cs', 'en')
    expect(prompt).toContain('from Czech to English')
    expect(prompt).toContain('1| hladká mouka\n2| sůl')
    expect(nanoLines('Here you go:\n1| plain flour\n2| salt', 2)).toEqual(['plain flour', 'salt'])
    expect(nanoLines('1| plain flour', 3)).toBe(null)
  })
})

describe('pieces', () => {
  it('cuts long texts at sentence ends, short ones stay whole', () => {
    expect(pieces('Short.', 200)).toEqual(['Short.'])
    const long = 'Mix the flour and water. ' + 'Knead it well for ten minutes. '.repeat(10)
    const out = pieces(long, 120)
    expect(out.every((p) => p.length <= 120)).toBe(true)
    expect(out.join(' ')).toBe(long.trim())
    expect(out[0].endsWith('.')).toBe(true)
  })
})

describe('applyTranslation and groups', () => {
  it('translates group names and tidies units left in names', () => {
    const map = new Map([
      ['Na omáčku', 'For the sauce'],
      ['polévkové lžíce vody', 'tablespoons of water'],
    ])
    const out = applyTranslation({ title: '', steps: '', ingredients: [{ qty: '2', unit: '', name: 'polévkové lžíce vody', group: 'Na omáčku' }] }, map)
    expect(out.ingredients).toEqual([{ qty: '2', unit: 'tbsp', name: 'water', group: 'For the sauce' }])
  })
})
