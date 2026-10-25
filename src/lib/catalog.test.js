import { describe, expect, it } from 'vitest'
import { buildCatalogIndex, imageUrl, matchIngredient, normalizeName } from './catalog.js'
import { SEED_INGREDIENTS } from '../data/ingredients.js'

const index = buildCatalogIndex(SEED_INGREDIENTS)
const m = (name) => matchIngredient(index, name)?.name ?? null

describe('ingredient catalog', () => {
  it('normalizes names', () => {
    expect(normalizeName('Cherry Tomatoes (halved)')).toBe('cherry tomato')
    expect(normalizeName('Fresh berries, washed')).toBe('fresh berry')
  })

  it('has no duplicate names', () => {
    const names = SEED_INGREDIENTS.map((e) => e.name.toLowerCase())
    expect(new Set(names).size).toBe(names.length)
  })

  it('matches names, aliases, plurals and descriptions', () => {
    expect(m('Ground beef')).toBe('Ground beef')
    expect(m('lean minced beef')).toBe('Ground beef')
    expect(m('2 boneless skinless chicken breasts, diced')).toBe('Chicken breast')
    expect(m('Chicken')).toBe('Chicken')
    expect(m('Fresh tomatoes')).toBe('Tomatoes')
    expect(m('cherry tomatoes')).toBe('Cherry tomatoes')
    expect(m('Red onion')).toBe('Red onion')
    expect(m('Salt and pepper, to taste')).toBe('Salt and pepper')
    expect(m('Flatbreads (lavash, pita, or tortillas)')).toBe('Flatbread')
    expect(m('Grated cucumber')).toBe('Cucumber')
    expect(m('Garlic')).toBe('Garlic')
    expect(m('Extra virgin olive oil')).toBe('Olive oil')
    expect(m('Greek yogurt')).toBe('Greek yogurt')
    expect(m('Spices for the meat')).toBeNull()
  })

  it('builds picture URLs like TheMealDB', () => {
    expect(imageUrl({ image: 'Minced Beef' })).toBe('https://www.themealdb.com/images/ingredients/minced_beef-small.png')
    expect(imageUrl({ image: null })).toBeNull()
  })
})
