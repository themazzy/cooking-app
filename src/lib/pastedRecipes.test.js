import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { draftFromImport } from './recipeDraft.js'
import { parseIngredientLine, parseRecipeText } from './ingredients.js'

// Whole recipes pasted on the import page, as people copy them from a post or a note
const pasted = (file) => readFileSync(resolve(__dirname, 'fixtures/pasted', file), 'utf8')
const draft = (text) => draftFromImport({ url: null, platform: 'pasted', description: text, at: 1 })

describe('pasted lasagna (Jan, 2026-10-28)', () => {
  // ▪ bullets, "Meat Sauce:" groups with no "Ingredients" heading, grams with US amounts in brackets,
  // steps numbered "1 Preheat…" with no dot
  const text = pasted('lasagna.txt')
  const d = draft(text)
  const row = (name) => d.ingredients.find((i) => i.name.startsWith(name))

  it('reads the three groups', () => {
    expect([...new Set(d.ingredients.map((i) => i.group))]).toEqual(['Meat Sauce', 'Ricotta Mixture', 'Pasta and Cheese'])
    expect(d.ingredients).toHaveLength(22)
    expect(d.ingredients.filter((i) => i.group === 'Ricotta Mixture').map((i) => i.name)).toEqual([
      'Whole milk ricotta',
      'Parmesan, finely grated',
      'Salt',
      'Black pepper',
      'Egg',
    ])
  })

  it('keeps the grams and drops the amount in brackets', () => {
    expect(row('Olive oil')).toMatchObject({ qty: '', group: 'Meat Sauce' })
    expect(row('Yellow onion')).toMatchObject({ qty: '200', unit: 'g', name: 'Yellow onion, grated' })
    expect(row('Tomato paste')).toMatchObject({ qty: '75', unit: 'g' })
    expect(row('Crushed tomatoes')).toMatchObject({ qty: '800', unit: 'g' })
    expect(row('Granulated sugar')).toMatchObject({ qty: '7–8', unit: 'g' })
    expect(row('Shredded mozz')).toMatchObject({ qty: '150', unit: 'g' })
    expect(row('Grated Parmesan')).toMatchObject({ unit: 'cup', name: 'Grated Parmesan for topping' })
    expect(d.ingredients.some((i) => /\(|Rest|Preheat/.test(i.name))).toBe(false)
  })

  it('reads the 13 steps, a line without a number joined to its step', () => {
    const steps = d.steps.split('\n')
    expect(steps).toHaveLength(13)
    expect(steps[0]).toMatch(/^Preheat oven to 400°F/)
    expect(steps[5]).toBe('Mix the ricotta, Parmesan, salt, black pepper and egg until smooth. Of heat, taste and adjust with pinch of salt and/or sugar if needed. Stir in basil')
    expect(steps[12]).toBe('Rest 20 minutes')
  })

  it('takes no group heading or "Recipe" line for the title', () => {
    expect(d.title).toBe('New recipe')
    expect(draft(`RECIPE\n\n${text}`)).toMatchObject({ title: 'New recipe', ingredients: d.ingredients, steps: d.steps })
    expect(draft(`Skillet lasagna\n\n${text}`).title).toBe('Skillet lasagna')
  })
})

describe('steps numbered without a dot', () => {
  it('leave a numbered ingredient list alone', () => {
    const r = parseRecipeText('Ingredients\n1 Large onion, finely chopped into small pieces\n2 Carrots, peeled and cut into rounds\n3 Eggs')
    expect(r.ingredients.map((i) => i.name)).toEqual(['Large onion, finely chopped into small pieces', 'Carrots, peeled and cut into rounds', 'Eggs'])
    expect(r.steps).toEqual([])
  })

  it('are read after a Method heading', () => {
    const r = parseRecipeText('Ingredients\n200 g pasta\nMethod\n1 Boil the pasta in salted water\n2 Drain it and serve')
    expect(r.steps).toEqual(['Boil the pasta in salted water', 'Drain it and serve'])
  })
})

describe('amounts', () => {
  it('reads "1/2c" as a cup, not French "c. à soupe"', () => {
    expect(parseIngredientLine('1/2c grated Parmesan')).toMatchObject({ quantity: 0.5, unit: 'cup', name: 'grated Parmesan' })
    expect(parseIngredientLine('1 C milk')).toMatchObject({ unit: 'cup', name: 'milk' })
    expect(parseIngredientLine('1 c. à soupe de sucre').unit).toBe('tbsp')
  })
})
