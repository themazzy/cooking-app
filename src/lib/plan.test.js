import { describe, expect, it } from 'vitest'
import { addToPlan, planEntries, prunePlan, removeFromPlan, setPlanPortions, weekDays, weekStart } from './plan.js'
import { addCooked, cookedAgo, lastCooked } from './history.js'
import { homeMatch } from './stock.js'

describe('meal plan', () => {
  it('finds the Monday of a week', () => {
    expect(weekStart(new Date(2026, 9, 26))).toBe('2026-10-26') // a Monday
    expect(weekStart(new Date(2026, 10, 1))).toBe('2026-10-26') // Sunday
    expect(weekStart(new Date(2026, 9, 26), 1)).toBe('2026-11-02')
    expect(weekDays('2026-10-26')).toEqual(['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01'])
  })

  it('adds, changes and removes planned recipes', () => {
    let plan = addToPlan({}, '2026-10-26', { id: 'a', portions: 2 })
    plan = addToPlan(plan, '2026-10-26', { id: 'b', portions: 4 })
    plan = setPlanPortions(plan, '2026-10-26', 1, 3)
    expect(plan['2026-10-26']).toEqual([{ id: 'a', portions: 2 }, { id: 'b', portions: 3 }])
    plan = removeFromPlan(removeFromPlan(plan, '2026-10-26', 0), '2026-10-26', 0)
    expect(plan).toEqual({})
  })

  it('adds up a week for the shopping list', () => {
    const plan = { '2026-10-26': [{ id: 'a', portions: 2 }], '2026-10-28': [{ id: 'a', portions: 2 }, { id: 'gone', portions: 1 }], '2026-11-03': [{ id: 'b', portions: 1 }] }
    expect(planEntries(plan, weekDays('2026-10-26'), [{ id: 'a' }, { id: 'b' }])).toEqual([{ id: 'a', portions: 4 }])
  })

  it('forgets old weeks', () => {
    expect(prunePlan({ '2026-01-01': [], '2026-10-20': [] }, new Date(2026, 9, 26))).toEqual({ '2026-10-20': [] })
  })
})

describe('cooking history', () => {
  it('keeps when and a note', () => {
    const cooked = addCooked({ cooked: [{ at: 1 }] }, 5, ' less salt ')
    expect(cooked).toEqual([{ at: 1 }, { at: 5, note: 'less salt' }])
    expect(lastCooked({ cooked })).toBe(5)
    expect(lastCooked({})).toBeNull()
  })

  it('says how long ago', () => {
    const now = new Date(2026, 9, 26, 12).getTime()
    expect(cookedAgo(new Date(2026, 9, 26, 8).getTime(), now)).toBe('today')
    expect(cookedAgo(new Date(2026, 9, 25, 23).getTime(), now)).toBe('yesterday')
    expect(cookedAgo(new Date(2026, 9, 21).getTime(), now)).toBe('5 days ago')
    expect(cookedAgo(new Date(2026, 9, 5).getTime(), now)).toBe('3 weeks ago')
  })
})

describe('cooking from home', () => {
  it('counts what is at home', () => {
    const canonical = (n) => n.toLowerCase().replace(/s$/, '')
    const recipe = { ingredients: [{ name: 'Eggs' }, { name: 'Flour' }, { name: 'Milk' }, { name: '' }] }
    const pantry = [{ name: 'egg', amount: '6' }, { name: 'flour', amount: '0 g' }, { name: 'milk', amount: '' }]
    expect(homeMatch(recipe, pantry, canonical)).toEqual({ have: 2, total: 3, missing: ['Flour'] })
  })
})
