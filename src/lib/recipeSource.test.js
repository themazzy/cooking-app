import { describe, expect, it } from 'vitest'
import { pickRecipe } from './recipeSource.js'

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
