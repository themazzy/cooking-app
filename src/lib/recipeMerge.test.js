import { describe, expect, it } from 'vitest'
import { mergeCooked, mergeRecipe } from './recipeMerge.js'
import { averageRating, myRating, otherRatings, ratePatch, raterId } from './ratings.js'

describe('mergeRecipe', () => {
  const base = { title: 'Soup', note: 'a', servings: 2 }

  it('takes each field from the side that changed it', () => {
    const out = mergeRecipe(base, { ...base, title: 'Better soup', updatedAt: 1 }, { ...base, note: 'b', updatedAt: 2 })
    expect(out).toEqual({ title: 'Better soup', note: 'b', servings: 2 })
  })

  it('lets the newer side win a field both changed', () => {
    expect(mergeRecipe(base, { ...base, note: 'mine', updatedAt: 5 }, { ...base, note: 'theirs', updatedAt: 3 }).note).toBe('mine')
    expect(mergeRecipe(base, { ...base, note: 'mine', updatedAt: 1 }, { ...base, note: 'theirs', updatedAt: 3 }).note).toBe('theirs')
  })

  it('keeps fields removed on one side removed', () => {
    const out = mergeRecipe({ ...base, rating: 4 }, { ...base, rating: null, updatedAt: 2 }, { ...base, rating: 4, updatedAt: 1 })
    expect(out.rating).toBeNull()
  })

  it('without a base keeps everyone’s cooked entries and ratings', () => {
    const out = mergeRecipe(null, { ...base, cooked: [{ at: 1 }], ratings: { a: 5 }, updatedAt: 2 }, { ...base, cooked: [{ at: 2 }], ratings: { b: 3 }, updatedAt: 1 })
    expect(out.cooked).toEqual([{ at: 1 }, { at: 2 }])
    expect(out.ratings).toEqual({ a: 5, b: 3 })
  })

  it('leaves out what each phone keeps for itself', () => {
    const out = mergeRecipe(base, { ...base, syncedAt: 1, syncBase: base, updatedAt: 2 }, { ...base, updatedAt: 1 })
    expect(out).toEqual(base)
  })
})

describe('mergeCooked', () => {
  it('drops entries removed on either phone and keeps note edits', () => {
    const base = [{ at: 1, note: 'x' }, { at: 2 }, { at: 3 }]
    const mine = [{ at: 1, note: 'edited' }, { at: 2 }]
    const theirs = [{ at: 1, note: 'x' }, { at: 3 }, { at: 4 }]
    expect(mergeCooked(base, mine, theirs)).toEqual([{ at: 1, note: 'edited' }, { at: 4 }])
  })
})

describe('ratings', () => {
  it('keeps each person’s rating apart, also on one shared login', () => {
    const jan = raterId('u1', 'Jan')
    const other = raterId('u1', 'Ana')
    let recipe = { rating: 3 }
    expect(myRating(recipe, jan)).toBe(3) // the old shared rating until someone rates
    recipe = { ...recipe, ...ratePatch(recipe, jan, 5) }
    recipe = { ...recipe, ...ratePatch(recipe, other, 4) }
    expect(recipe.rating).toBeNull()
    expect(myRating(recipe, jan)).toBe(5)
    expect(otherRatings(recipe, jan)).toEqual([{ who: 'u1:Ana', name: 'Ana', stars: 4 }])
    expect(averageRating(recipe)).toBe(4.5)
    recipe = { ...recipe, ...ratePatch(recipe, jan, null) }
    expect(myRating(recipe, jan)).toBeNull()
    expect(averageRating(recipe)).toBe(4)
  })
})
