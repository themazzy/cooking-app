import { describe, expect, it } from 'vitest'
import { voiceCommand, voiceQuestion } from './voice.js'
import { findTimers } from './cook.js'

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

describe('voiceQuestion', () => {
  it('reads questions about amounts', () => {
    expect(voiceQuestion('How much garlic?')).toEqual({ ask: 'garlic' })
    expect(voiceQuestion('how many eggs do I need')).toEqual({ ask: 'eggs' })
    expect(voiceQuestion('kolik mouky')).toEqual({ ask: 'mouky' })
  })

  it('reads timers said with a time', () => {
    for (const said of ['set a timer for 10 minutes', 'timer 10 minutes', 'ten minute timer', 'start a timer for ten minutes'])
      expect(findTimers(voiceQuestion(said)?.timer)[0]?.seconds, said).toBe(600)
    expect(findTimers(voiceQuestion('timer one hour')?.timer)[0]?.seconds).toBe(3600)
  })

  it('leaves other talk alone', () => {
    expect(voiceQuestion('timer')).toBe(null)
    expect(voiceQuestion('next')).toBe(null)
    expect(voiceQuestion('we should go to the shop tomorrow for some milk')).toBe(null)
  })
})
