import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { makeSeekable, seekableBlob } from './webmFix.js'

// 2.5 s recorded by Chromium's MediaRecorder (VP9 + Opus, keyframe every second)
const recorded = new Uint8Array(readFileSync(resolve(__dirname, 'fixtures/recorded.webm')))
const find = (b, hex, from = 0) => Buffer.from(b).indexOf(Buffer.from(hex, 'hex'), from)

describe('makeSeekable', () => {
  it('adds a duration and cues that point at keyframe clusters', () => {
    expect(find(recorded, '1c53bb6b')).toBe(-1)
    const fixed = makeSeekable(recorded)
    const dur = find(fixed, '448988')
    expect(dur).toBeGreaterThan(0)
    const ms = new DataView(fixed.buffer, fixed.byteOffset + dur + 3, 8).getFloat64(0)
    expect(ms).toBeGreaterThan(2000)
    expect(ms).toBeLessThan(3500)

    const seg = find(fixed, '18538067')
    const sizeLen = Math.clz32(fixed[seg + 4]) - 23
    const dataStart = seg + 4 + sizeLen
    const cues = find(fixed, '1c53bb6b')
    const positions = []
    for (let i = find(fixed, 'f188', cues); i > 0 && i < find(fixed, '1f43b675'); i = find(fixed, 'f188', i + 1))
      positions.push(Number(new DataView(fixed.buffer, fixed.byteOffset + i + 2, 8).getBigUint64(0)))
    expect(positions.length).toBeGreaterThanOrEqual(2)
    for (const p of positions) expect(Buffer.from(fixed.subarray(dataStart + p, dataStart + p + 4)).toString('hex')).toBe('1f43b675')
    // Only clusters that open on a keyframe: Chromium also cuts clusters every second of audio
    let clusters = 0
    for (let i = find(fixed, '1f43b675'); i >= 0; i = find(fixed, '1f43b675', i + 1)) clusters++
    expect(positions.length).toBeLessThan(clusters)
  })

  it('leaves an already seekable file alone', () => {
    const fixed = makeSeekable(recorded)
    expect(makeSeekable(fixed)).toBe(fixed)
  })
})

describe('seekableBlob', () => {
  it('passes other files through', async () => {
    const mp4 = new Blob([new Uint8Array([0, 0, 0, 24])], { type: 'video/mp4' })
    expect(await seekableBlob(mp4)).toBe(mp4)
    const broken = new Blob([new Uint8Array([1, 2, 3])], { type: 'video/webm' })
    expect(await seekableBlob(broken)).toBe(broken)
  })
})
