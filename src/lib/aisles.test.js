import { describe, expect, it } from 'vitest'
import { aisleOrder, isDefaultOrder, moveAisle } from './aisles.js'

const ALL = ['Vegetables', 'Fruit', 'Meat', 'Bakery', 'Other']

describe('aisleOrder', () => {
  it('is the default order with nothing saved', () => {
    expect(aisleOrder(undefined, ALL)).toEqual(ALL)
    expect(isDefaultOrder(aisleOrder(null, ALL), ALL)).toBe(true)
  })
  it('keeps the saved order and drops unknown or repeated names', () => {
    expect(aisleOrder(['Bakery', 'Meat', 'Fish', 'Bakery', 'Vegetables', 'Fruit', 'Other'], ALL)).toEqual(['Bakery', 'Meat', 'Vegetables', 'Fruit', 'Other'])
  })
  it('puts a section missing from the saved order after its default neighbour', () => {
    expect(aisleOrder(['Bakery', 'Vegetables', 'Meat', 'Other'], ALL)).toEqual(['Bakery', 'Vegetables', 'Fruit', 'Meat', 'Other'])
    expect(aisleOrder(['Meat'], ALL)).toEqual(['Vegetables', 'Fruit', 'Meat', 'Bakery', 'Other'])
  })
})

describe('moveAisle', () => {
  it('swaps with the neighbour and stops at the ends', () => {
    expect(moveAisle(ALL, 1, -1)).toEqual(['Fruit', 'Vegetables', 'Meat', 'Bakery', 'Other'])
    expect(moveAisle(ALL, 0, -1)).toBe(ALL)
    expect(moveAisle(ALL, 4, 1)).toBe(ALL)
  })
})
