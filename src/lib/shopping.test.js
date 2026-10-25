import { describe, expect, it } from 'vitest'
import { addToList, makeList } from './shopping.js'

const recipes = [
  { id: 'a', title: 'Soup', servings: 2, ingredients: [{ qty: '1', unit: 'pcs', name: 'onion' }, { qty: '200', unit: 'g', name: 'carrot' }] },
  { id: 'b', title: 'Salad', servings: 4, ingredients: [{ qty: '2', unit: 'pcs', name: 'onion' }, { qty: '1', unit: 'tbsp', name: 'salt' }] },
]

describe('shopping list', () => {
  it('adds recipes and sums amounts', () => {
    let list = addToList(null, { id: 'a', portions: 4 }, recipes)
    list = addToList(list, { id: 'b', portions: 4 }, recipes)
    expect(list.recipes.map((r) => r.id)).toEqual(['a', 'b'])
    expect(list.items.find((i) => i.key === 'onion').qty).toBe('4')
  })
  it('skips ingredients and keeps ticks and extras', () => {
    const first = makeList([{ id: 'a', portions: 2 }], recipes)
    const ticked = { ...first, items: [...first.items.map((i) => ({ ...i, checked: i.key === 'carrot' })), { key: 'extra-1', name: 'bread', qty: '', unit: '', extra: [], from: [] }] }
    const next = addToList(ticked, { id: 'b', portions: 4, skip: [1] }, recipes)
    expect(next.items.map((i) => i.key)).toEqual(['onion', 'carrot', 'extra-1'])
    expect(next.items.find((i) => i.key === 'carrot').checked).toBe(true)
  })
  it('changes portions of a recipe already on the list', () => {
    const list = addToList(addToList(null, { id: 'a', portions: 2 }, recipes), { id: 'a', portions: 6 }, recipes)
    expect(list.recipes).toHaveLength(1)
    expect(list.items.find((i) => i.key === 'carrot').qty).toBe('600')
  })
})
