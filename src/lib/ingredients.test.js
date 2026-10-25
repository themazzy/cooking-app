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
