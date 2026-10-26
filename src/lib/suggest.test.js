import { describe, expect, it } from 'vitest'
import { SEED_INGREDIENTS } from '../data/ingredients.js'
import { buildCatalogIndex, matchIngredient, normalizeName } from './catalog.js'
import { commonKeys, isMeal, leftoverSuggestions, leftovers, planWeek } from './suggest.js'

const index = buildCatalogIndex(SEED_INGREDIENTS)
const match = (name) => matchIngredient(index, name)
const canonical = (name) => {
  const e = match(name)
  return e ? (e.base ?? e.name).toLowerCase() : normalizeName(name)
}
const ctx = { canonical, match }
const ing = (...names) => names.map((name) => ({ name }))
const NOW = new Date(2026, 9, 26).getTime()
const DAY = 864e5

const curry = { id: 'curry', title: 'Chicken curry', ingredients: ing('chicken breast', 'cream', 'fresh coriander', 'rice') }
const soup = { id: 'soup', title: 'Coriander soup', ingredients: ing('fresh coriander', 'potatoes', 'cream') }
const pasta = { id: 'pasta', title: 'Pasta', ingredients: ing('spaghetti', 'olive oil') }
const cake = { id: 'cake', title: 'Cake', categories: ['Dessert'], ingredients: ing('cream', 'flour', 'sugar') }

describe('leftovers', () => {
  it('takes perishable ingredients of planned recipes, not dry goods', () => {
    const left = leftovers([curry], [], ctx)
    const names = [...left.values()].map((l) => l.name.toLowerCase())
    expect(names.some((n) => n.includes('coriander'))).toBe(true)
    expect(names.some((n) => n.includes('cream'))).toBe(true)
    expect(names.some((n) => n === 'rice')).toBe(false)
  })
  it('adds pantry items close to their use-by date', () => {
    const pantry = [
      { name: 'Spinach', amount: '200 g', expires_on: '2026-10-27' },
      { name: 'Cheddar', amount: '200 g', expires_on: '2026-11-20' },
    ]
    const left = leftovers([], pantry, ctx, { today: new Date(NOW) })
    expect([...left.values()]).toEqual([{ name: expect.stringMatching(/spinach/i), soon: true }])
  })
  it('suggests recipes that share them, best first', () => {
    const left = leftovers([curry], [], ctx)
    const s = leftoverSuggestions([curry, soup, pasta], left, canonical, { exclude: new Set(['curry']) })
    expect(s.map((x) => x.recipe.id)).toEqual(['soup'])
    expect(s[0].uses.length).toBe(2)
  })
  it('ignores ingredients in most recipes', () => {
    const many = Array.from({ length: 6 }, (_, n) => ({ id: `r${n}`, ingredients: ing('onion', n % 2 ? 'carrot' : 'beef') }))
    expect(commonKeys(many, canonical).has(canonical('onion'))).toBe(true)
    expect(commonKeys(many, canonical).has(canonical('carrot'))).toBe(false)
  })
})

describe('plan my week', () => {
  const noJitter = () => 0
  it('fills each day once, with meals only', () => {
    const picks = planWeek(['d1', 'd2', 'd3', 'd4'], [curry, soup, pasta, cake], { ...ctx, now: NOW, random: noJitter })
    expect(picks.map((p) => p.day)).toEqual(['d1', 'd2', 'd3'])
    expect(new Set(picks.map((p) => p.recipe.id)).size).toBe(3)
    expect(picks.some((p) => p.recipe.id === 'cake')).toBe(false)
    expect(isMeal(cake)).toBe(false)
  })
  it('follows a recipe with one that uses its leftovers', () => {
    const picks = planWeek(['d1'], [soup, pasta], { ...ctx, planned: [curry], now: NOW, random: noJitter })
    expect(picks[0].recipe.id).toBe('soup')
    expect(picks[0].why.join(' ')).toMatch(/uses .*coriander/)
  })
  it('skips what was cooked in the last week and prefers good ratings', () => {
    const fresh = { ...pasta, cooked: [{ at: NOW - 2 * DAY }], ratings: { a: 5 } }
    const rated = { id: 'stew', title: 'Stew', ratings: { a: 5 }, ingredients: ing('beef', 'carrot') }
    const plain = { id: 'salad', title: 'Salad', ratings: { a: 2 }, ingredients: ing('lettuce', 'tomato') }
    const picks = planWeek(['d1'], [fresh, plain, rated], { ...ctx, now: NOW, random: noJitter })
    expect(picks[0].recipe.id).toBe('stew')
    expect(picks[0].why).toContain('rated 5')
  })
  it('does not pick planned recipes again', () => {
    expect(planWeek(['d1'], [curry], { ...ctx, planned: [curry], now: NOW })).toEqual([])
  })
})
