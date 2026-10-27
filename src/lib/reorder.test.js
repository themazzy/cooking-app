import { describe, expect, it } from 'vitest'
import { groupSlots, moveItem, moveRow, moveRun, rowSlots, rowStep, sections } from './reorder.js'

const rows = (spec) => spec.split(' ').map((s) => ({ name: s.split(':')[0], group: s.split(':')[1] ?? '' }))
const show = (list) => list.map((r) => (r.group ? `${r.name}:${r.group}` : r.name)).join(' ')

describe('reordering', () => {
  const list = rows('salt pepper beef:Meat onion:Meat cream:Sauce')

  it('finds the groups as runs', () => {
    expect(sections(list)).toEqual([
      { group: '', start: 0, end: 1 },
      { group: 'Meat', start: 2, end: 3 },
      { group: 'Sauce', start: 4, end: 4 },
    ])
  })

  it('moves steps', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 3)).toEqual(['b', 'c', 'a'])
    expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b'])
    expect(moveItem(['a', 'b', 'c'], 1, 2)).toEqual(['a', 'b', 'c'])
  })

  it('moves a row into another group', () => {
    expect(show(moveRow(list, 0, 5, 'Sauce'))).toBe('pepper beef:Meat onion:Meat cream:Sauce salt:Sauce')
    expect(show(moveRow(list, 4, 2, 'Meat'))).toBe('salt pepper cream:Meat beef:Meat onion:Meat')
    // Dropped at the end of the group above it
    expect(show(moveRow(list, 4, 4, 'Meat'))).toBe('salt pepper beef:Meat onion:Meat cream:Meat')
  })

  it('moves a whole group', () => {
    expect(show(moveRun(list, 4, 4, 2))).toBe('salt pepper cream:Sauce beef:Meat onion:Meat')
    expect(show(moveRun(list, 2, 3, 5))).toBe('salt pepper cream:Sauce beef:Meat onion:Meat')
    expect(moveRun(list, 2, 3, 4)).toBe(list)
  })

  it('offers a place above the first heading only when the list starts with a group', () => {
    expect(rowSlots(sections(list))[0]).toMatchObject({ to: 0, group: '' })
    const grouped = rows('beef:Meat cream:Sauce')
    expect(rowSlots(sections(grouped))[0]).toMatchObject({ to: 0, group: '', at: ['section', 0, 'top'] })
    expect(groupSlots(sections(list)).map((s) => s.to)).toEqual([2, 4, 5])
    expect(groupSlots(sections(grouped)).map((s) => s.to)).toEqual([0, 1, 2])
  })

  it('steps a row up and down across group edges', () => {
    const step = (n, by) => {
      const s = rowStep(list, n, by)
      return s && show(moveRow(list, n, s.to, s.group))
    }
    expect(step(2, -1)).toBe('salt pepper beef onion:Meat cream:Sauce')
    expect(step(3, 1)).toBe('salt pepper beef:Meat onion:Sauce cream:Sauce')
    expect(step(2, 1)).toBe('salt pepper onion:Meat beef:Meat cream:Sauce')
    expect(step(0, -1)).toBe(null)
    expect(step(4, 1)).toBe(null)
  })
})
