import { describe, expect, it } from 'vitest'
import { SEED_INGREDIENTS } from '../data/ingredients.js'
import { BULGARIAN } from '../data/bulgarian.js'
import { ebagQuery, ebagUrl } from './ebag.js'

describe('eBag search', () => {
  it('has a Bulgarian word for every catalog ingredient', () => {
    const missing = SEED_INGREDIENTS.filter((e) => !BULGARIAN.has(e.name.toLowerCase())).map((e) => e.name)
    expect(missing).toEqual([])
  })
  it('uses the catalog word, the base, or the own name', () => {
    expect(ebagQuery('red onions', { name: 'Red onion' })).toBe('червен лук')
    expect(ebagQuery('Madeta máslo', { name: 'Madeta máslo', base: 'Butter', household_id: 'h' })).toBe('масло краве')
    expect(ebagQuery('Kashkaval Vitosha', { name: 'Kashkaval Vitosha', household_id: 'h' })).toBe('Kashkaval Vitosha')
    expect(ebagQuery('water', { name: 'Water' })).toBe('')
    expect(ebagQuery('dragon fruit, ripe', null)).toBe('dragon fruit')
  })
  it('builds the link', () => {
    expect(ebagUrl('сол')).toBe('https://www.ebag.bg/search/?products%5Bquery%5D=%D1%81%D0%BE%D0%BB')
    expect(ebagUrl('a b', 'https://x/?q={q}')).toBe('https://x/?q=a%20b')
  })
})
