import { describe, expect, it } from 'vitest'
import { addTo, daysLeft, isOut, parseStock, shortfall, stockReview, takeFrom, takeUsed, usesUp } from './stock.js'

describe('stock amounts', () => {
  it('parses amounts into base units', () => {
    expect(parseStock('1,5 kg')).toEqual({ value: 1500, base: 'g' })
    expect(parseStock('3')).toEqual({ value: 3, base: 'pcs' })
    expect(parseStock('2 pcs')).toEqual({ value: 2, base: 'pcs' })
    expect(parseStock('1 bottle')).toEqual({ value: 1, base: 'bottle' })
    expect(parseStock('')).toBe(null)
    expect(parseStock('some')).toBe(null)
  })
  it('takes out what a recipe uses', () => {
    expect(takeFrom('1 kg', '200', 'g')).toBe('800 g')
    expect(takeFrom('1 l', '3', 'dl')).toBe('700 ml')
    expect(takeFrom('6', '2', '')).toBe('4')
    expect(takeFrom('200 g', '500', 'g')).toBe('0 g')
    expect(takeFrom('750 ml', '2', 'tbsp')).toBe('720 ml')
    expect(takeFrom('1 l', '1', 'cup')).toBe('760 ml')
    expect(takeFrom('1 bottle', '2', 'tbsp')).toBe(null)
    expect(takeFrom('', '2', 'tbsp')).toBe(null)
  })
  it('adds what was bought', () => {
    expect(addTo('300 g', '1', 'kg')).toBe('1,3 kg')
    expect(addTo('', '2', 'l')).toBe('2 l')
    expect(addTo('1 bottle', '500', 'ml')).toBe('500 ml')
  })
})

describe('staples', () => {
  it('finds what runs low and how much to buy', () => {
    expect(shortfall({ amount: '500 ml', min_amount: '2 l' })).toEqual({ need: '1,5 l' })
    expect(shortfall({ amount: '3 l', min_amount: '2 l' })).toBe(null)
    expect(shortfall({ amount: '', min_amount: '2 l' })).toBe(null)
    expect(shortfall({ amount: '0', min_amount: '1 pack' })).toEqual({ need: '1 pack' })
    expect(shortfall({ amount: '1 kg', min_amount: '' })).toBe(null)
    expect(isOut({ amount: '0 g' })).toBe(true)
    expect(isOut({ amount: '' })).toBe(false)
  })
})

it('counts days to expiry', () => {
  const today = new Date(2026, 9, 25, 15, 0)
  expect(daysLeft('2026-10-28', today)).toBe(3)
  expect(daysLeft('2026-10-24', today)).toBe(-1)
  expect(daysLeft(null, today)).toBe(null)
})

it('plans what cooking takes out', () => {
  const pantry = [
    { id: 1, name: 'Flour', amount: '1 kg' },
    { id: 2, name: 'Olive oil', amount: '1 bottle' },
    { id: 3, name: 'Eggs', amount: '6' },
  ]
  const canonical = (n) => n.toLowerCase().replace(/s$/, '')
  const plan = stockReview(
    [
      { qty: '200', unit: 'g', name: 'flour' },
      { qty: '2', unit: 'tbsp', name: 'olive oil' },
      { qty: '2', unit: '', name: 'eggs' },
      { qty: '50', unit: 'g', name: 'flour' },
    ],
    pantry,
    canonical,
  )
  // Olive oil is listed but left off: a bottle and spoons don't compare
  expect(plan.map((p) => [p.item.name, p.used, p.next, p.on])).toEqual([
    ['Flour', '250 g', '750 g', true],
    ['Olive oil', '2 tbsp', '1 bottle', false],
    ['Eggs', '2', '4', true],
  ])
})

it('takeUsed works from an edited amount', () => {
  expect(takeUsed('1 kg', '300 g')).toBe('700 g')
  expect(takeUsed('1 kg', 'some')).toBeNull()
})

it('usesUp: used up and not a staple', () => {
  expect(usesUp({ min_amount: '' }, '0 g')).toBe(true)
  expect(usesUp({ min_amount: '1 kg' }, '0 g')).toBe(false)
  expect(usesUp({ min_amount: '' }, '')).toBe(false)
})
