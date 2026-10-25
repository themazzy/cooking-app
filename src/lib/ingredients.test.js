import { describe, expect, it } from 'vitest'
import { parseIngredientLine, parseQuantity, parseRecipeText } from './ingredients.js'

describe('parseQuantity', () => {
  it.each([
    ['2', 2],
    ['1,5', 1.5],
    ['0.25', 0.25],
    ['1/2', 0.5],
    ['1 1/2', 1.5],
    ['½', 0.5],
    ['1½', 1.5],
  ])('%s → %s', (s, n) => expect(parseQuantity(s)).toBeCloseTo(n))
})

describe('parseIngredientLine', () => {
  it.each([
    ['200 g hladké mouky', 200, 'g', 'hladké mouky'],
    ['200g flour', 200, 'g', 'flour'],
    ['- 2 lžíce olivového oleje', 2, 'tbsp', 'olivového oleje'],
    ['• 1/2 cup sugar', 0.5, 'cup', 'sugar'],
    ['2 eggs', 2, null, 'eggs'],
    ['3 stroužky česneku', 3, 'clove', 'česneku'],
    ['1 tsp of salt', 1, 'tsp', 'salt'],
    ['mouka 200 g', 200, 'g', 'mouka'],
    ['Flour - 2 cups', 2, 'cup', 'Flour'],
    ['cukr: 2 lžíce', 2, 'tbsp', 'cukr'],
    ['🧈 50 g másla', 50, 'g', 'másla'],
    ['1 l mléka', 1, 'l', 'mléka'],
  ])('%s', (line, quantity, unit, name) => {
    expect(parseIngredientLine(line)).toMatchObject({ quantity, unit, name })
  })

  it('reads ranges', () => {
    expect(parseIngredientLine('2-3 stroužky česneku')).toMatchObject({ quantity: 2, quantityMax: 3, unit: 'clove' })
  })

  it('does not take "1 large egg" as litres', () => {
    expect(parseIngredientLine('1 large egg')).toMatchObject({ quantity: 1, unit: null, name: 'large egg' })
  })

  it('ignores lines without a quantity', () => {
    expect(parseIngredientLine('sůl a pepř')).toBeNull()
  })
})

describe('parseRecipeText', () => {
  it('splits a Czech caption into ingredients and steps', () => {
    const caption = `Nejlepší rychlé těstoviny 🍝

Suroviny:
- 250 g špaget
- 2 stroužky česneku
- 3 lžíce olivového oleje
- sůl a pepř
- parmazán

Postup:
1. Uvař těstoviny v osolené vodě.
2. Na oleji krátce osmaž česnek.
3. Smíchej a posyp parmazánem.

#recept #těstoviny #rychlevareni`
    const { ingredients, steps } = parseRecipeText(caption)
    expect(ingredients.map((i) => i.name)).toEqual(['špaget', 'česneku', 'olivového oleje', 'sůl a pepř', 'parmazán'])
    expect(ingredients[0]).toMatchObject({ quantity: 250, unit: 'g' })
    expect(steps).toEqual([
      'Uvař těstoviny v osolené vodě.',
      'Na oleji krátce osmaž česnek.',
      'Smíchej a posyp parmazánem.',
    ])
  })

  it('finds ingredients in an English caption without headers', () => {
    const caption = `Easy banana bread!
3 ripe bananas
200g flour
1 tsp baking soda
100 g butter, melted
Mix everything and bake for 50 minutes at 180°C.`
    const { ingredients } = parseRecipeText(caption)
    expect(ingredients.map((i) => [i.quantity, i.unit, i.name])).toEqual([
      [3, null, 'ripe bananas'],
      [200, 'g', 'flour'],
      [1, 'tsp', 'baking soda'],
      [100, 'g', 'butter, melted'],
    ])
  })

  it('keeps numbered ingredient lines as ingredients inside an ingredient list', () => {
    const { ingredients, steps } = parseRecipeText('Ingredients:\n1. 200 g rice\n2. 1 onion')
    expect(ingredients).toHaveLength(2)
    expect(steps).toHaveLength(0)
  })
})

describe('author comment from a real reel', () => {
  const comment = `Ingredients for 2 servings:
• Ground beef: 400g
• Fresh tomatoes: 250g
• Red onion (to taste)
• Flatbreads (lavash, pita, or tortillas): 2 pcs
• Spices for the meat: paprika, chili powder, black pepper, dried garlic, salt — 1 teaspoon each
Tzatziki sauce:
• Greek yogurt: 200g
• Grated cucumber: 3 tablespoons
• Garlic: 2 whole heads (for roasting)
• Mint: 1 teaspoon
• Salt and pepper: to taste
• Lemon juice: 1 tablespoon
Instructions:
Preheat the oven to 200°C (392°F).
Place the ground beef on a sheet of parchment paper, cover with another sheet, and roll it out into an even thin layer.`

  const { ingredients, steps } = parseRecipeText(comment)
  const byName = Object.fromEntries(ingredients.map((i) => [i.name, i]))

  it('reads every ingredient line', () => {
    expect(ingredients).toHaveLength(15)
    expect(byName['Ground beef']).toMatchObject({ quantity: 400, unit: 'g' })
    expect(byName['Flatbreads (lavash, pita, or tortillas)']).toMatchObject({ quantity: 2, unit: 'pcs' })
    expect(byName['Red onion (to taste)']).toMatchObject({ quantity: null })
  })

  it('keeps notes after the amount', () => {
    // "Spices for the meat: paprika, …, salt — 1 teaspoon each" is one line per spice
    for (const spice of ['paprika', 'chili powder', 'black pepper', 'dried garlic', 'salt']) expect(byName[spice]).toMatchObject({ quantity: 1, unit: 'tsp' })
    expect(byName.Garlic).toMatchObject({ quantity: 2, unit: null, note: 'whole heads (for roasting)' })
  })

  it('groups the sauce ingredients', () => {
    expect(byName['Greek yogurt']).toMatchObject({ quantity: 200, unit: 'g', group: 'Tzatziki sauce' })
    expect(byName['Ground beef'].group).toBeUndefined()
    expect(byName['Salt and pepper']).toMatchObject({ quantity: null, note: 'to taste', group: 'Tzatziki sauce' })
  })

  it('reads the instructions', () => {
    expect(steps).toHaveLength(2)
    expect(steps[0]).toBe('Preheat the oven to 200°C (392°F).')
  })
})

describe('amount-less labelled lines', () => {
  it('keeps "to taste" as a note', async () => {
    const { parseIngredientLine } = await import('./ingredients.js')
    expect(parseIngredientLine('• Salt and pepper: to taste')).toMatchObject({ name: 'Salt and pepper', note: 'to taste', quantity: null })
    expect(parseIngredientLine('Sůl: podle chuti')).toMatchObject({ name: 'Sůl', note: 'podle chuti' })
  })
})

describe('several ingredients on one line', () => {
  const names = (text) => parseRecipeText(text).ingredients.map((i) => [i.quantity, i.unit, i.name])
  it('splits amounts listed together', () => {
    expect(names('Ingredients:\n1 tsp cumin, 1 tsp paprika, ½ tsp turmeric and 1 tsp garam masala')).toEqual([
      [1, 'tsp', 'cumin'],
      [1, 'tsp', 'paprika'],
      [0.5, 'tsp', 'turmeric'],
      [1, 'tsp', 'garam masala'],
    ])
  })
  it('splits a labelled list of spices', () => {
    expect(names('Ingredients:\nSpices: cumin, paprika, turmeric and chilli powder')).toEqual([
      [null, null, 'cumin'],
      [null, null, 'paprika'],
      [null, null, 'turmeric'],
      [null, null, 'chilli powder'],
    ])
  })
  it('keeps one ingredient with its preparation together', () => {
    expect(names('Ingredients:\n1 onion, finely chopped, divided\n2 cloves garlic, minced\nsalt and pepper')).toEqual([
      [1, null, 'onion, finely chopped, divided'],
      [2, 'clove', 'garlic, minced'],
      [null, null, 'salt and pepper'],
    ])
  })
  it('keeps decimal commas', () => {
    expect(names('Ingredients:\n1,5 kg potatoes')).toEqual([[1.5, 'kg', 'potatoes']])
  })
})

describe('measurements in names', () => {
  it('moves them out of the name', () => {
    expect(parseIngredientLine('1.5 lb ground beef (680g)')).toMatchObject({ quantity: 1.5, unit: 'lb', name: 'ground beef' })
    expect(parseIngredientLine('1 lb/450g ground beef')).toMatchObject({ quantity: 1, unit: 'lb', name: 'ground beef' })
    expect(parseIngredientLine('2 cups (480 ml) milk')).toMatchObject({ quantity: 2, unit: 'cup', name: 'milk' })
    expect(parseIngredientLine('1 can (400 g / 14 oz) chickpeas')).toMatchObject({ quantity: 1, unit: 'can', name: 'chickpeas' })
    expect(parseIngredientLine('3 eggs')).toMatchObject({ name: 'eggs' })
  })
})

it('gives "each" amounts to every ingredient', () => {
  const names = (text) => parseRecipeText(text).ingredients.map((i) => [i.quantity, i.unit, i.name])
  expect(names('Ingredients:\n1 tsp each of cumin, coriander, paprika and turmeric')).toEqual([
    [1, 'tsp', 'cumin'],
    [1, 'tsp', 'coriander'],
    [1, 'tsp', 'paprika'],
    [1, 'tsp', 'turmeric'],
  ])
  expect(names('Ingredients:\nsalt, pepper and oregano, 1 tsp each')).toEqual([
    [1, 'tsp', 'salt'],
    [1, 'tsp', 'pepper'],
    [1, 'tsp', 'oregano'],
  ])
})
