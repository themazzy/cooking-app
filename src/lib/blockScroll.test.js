import { describe, expect, it } from 'vitest'
import { nextScroll } from './blockScroll.js'

// Ten blocks of 100px in a 250px box
const blocks = Array.from({ length: 10 }, (_, n) => ({ top: n * 100, bottom: n * 100 + 90 }))
const view = (top) => ({ top, height: 250, max: 750 })

describe('nextScroll', () => {
  it('brings the first block cut off at the bottom to the top', () => {
    expect(nextScroll(blocks, view(0), 1)).toBe(200)
    expect(nextScroll(blocks, view(200), 1)).toBe(400)
  })
  it('brings the last block cut off at the top to the bottom', () => {
    expect(nextScroll(blocks, view(400), -1)).toBe(140)
    expect(nextScroll(blocks, view(140), -1)).toBe(0)
  })
  it('stops at the ends', () => {
    expect(nextScroll(blocks, view(700), 1)).toBe(750)
    expect(nextScroll(blocks, view(0), -1)).toBe(0)
  })
  it('moves part of a box through a block taller than the box', () => {
    const tall = [{ top: 0, bottom: 1000 }]
    expect(nextScroll(tall, { top: 0, height: 200, max: 800 }, 1)).toBe(170)
    expect(nextScroll(tall, { top: 400, height: 200, max: 800 }, -1)).toBe(230)
  })
})
