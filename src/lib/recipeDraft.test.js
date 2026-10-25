import { describe, expect, it } from 'vitest'
import { detectServings, draftFromImport, titleFrom } from './recipeDraft.js'

describe('recipe drafts', () => {
  it('finds the number of portions', () => {
    expect(detectServings('Ingredients for 2 servings:')).toBe(2)
    expect(detectServings('Serves 4')).toBe(4)
    expect(detectServings('Recept pro 6 osob')).toBe(6)
    expect(detectServings('(4 porce)')).toBe(4)
    expect(detectServings('Porce: 3')).toBe(3)
    expect(detectServings('Bake 20 minutes at 200 °C')).toBeNull()
  })

  it('takes the title from the first real line', () => {
    expect(titleFrom('🔥🔥\nDelicious beef shawarma 🌯\n\n#cooking #food')).toBe('Delicious beef shawarma')
    expect(titleFrom('#a #b', 'Recipe from chef')).toBe('Recipe from chef')
  })

  it('builds a draft from the author comment', () => {
    const d = draftFromImport({
      url: 'https://www.instagram.com/reel/X/',
      platform: 'instagram',
      author: 'chef',
      description: 'Delicious beef shawarma\n\n#cooking',
      comments: [{ author: 'chef', pinned: true, text: 'Ingredients for 2 servings:\n• Ground beef: 400g\n• Fresh tomatoes: 250g' }],
    })
    expect(d.title).toBe('Delicious beef shawarma')
    expect(d.servings).toBe(2)
    expect(d.ingredients.map((i) => i.name)).toEqual(['Ground beef', 'Fresh tomatoes'])
    expect(d.sourceUrl).toBe('https://www.instagram.com/reel/X/')
  })
})
