import { describe, expect, it } from 'vitest'
import { stepValue } from '../NumberField.jsx'

describe('stepValue', () => {
  it('snaps to the step grid', () => {
    expect(stepValue('18', 1, { step: 5 })).toBe('20')
    expect(stepValue('18', -1, { step: 5 })).toBe('15')
    expect(stepValue('20', 1, { step: 5 })).toBe('25')
  })
  it('starts empty boxes at the minimum', () => {
    expect(stepValue('', 1, { min: 1 })).toBe('1')
    expect(stepValue('', -1, { min: 0 })).toBe('0')
  })
  it('keeps limits and decimals', () => {
    expect(stepValue('99', 1, { min: 1, max: 99 })).toBe('99')
    expect(stepValue('1', -1, { min: 1 })).toBe('1')
    expect(stepValue('0,5', 1, { step: 0.5 })).toBe('1')
    expect(stepValue('1,2', 1, { step: 0.5 })).toBe('1,5')
    expect(stepValue('0.1', 1, { step: 0.5 })).toBe('0.5')
  })
})
