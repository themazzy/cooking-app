import { describe, expect, it } from 'vitest'
import { convertQty, suggestedUnits } from './UnitPicker.jsx'

describe('unit picker', () => {
  it('converts amounts between units of one kind only', () => {
    expect(convertQty('500', 'g', 'kg')).toBe('0,5')
    expect(convertQty('1,5', 'l', 'ml')).toBe('1500')
    expect(convertQty('3', 'pcs', 'g')).toBe('3')
    expect(convertQty('', 'g', 'kg')).toBe('')
  })
  it('offers the units next to the usual one, with the current one first', () => {
    expect(suggestedUnits('g', 'g')).toEqual(['g', 'kg', 'pcs', 'pack'])
    expect(suggestedUnits('g', 'tbsp')).toEqual(['tbsp', 'g', 'kg', 'pcs', 'pack'])
    expect(suggestedUnits('bunch', 'bunch')).toEqual(['bunch', 'pcs', 'g', 'pack'])
  })
})
