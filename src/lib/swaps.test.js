import { describe, expect, it } from 'vitest'
import { SEED_INGREDIENTS } from '../data/ingredients.js'
import { SWAPS } from '../data/swaps.js'
import { swapIngredient, swapsFor } from './swaps.js'

const NAMES = new Set(SEED_INGREDIENTS.map((e) => e.name.toLowerCase()))

describe('swap table', () => {
  it('names only catalog ingredients', () => {
    const unknown = [...SWAPS].flatMap(([from, list]) => [from, ...list.map((s) => s.name.toLowerCase())]).filter((n) => !NAMES.has(n))
    expect([...new Set(unknown)]).toEqual([])
  })
  it('has readable amounts and no swap to itself or twice', () => {
    for (const [from, list] of SWAPS) {
      for (const s of list) {
        expect(s.ratio > 0, `${from} → ${s.name}`).toBe(true)
        expect(s.name.toLowerCase()).not.toBe(from)
      }
      expect(new Set(list.map((s) => s.name)).size, from).toBe(list.length)
    }
  })
})

describe('swapsFor', () => {
  it('finds swaps by catalog name, then by what it counts as', () => {
    expect(swapsFor({ name: 'Butter' }).map((s) => s.name)).toContain('Vegetable oil')
    expect(swapsFor({ name: 'Our farm butter', base: 'Butter' }).length).toBeGreaterThan(0)
    expect(swapsFor({ name: 'Nothing like it' })).toEqual([])
    expect(swapsFor(null)).toEqual([])
  })
})

describe('swapIngredient', () => {
  const swap = (from, to) => swapsFor({ name: from }).find((s) => s.name === to)
  it('scales the amount in the same unit', () => {
    expect(swapIngredient({ qty: '100', unit: 'g', name: 'butter' }, swap('Butter', 'Vegetable oil'))).toEqual({ qty: '80', unit: 'g', name: 'Vegetable oil' })
    expect(swapIngredient({ qty: '200', unit: 'ml', name: 'sour cream' }, swap('Sour cream', 'Greek yogurt'))).toMatchObject({ qty: '200', unit: 'ml' })
    expect(swapIngredient({ qty: '1–2', unit: 'tbsp', name: 'honey' }, swap('Honey', 'Sugar'))).toMatchObject({ qty: '1 ¼–2 ½', unit: 'tbsp' })
  })
  it('works out an amount per piece for counted ingredients', () => {
    expect(swapIngredient({ qty: '2', unit: '', name: 'eggs' }, swap('Eggs', 'Flax seeds'))).toEqual({ qty: '2', unit: 'tbsp', name: 'Flax seeds' })
    expect(swapIngredient({ qty: '3', unit: 'clove', name: 'garlic' }, swap('Garlic', 'Garlic powder'))).toEqual({ qty: '1 ½', unit: 'tsp', name: 'Garlic powder' })
    expect(swapIngredient({ qty: '200', unit: 'g', name: 'garlic' }, swap('Garlic', 'Garlic powder'))).toEqual({ qty: '', unit: '', name: 'Garlic powder' })
    expect(swapIngredient({ qty: '2', unit: 'pcs', name: 'eggs' }, swap('Eggs', 'Banana'))).toEqual({ qty: '1', unit: 'pcs', name: 'Banana' })
  })
  it('leaves the amount empty when it can not be worked out', () => {
    expect(swapIngredient({ qty: '50', unit: 'g', name: 'eggs' }, swap('Eggs', 'Flax seeds'))).toEqual({ qty: '', unit: '', name: 'Flax seeds' })
    expect(swapIngredient({ qty: 'some', unit: '', name: 'onion' }, swap('Onion', 'Shallots'))).toEqual({ qty: '', unit: '', name: 'Shallots' })
  })
})
