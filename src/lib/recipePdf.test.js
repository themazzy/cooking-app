import { describe, expect, it } from 'vitest'
import { jpegPdf, wrap } from './recipePdf.js'

const text = (bytes) => new TextDecoder('latin1').decode(bytes)

describe('PDF', () => {
  const fakeJpeg = new Uint8Array([0xff, 0xd8, 1, 2, 3, 0xff, 0xd9])
  const pdf = text(jpegPdf([{ jpeg: fakeJpeg, width: 10, height: 14 }, { jpeg: fakeJpeg, width: 10, height: 14 }]))
  it('has a page per image', () => {
    expect(pdf.startsWith('%PDF-1.4')).toBe(true)
    expect(pdf).toContain('/Count 2')
    expect(pdf.match(/\/Type \/Page /g)).toHaveLength(2)
  })
  it('points the cross-reference table at each object', () => {
    const start = Number(pdf.match(/startxref\n(\d+)/)[1])
    expect(pdf.slice(start, start + 4)).toBe('xref')
    const rows = pdf.slice(start).split('\n').slice(3, 11)
    rows.forEach((row, n) => expect(pdf.slice(Number(row.slice(0, 10)))).toMatch(new RegExp(`^${n + 1} 0 obj`)))
  })
})

describe('wrapping', () => {
  // 10 px per character
  const ctx = { measureText: (s) => ({ width: s.length * 10 }) }
  it('breaks between words', () => {
    expect(wrap(ctx, 'aaa bbb ccc', 75)).toEqual(['aaa bbb', 'ccc'])
  })
  it('keeps line breaks and splits words longer than a line', () => {
    expect(wrap(ctx, 'ab\nabcdefghij', 50)).toEqual(['ab', 'abcde', 'fghij'])
  })
})
