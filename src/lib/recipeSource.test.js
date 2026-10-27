import { describe, expect, it } from 'vitest'
import { addFromTranscript, pickRecipe, recipeInText, usableRecipe } from './recipeSource.js'
import { parseRecipeText } from './ingredients.js'

const recipe = 'Ingredients:\n- 400 g ground beef\n- 250 g tomatoes\n- 2 flatbreads\nInstructions:\nRoll out the meat.'

describe('pickRecipe', () => {
  it('uses the author comment when the description has no recipe', () => {
    const r = pickRecipe({
      description: 'Best kebab ever 🔥 recipe in the comments',
      author: 'chef',
      comments: [
        { author: 'fan', text: 'Looks great!' },
        { author: 'chef', text: recipe, pinned: true },
      ],
    })
    expect(r.source).toBe("author's comment")
    expect(r.ingredients).toHaveLength(3)
  })

  it('keeps the description when it has the recipe', () => {
    expect(pickRecipe({ description: recipe, author: 'chef', comments: [{ author: 'fan', text: '2 eggs? 1 cup?' }] }).source).toBe('description')
  })

  it('ignores a comment with a single quantity', () => {
    const r = pickRecipe({ description: 'Yum', comments: [{ author: 'fan', text: 'add 2 eggs' }], transcript: 'Take 200 g flour. Mix.' })
    expect(r.source).toBe('transcript')
  })
})

describe('usableRecipe / recipeInText', () => {
  const r = (description, comments = [], author = 'chef') => recipeInText({ description, comments, author })

  it('finds a written recipe, so the video need not be heard', () => {
    expect(r(recipe)?.source).toBe('description')
    expect(r('So good!', [{ author: 'chef', text: recipe, pinned: true }])?.source).toBe("author's comment")
    // Two amounts and a step are enough
    expect(r('Teriyaki chicken 🔥\n500 g chicken\n2 tbsp soy sauce\nMethod:\nFry everything for 10 minutes.')).not.toBeNull()
  })

  it('is not fooled by a caption without a recipe', () => {
    expect(r('Best pasta ever 🍝 recipe in bio #pasta #dinner')).toBeNull()
    expect(r('Just 2 eggs and love ❤️')).toBeNull()
    expect(r('Yum', [{ author: 'fan', text: 'add 2 eggs and 1 cup milk?' }])).toBeNull()
    expect(r(null, [])).toBeNull()
  })

  it('counts a long list without amounts only with steps', () => {
    const list = 'Ingredients:\n- salt\n- pepper\n- garlic\n- onion\n- olive oil'
    expect(usableRecipe(parseRecipeText(list))).toBe(false)
    expect(usableRecipe(parseRecipeText(`${list}\nSteps:\n1. Chop the onion.\n2. Fry it in the oil.`))).toBe(true)
  })

  it('prefers the transcript over a thin caption', () => {
    const p = pickRecipe({ description: 'Just 2 eggs and love', transcript: 'Take 200 g flour. Add 2 eggs. Pour in 300 ml milk. Whisk and fry.' })
    expect(p.source).toBe('transcript')
  })
})

describe('addFromTranscript', () => {
  const current = { ingredients: [{ qty: '200', unit: 'g', name: 'Flour', group: '' }, { qty: '2', unit: '', name: 'eggs', group: 'Batter' }], steps: '' }
  const heard = { ingredients: [{ qty: '2', unit: '', name: 'Eggs', group: '' }, { qty: '300', unit: 'ml', name: 'milk', group: 'X' }], steps: 'Whisk.\nFry.' }

  it('adds only the missing ingredients and steps when there are none', () => {
    const m = addFromTranscript(current, heard)
    expect(m.added).toBe(1)
    expect(m.ingredients.map((i) => i.name)).toEqual(['Flour', 'eggs', 'milk'])
    expect(m.ingredients[2].group).toBe('')
    expect(m.steps).toBe('Whisk.\nFry.')
  })

  it('keeps the recipe steps that are there', () => {
    expect(addFromTranscript({ ...current, steps: 'Mix.' }, heard).steps).toBe('Mix.')
  })
})
