import { describe, expect, it } from 'vitest'
import { allCollections, collectionName, inCollection, renameCollection, toggleCollection } from './collections.js'

describe('collections', () => {
  it('cleans names', () => {
    expect(collectionName('  quick   weekday ')).toBe('Quick weekday')
    expect(collectionName('')).toBe('')
  })
  it('lists collections in use with their recipes, ignoring case', () => {
    const a = { id: 'a', collections: ['Christmas', 'Quick'] }
    const b = { id: 'b', collections: ['christmas'] }
    const c = { id: 'c' }
    const all = allCollections([a, b, c])
    expect(all.map((x) => [x.name, x.count])).toEqual([
      ['Christmas', 2],
      ['Quick', 1],
    ])
    expect(all[0].recipes).toEqual([a, b])
    expect(inCollection(b, 'CHRISTMAS')).toBe(true)
    expect(inCollection(c, 'Christmas')).toBe(false)
  })
  it('adds and takes out', () => {
    expect(toggleCollection(undefined, 'christmas')).toEqual(['Christmas'])
    expect(toggleCollection(['Christmas', 'Quick'], 'CHRISTMAS')).toEqual(['Quick'])
    expect(toggleCollection(['Quick'], '  ')).toEqual(['Quick'])
  })
  it('renames without making doubles, and removes on an empty name', () => {
    expect(renameCollection(['Xmas', 'Quick'], 'xmas', 'christmas')).toEqual(['Christmas', 'Quick'])
    expect(renameCollection(['Xmas', 'Christmas'], 'Xmas', 'Christmas')).toEqual(['Christmas'])
    expect(renameCollection(['Xmas', 'Quick'], 'Xmas', '')).toEqual(['Quick'])
  })
})
