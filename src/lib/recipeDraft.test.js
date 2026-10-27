import { describe, expect, it } from 'vitest'
import { detectServings, draftFromImport, draftFromTranslatedSource, sourceLines, titleFrom } from './recipeDraft.js'

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

describe('reading a recipe through English', () => {
  // A Turkish caption: the parser knows no Turkish units or headings
  const result = { description: 'Köfte\nKöfte için:\n500 gr kıyma\n1 yemek kaşığı tuz\nSos için:\n2 yemek kaşığı salça', comments: [] }
  const english = ['Meatballs', 'For the meatballs:', '500 g minced meat', '1 tablespoon salt', 'For the sauce:', '2 tablespoons tomato paste']

  it('translates the lines the recipe was read from', () => {
    expect(sourceLines(result)).toHaveLength(6)
  })

  it('reads the English lines and keeps the first reading as the original', () => {
    const draft = draftFromImport(result)
    const read = draftFromTranslatedSource(draft, 'Meatballs', english, 'tr')
    expect(read.ingredients.map((i) => [i.group, i.qty, i.unit, i.name])).toEqual([
      ['For the meatballs', '500', 'g', 'Minced meat'],
      ['For the meatballs', '1', 'tbsp', 'Salt'],
      ['For the sauce', '2', 'tbsp', 'Tomato paste'],
    ])
    expect(read.lang).toBe('en')
    expect(read.original).toMatchObject({ lang: 'tr', title: draft.title, ingredients: draft.ingredients })
  })

  it('keeps the first reading when the translation reads worse', () => {
    const draft = draftFromImport(result)
    expect(draftFromTranslatedSource(draft, 'x', ['Meatballs', 'some meat'], 'tr')).toBeNull()
  })
})
