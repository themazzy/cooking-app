import { describe, expect, it } from 'vitest'
import { findTimers, formatClock, splitSteps, stepIngredients } from './cook.js'

describe('splitSteps', () => {
  it('drops numbering and empty lines', () => {
    expect(splitSteps('1. Chop the onion\n\n2) Fry it\n- Serve')).toEqual(['Chop the onion', 'Fry it', 'Serve'])
  })
})

describe('findTimers', () => {
  it('finds minutes, ranges and hours', () => {
    expect(findTimers('Bake for 25–30 minutes, then rest 1 hour')).toEqual([
      { label: '25–30 min', seconds: 1800 },
      { label: '1 h', seconds: 3600 },
    ])
    expect(findTimers('Simmer 10 min.')).toEqual([{ label: '10 min', seconds: 600 }])
    expect(findTimers('Add 200 g flour')).toEqual([])
  })
})

describe('stepIngredients', () => {
  const ings = [{ name: 'red onions' }, { name: 'garlic, minced' }, { name: 'olive oil' }, { name: 'salt' }]
  it('finds ingredients by name, last word and plural', () => {
    expect(stepIngredients('Fry the onion in the oil with garlic.', ings)).toEqual([0, 1, 2])
  })
  it('uses catalog aliases', () => {
    const match = (n) => (n === 'salt' ? { name: 'Salt', aliases: ['sea salt'] } : null)
    expect(stepIngredients('Season.', ings, match)).toEqual([])
    expect(stepIngredients('Add the salt', ings, match)).toEqual([3])
  })
})

it('formatClock', () => {
  expect(formatClock(65)).toBe('1:05')
  expect(formatClock(3725)).toBe('1:02:05')
})
