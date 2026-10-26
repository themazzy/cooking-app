import { describe, expect, it } from 'vitest'
import { mergeLists } from './listMerge.js'

const item = (key, extra = {}) => ({ key, name: key, qty: '1', unit: '', checked: false, ...extra })
const list = (items, extra = {}) => ({ createdAt: 1, recipes: [], items, ...extra })

describe('mergeLists', () => {
  it('keeps a tick from each phone', () => {
    const base = list([item('milk'), item('eggs')])
    const mine = list([item('milk', { checked: true }), item('eggs')])
    const theirs = list([item('milk'), item('eggs', { checked: true })])
    expect(mergeLists(base, mine, theirs).items.map((i) => i.checked)).toEqual([true, true])
  })

  it('keeps a tick here and new amounts there on the same item', () => {
    const base = list([item('flour', { qty: '200', unit: 'g' })])
    const mine = list([item('flour', { qty: '200', unit: 'g', checked: true })])
    const theirs = list([item('flour', { qty: '400', unit: 'g' })])
    expect(mergeLists(base, mine, theirs).items[0]).toMatchObject({ qty: '400', checked: true })
  })

  it('keeps items added on both phones and drops ones removed on one', () => {
    const base = list([item('milk'), item('salt')])
    const mine = list([item('milk'), item('salt'), item('extra-1')])
    const theirs = list([item('milk'), item('extra-2')])
    expect(mergeLists(base, mine, theirs).items.map((i) => i.key)).toEqual(['milk', 'extra-1', 'extra-2'])
  })

  it('keeps an item one phone changed while the other removed it', () => {
    const base = list([item('milk')])
    const mine = list([])
    const theirs = list([item('milk', { qty: '2' })])
    expect(mergeLists(base, mine, theirs).items.map((i) => i.qty)).toEqual(['2'])
  })

  it('merges meal plan days separately', () => {
    const base = list([], { plan: {} })
    const mine = list([], { plan: { '2026-10-26': [{ id: 'a', portions: 2 }] } })
    const theirs = list([], { plan: { '2026-10-27': [{ id: 'b', portions: 4 }] } })
    expect(Object.keys(mergeLists(base, mine, theirs).plan).sort()).toEqual(['2026-10-26', '2026-10-27'])
  })

  it('merges the recipes on the list by id', () => {
    const base = list([], { recipes: [{ id: 'a', portions: 2 }] })
    const mine = list([], { recipes: [{ id: 'a', portions: 2 }, { id: 'b', portions: 1 }] })
    const theirs = list([], { recipes: [{ id: 'a', portions: 4 }] })
    expect(mergeLists(base, mine, theirs).recipes).toEqual([
      { id: 'a', portions: 4 },
      { id: 'b', portions: 1 },
    ])
  })

  it('ignores updatedAt', () => {
    const base = list([item('milk')], { updatedAt: 1 })
    const mine = list([item('milk')], { updatedAt: 2 })
    const theirs = list([item('milk', { checked: true })], { updatedAt: 3 })
    const merged = mergeLists(base, mine, theirs)
    expect(merged.updatedAt).toBeUndefined()
    expect(merged.items[0].checked).toBe(true)
  })
})
