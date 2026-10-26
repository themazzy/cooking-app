import { describe, expect, it } from 'vitest'
import { SEED_INGREDIENTS } from '../data/ingredients.js'
import { NUTRITION } from './calories.js'
import { buildCatalogIndex, matchIngredient } from './catalog.js'
import { allTags, mergeTags, suggestTags, tagMatches, tagsFromHashtags, tagsFromSchema } from './recipeTags.js'

const index = buildCatalogIndex(SEED_INGREDIENTS.map((e) => ({ ...e, ...NUTRITION.get(e.name.toLowerCase()) })))
const match = (name) => matchIngredient(index, name)
const ing = (qty, unit, name) => ({ qty, unit, name })
const tags = (r) => suggestTags({ servings: 4, ...r }, match).tags

describe('suggestTags', () => {
  it('finds a light baked vegetarian dish', () => {
    const t = tags({
      title: 'Roasted vegetables',
      ingredients: [ing('2', '', 'zucchini'), ing('1', '', 'red pepper'), ing('2', 'tbsp', 'olive oil'), ing('100', 'g', 'feta')],
      steps: 'Cut the vegetables.\nBake in the oven for 30 minutes.',
    })
    expect(t).toEqual(expect.arrayContaining(['Light', 'Vegetarian', 'Baked', 'Gluten-free']))
    expect(t).not.toContain('Vegan')
    expect(t).not.toContain('Dairy-free')
  })
  it('knows meat and gluten', () => {
    const t = tags({
      title: 'Smažený řízek',
      ingredients: [ing('600', 'g', 'pork'), ing('2', '', 'eggs'), ing('100', 'g', 'flour'), ing('150', 'g', 'breadcrumbs'), ing('500', 'ml', 'oil')],
      steps: 'Obalte maso a smažte dozlatova.',
    })
    expect(t).toContain('Fried')
    expect(t).not.toContain('Vegetarian')
    expect(t).not.toContain('Gluten-free')
    expect(t).not.toContain('Light')
  })
  it('finds vegan and spicy, not dairy-free twice', () => {
    const t = tags({
      title: 'Chickpea curry',
      ingredients: [ing('400', 'g', 'chickpeas'), ing('400', 'ml', 'coconut milk'), ing('1', '', 'onion'), ing('2', '', 'red chilli')],
      steps: 'Simmer everything in one pot.',
    })
    expect(t).toEqual(expect.arrayContaining(['Vegan', 'Spicy']))
    expect(t).not.toContain('Vegetarian')
    expect(t).not.toContain('Dairy-free')
  })
  it('does not call onions fried in a little oil a fried dish', () => {
    expect(tags({ ingredients: [ing('1', '', 'onion'), ing('1', 'tbsp', 'oil'), ing('500', 'g', 'beef')], steps: 'Fry the onion, add the beef and stew for an hour.' })).not.toContain('Fried')
  })
  it('reads Bulgarian and German steps', () => {
    expect(tags({ ingredients: [ing('1', '', 'chicken')], steps: 'Печете във фурна 40 минути.' })).toContain('Baked')
    expect(tags({ ingredients: [ing('1', '', 'chicken')], steps: 'Auf dem Grill 10 Minuten grillen.' })).toContain('Grilled')
    expect(tags({ ingredients: [ing('1', '', 'chicken')], steps: 'Vložte do horkovzdušné fritézy na 15 minut.' })).toContain('Air fryer')
  })
  it('counts protein per portion', () => {
    expect(tags({ servings: 2, ingredients: [ing('500', 'g', 'chicken breast'), ing('200', 'g', 'broccoli')], steps: 'Steam the broccoli.' })).toEqual(
      expect.arrayContaining(['High protein', 'Low carb', 'Steamed']),
    )
  })
  it('needs most ingredients known before saying vegetarian', () => {
    expect(tags({ ingredients: [ing('1', '', 'zxqy'), ing('2', '', 'blorp'), ing('1', '', 'onion')] })).not.toContain('Vegetarian')
  })
  it('does not read "four eggs" as baking', () => {
    expect(tags({ ingredients: [ing('4', '', 'eggs')], steps: 'Whisk four eggs.' })).not.toContain('Baked')
  })
})

describe('tags from a caption or a site', () => {
  it('reads hashtags', () => {
    expect(tagsFromHashtags('Dinner #vegan #airfryer #highprotein #fitness #ostrava')).toEqual(['Vegan', 'Air fryer', 'High protein'])
  })
  it('reads schema.org diets and keywords', () => {
    expect(tagsFromSchema({ suitableForDiet: ['https://schema.org/VeganDiet', 'https://schema.org/GlutenFreeDiet'], keywords: 'easy, low carb' })).toEqual(['Vegan', 'Gluten-free', 'Low carb'])
  })
})

describe('tag lists', () => {
  it('merges without duplicates and keeps own tags', () => {
    expect(mergeTags(['Light', 'Party food'], ['light', 'Baked'])).toEqual(['Light', 'Party food', 'Baked'])
    expect(allTags([{ tags: ['Party food'] }])).toContain('Party food')
  })
  it('lets vegan recipes count as vegetarian', () => {
    expect(tagMatches({ tags: ['Vegan'] }, 'Vegetarian')).toBe(true)
    expect(tagMatches({ tags: ['Vegan'] }, 'Fried')).toBe(false)
  })
})
