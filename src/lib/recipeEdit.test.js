import { describe, expect, it } from 'vitest'
import { joinSteps, recipeToText, toEditable } from './recipeEdit.js'
import { splitSteps } from './cook.js'

describe('editable recipe', () => {
  const parsed = {
    ingredients: [
      { quantity: 400, unit: 'g', name: 'Ground beef' },
      { quantity: 1.5, quantityMax: 2, unit: 'tbsp', name: 'Dill', group: 'Tzatziki sauce' },
      { quantity: null, unit: null, name: 'Salt and pepper', note: 'to taste', group: 'Tzatziki sauce' },
    ],
    steps: ['Preheat the oven.', 'Bake 20 min.'],
  }

  it('turns parsed ingredients into text fields', () => {
    const r = toEditable(parsed)
    expect(r.ingredients[0]).toEqual({ qty: '400', unit: 'g', name: 'Ground beef', group: '' })
    expect(r.ingredients[1].qty).toBe('1,5–2')
    expect(r.ingredients[2]).toEqual({ qty: '', unit: '', name: 'Salt and pepper, to taste', group: 'Tzatziki sauce' })
    expect(r.steps).toBe('Preheat the oven.\nBake 20 min.')
  })

  it('starts imported ingredient names with a capital letter and keeps the rest as written', () => {
    const r = toEditable({
      ingredients: [
        { quantity: 2, unit: null, name: 'cloves of garlic' },
        { quantity: 1, unit: null, name: 'лук' },
        { quantity: 200, unit: 'g', name: 'hladká mouka' },
        { quantity: 1, unit: null, name: '"extra" virgin olive oil' },
        { quantity: 1, unit: 'tbsp', name: 'soy sauce (low sodium)' },
      ],
      steps: [],
    })
    expect(r.ingredients.map((i) => i.name)).toEqual([
      'Garlic',
      'Лук',
      'Hladká mouka',
      '"Extra" virgin olive oil',
      'Soy sauce (low sodium)',
    ])
  })

  it('writes the recipe as text with groups and numbered steps', () => {
    expect(recipeToText(toEditable(parsed), 'Shawarma')).toBe(
      'Shawarma\n\n• 400 g Ground beef\n\nTzatziki sauce:\n• 1,5–2 tbsp Dill\n• Salt and pepper, to taste\n\nSteps:\n1. Preheat the oven.\n2. Bake 20 min.',
    )
  })
  it('stores the step boxes as numbered text that splits back into the same steps', () => {
    const boxes = ['Chop the onion,', 'then fry it.\nStir often.', '', 'For the sauce: mix it all.']
    const text = joinSteps(boxes)
    expect(text).toBe('1. Chop the onion,\n2. then fry it.\nStir often.\n3. For the sauce: mix it all.')
    expect(splitSteps(text)).toEqual(['Chop the onion,', 'then fry it. Stir often.', 'For the sauce: mix it all.'])
  })
})
