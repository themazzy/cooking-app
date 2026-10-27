import { describe, expect, it } from 'vitest'
import { voiceCommand } from './voice.js'

describe('voiceCommand', () => {
  it('hears next and back in English, Czech and Bulgarian', () => {
    expect(voiceCommand('Next')).toBe('next')
    expect(voiceCommand('next step please')).toBe('next')
    expect(voiceCommand('Další')).toBe('next')
    expect(voiceCommand('Следваща!')).toBe('next')
    expect(voiceCommand('go back')).toBe('back')
    expect(voiceCommand('zpět')).toBe('back')
    expect(voiceCommand('назад')).toBe('back')
  })
  it('hears timer and the ingredient list', () => {
    expect(voiceCommand('start the timer')).toBe('timer')
    expect(voiceCommand('časovač')).toBe('timer')
    expect(voiceCommand('ingredients')).toBe('ingredients')
    expect(voiceCommand('postup')).toBe('steps')
  })
  it('takes the last command said', () => {
    expect(voiceCommand('no back')).toBe('back')
    expect(voiceCommand('back no next')).toBe('next')
  })
  it('ignores talk that only mentions a command word', () => {
    expect(voiceCommand('')).toBe(null)
    expect(voiceCommand('hello')).toBe(null)
    expect(voiceCommand('we can do that next week when we go shopping')).toBe(null)
  })
})

describe('scroll and read commands', () => {
  it('hears scrolling, reading and quiet', () => {
    expect(voiceCommand('scroll down')).toBe('down')
    expect(voiceCommand('dolů')).toBe('down')
    expect(voiceCommand('scroll up')).toBe('up')
    expect(voiceCommand('нагоре')).toBe('up')
    expect(voiceCommand('read the step')).toBe('read')
    expect(voiceCommand('přečti')).toBe('read')
    expect(voiceCommand('stop reading')).toBe('quiet')
  })
})
