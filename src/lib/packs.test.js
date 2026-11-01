import { describe, expect, it } from 'vitest'
import { SEED_INGREDIENTS } from '../data/ingredients.js'
import { USUAL_PACKS, boughtAmount, packFor } from './packs.js'

const butter = { name: 'Butter', aisle: 'Dairy & eggs', density: 0.91 }

describe('pack sizes', () => {
  it('buys a whole pack for a recipe amount', () => {
    expect(boughtAmount({ qty: '2', unit: 'tbsp' }, butter, '250 g')).toMatchObject({ packs: 1, qty: '250', unit: 'g' })
    expect(boughtAmount({ qty: '300', unit: 'g' }, butter, '250 g')).toMatchObject({ packs: 2, qty: '500', unit: 'g' })
    expect(boughtAmount({ qty: '1,2', unit: 'l' }, null, '1 l')).toMatchObject({ packs: 2, qty: '2', unit: 'l' })
    expect(boughtAmount({ qty: '3', unit: '' }, null, '10 pcs')).toMatchObject({ packs: 1, qty: '10', unit: '' })
    // A rounding hair over a pack is still one
    expect(boughtAmount({ qty: '255', unit: 'g' }, butter, '250 g').packs).toBe(1)
  })
  it('keeps the list amount without a pack size', () => {
    expect(boughtAmount({ qty: '3', unit: '' }, null, '')).toEqual({ packs: null, pack: '', qty: '3', unit: '' })
  })
  it('prefers the household pack, then the scanned one', () => {
    expect(packFor('butter', butter)).toBe('250 g')
    expect(packFor('butter', butter, { scanned: new Map([['butter', '125 g']]) })).toBe('125 g')
    expect(packFor('butter', butter, { own: { butter: '200 g' }, scanned: new Map([['butter', '125 g']]) })).toBe('200 g')
  })
  it('names catalog ingredients', () => {
    const names = new Set(SEED_INGREDIENTS.map((e) => e.name.toLowerCase()))
    expect(Object.keys(USUAL_PACKS).filter((n) => !names.has(n))).toEqual([])
  })
})

describe('pack set to none', () => {
  it('stops using the usual pack', () => {
    expect(packFor('butter', butter, { own: { butter: '' } })).toBe('')
  })
})
