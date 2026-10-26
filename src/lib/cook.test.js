import { describe, expect, it } from 'vitest'
import { adjustTimer, findTimers, formatClock, newTimer, pauseTimer, resumeTimer, sameWord, splitSteps, stepIngredients, timeLeft } from './cook.js'

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

describe('splitSteps groups lines into steps', () => {
  it('keeps the lines after a numbered step with it', () => {
    expect(splitSteps('1. Chop the onion\nand the garlic.\n2. Fry it\nFor the sauce:\n3. Mix')).toEqual(['Chop the onion and the garlic.', 'Fry it', 'For the sauce: Mix'])
  })
  it('uses blank lines between steps that run over lines', () => {
    expect(splitSteps('Chop the onion\nand garlic finely.\n\nFry it all.\n\nServe.')).toEqual(['Chop the onion and garlic finely.', 'Fry it all.', 'Serve.'])
  })
  it('puts headings in front of the next step and splits inline numbers', () => {
    expect(splitSteps('Chop the onion\nFor the sauce:\nMix soy and sugar\nServe')).toEqual(['Chop the onion', 'For the sauce: Mix soy and sugar', 'Serve'])
    expect(splitSteps('1. Chop. 2. Fry it. 3. Serve.')).toEqual(['Chop.', 'Fry it.', 'Serve.'])
    expect(splitSteps('Step 1: Chop\nStep 2: Fry')).toEqual(['Chop', 'Fry'])
  })
  it('joins a line cut off after a comma or "and"', () => {
    expect(splitSteps('Mix the flour, sugar and\nbutter until smooth\nBake')).toEqual(['Mix the flour, sugar and butter until smooth', 'Bake'])
  })
})

describe('stepIngredients finds everything a step lists', () => {
  it('reads past commas and brackets', () => {
    const ings = ['Soy Sauce', 'Sugar', 'Mirin', 'Minced Garlic', 'Sesame Oil', 'Black Pepper', 'Rice cakes'].map((name) => ({ name }))
    const step = 'Take out a mixing bowl and thoroughly mix: Soy Sauce (6 Tablespoons), Sugar (2 Tablespoon), Mirin (2 Tablespoon), Minced Garlic (2 Tablespoon), Sesame Oil (2 Tablespoon) and Black Pepper (8–10 cracks).'
    expect(stepIngredients(step, ings)).toEqual([0, 1, 2, 3, 4, 5])
  })
  it('finds Czech and Bulgarian word forms', () => {
    expect(stepIngredients('Na másle osmahneme cibuli a česnek.', [{ name: 'cibule' }, { name: 'máslo' }, { name: 'česnek' }, { name: 'mrkev' }])).toEqual([0, 1, 2])
    expect(stepIngredients('Запържете лука и доматите.', [{ name: 'лук' }, { name: 'домати' }, { name: 'сирене' }])).toEqual([0, 1])
  })
  it('does not mix up different words', () => {
    expect(stepIngredients('Add the ricotta and buttermilk.', [{ name: 'rice' }, { name: 'butter' }])).toEqual([])
    expect(sameWord('cibule', 'cibulkou')).toBe(true)
    expect(sameWord('nut', 'nutmeg')).toBe(false)
  })
})

describe('timers', () => {
  it('pauses, resumes and adjusts', () => {
    let t = newTimer('5 min', 300, 0)
    expect(timeLeft(t, 60_000)).toBe(240)
    t = pauseTimer(t, 60_000)
    expect(timeLeft(t, 999_000)).toBe(240)
    t = adjustTimer(t, 60)
    expect(timeLeft(t)).toBe(300)
    t = resumeTimer(t, 100_000)
    expect(timeLeft(t, 100_000)).toBe(300)
    t = adjustTimer(t, -600, 100_000)
    expect(timeLeft(t, 100_000)).toBe(0)
    t = adjustTimer({ ...t, done: true }, 60, 200_000)
    expect(t.done).toBe(false)
    expect(timeLeft(t, 200_000)).toBe(60)
  })
})
