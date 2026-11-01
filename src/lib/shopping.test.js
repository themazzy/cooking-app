import { describe, expect, it } from 'vitest'
import { addExtra, addToList, countBought, editItem, extraItem, makeList, quickAdds, removeItems } from './shopping.js'

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
  it('remembers what each recipe and group needs', () => {
    const cake = { id: 'c', title: 'Cake', servings: 1, ingredients: [{ qty: '100', unit: 'g', name: 'flour', group: 'Dough' }, { qty: '50', unit: 'g', name: 'flour', group: 'Streusel' }] }
    const list = makeList([{ id: 'c', portions: 2 }, { id: 'a', portions: 2 }], [...recipes, cake])
    const flour = list.items.find((i) => i.key === 'flour')
    expect(flour.qty).toBe('300')
    expect(flour.uses).toEqual([
      { recipe: 'Cake', group: 'Dough', qty: '200', unit: 'g', name: 'flour' },
      { recipe: 'Cake', group: 'Streusel', qty: '100', unit: 'g', name: 'flour' },
    ])
  })
})

describe('editing the list', () => {
  it('keeps removed recipe items away when another recipe is added', () => {
    const list = removeItems(addToList(null, { id: 'a', portions: 2 }, recipes), ['onion'], recipes)
    expect(list.items.map((i) => i.key)).toEqual(['carrot'])
    expect(list.recipes[0].skip).toEqual([0])
    const next = addToList(list, { id: 'b', portions: 4 }, recipes)
    // Only the new recipe's onions
    expect(next.items.find((i) => i.key === 'onion').qty).toBe('2')
  })
  it('snoozes removed staples', () => {
    const list = { recipes: [], items: [{ key: 'stock-salt', name: 'Salt', qty: '500', unit: 'g', extra: [], from: [] }] }
    const next = removeItems(list, ['stock-salt'], recipes)
    expect(next.items).toEqual([])
    expect(next.snoozed).toEqual(['stock-salt'])
  })
  it('keeps an amount changed by hand until the recipes change it', () => {
    let list = addToList(null, { id: 'a', portions: 2 }, recipes)
    list = editItem(list, 'carrot', { qty: '500', unit: 'g' })
    expect(list.items.find((i) => i.key === 'carrot')).toMatchObject({ qty: '500', unit: 'g', own: { was: { qty: '200', unit: 'g' } } })
    // Another recipe without carrots: the change stays
    list = addToList(list, { id: 'b', portions: 4 }, recipes)
    expect(list.items.find((i) => i.key === 'carrot').qty).toBe('500')
    // More portions of the soup: the recipes win again
    list = addToList(list, { id: 'a', portions: 4 }, recipes)
    expect(list.items.find((i) => i.key === 'carrot').qty).toBe('400')
  })
  it('renames and sets amounts on extras', () => {
    const list = { recipes: [], items: [extraItem('bread', null, 1)] }
    const next = editItem(list, 'extra-1', { name: 'Rye bread', qty: '1', unit: '' })
    expect(next.items[0]).toMatchObject({ name: 'Rye bread', qty: '1', unit: '' })
  })
  it('reads amounts typed with an extra', () => {
    expect(extraItem('500 g mince', null, 1)).toMatchObject({ name: 'Mince', qty: '500', unit: 'g' })
    expect(extraItem('2 lemons', null, 1)).toMatchObject({ name: 'Lemons', qty: '2', unit: '' })
    expect(extraItem('2 lemons', (n) => (/lemon/.test(n) ? { name: 'Lemon', aisle: 'Fruit' } : null), 1)).toMatchObject({ name: 'Lemon', aisle: 'Fruit' })
    expect(extraItem('bread', null, 1)).toMatchObject({ name: 'Bread', qty: '', unit: '' })
  })
})

describe('typed extras join the list', () => {
  const list = () => addToList(null, { id: 'a', portions: 2 }, recipes)
  it('adds to a line of the same ingredient', () => {
    const { list: next, joined } = addExtra(list(), '300 g carrot', null, 1)
    expect(joined).toBe('carrot')
    expect(next.items.find((i) => i.key === 'carrot')).toMatchObject({ qty: '500', unit: 'g' })
    expect(next.items).toHaveLength(2)
  })
  it('keeps a line when it is there already without an amount', () => {
    const { list: next, joined } = addExtra(list(), 'carrot', null, 1)
    expect(joined).toBe('carrot')
    expect(next.items).toHaveLength(2)
  })
  it('adds its own line when the units do not add up', () => {
    const { list: next, joined } = addExtra(list(), '2 carrots', null, 1)
    expect(joined).toBeNull()
    expect(next.items).toHaveLength(3)
  })
})

describe('quick add', () => {
  it('offers staples and things bought twice, not what is on the list', () => {
    let list = addToList(null, { id: 'a', portions: 2 }, recipes)
    list = countBought(countBought(list, [{ name: 'Bread' }, { name: 'Onion' }]), [{ name: 'Bread' }, { name: 'onion' }, { name: 'Milk' }])
    expect(quickAdds(list, ['Salt'])).toEqual(['Salt', 'Bread'])
  })
})
