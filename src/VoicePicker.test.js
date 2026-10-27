import { describe, expect, it } from 'vitest'
import { voiceLabels } from './VoicePicker.jsx'

describe('voiceLabels', () => {
  it('names Android voices by region and number, browser voices by their name', () => {
    const out = voiceLabels([
      { name: 'en-gb-x-gba-local', language: 'en-GB', online: false, installed: true },
      { name: 'en-gb-x-gbb-network', language: 'en-GB', online: true, installed: true },
      { name: 'en-us-x-iol-local', language: 'en-US', online: false, installed: false },
      { name: 'Google UK English Female', language: 'en-GB', online: true, installed: true },
    ]).map((v) => v.label)
    expect(out).toEqual(['United Kingdom, voice 1', 'United Kingdom, voice 2 · online', 'United States, voice 1 · needs download', 'Google UK English Female · online'])
  })
})
