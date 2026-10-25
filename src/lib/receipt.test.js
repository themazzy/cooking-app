import { describe, expect, it } from 'vitest'
import { SEED_INGREDIENTS } from '../data/ingredients.js'
import { amountOn, readReceipt } from './receipt.js'

const receipt = `КАУФЛАНД БЪЛГАРИЯ ЕООД
ЕИК 131129282
КИСЕЛО МЛЯКО 2% 400Г        1.29 Б
ПРЯСНО МЛЯКО 3% 1Л          2.49 Б
ЯЙЦА М 10БР                 3.99 Б
ДОМАТИ                      2.15 Б
КРАВЕ МАСЛО 125Г            3.49 Б
БРАШНО ТИП 500 1КГ          1.69 Б
ПАКЕТ НАЙЛОН                0.15 Б
ОБЩА СУМА                  17.24
В БРОЙ                     20.00`

describe('receipts', () => {
  const found = readReceipt(receipt, SEED_INGREDIENTS)
  const matched = Object.fromEntries(found.filter((f) => f.entry).map((f) => [f.entry.name, f.amount]))
  it('matches Bulgarian lines to ingredients with amounts', () => {
    expect(matched).toMatchObject({ Yogurt: '400 g', Milk: '1 l', Eggs: '10', Tomatoes: '', Butter: '125 g' })
    expect(Object.keys(matched)).toContain('Bread flour')
  })
  it('skips totals and leaves other lines unmatched', () => {
    expect(found.some((f) => /ОБЩА|БРОЙ|ЕИК/.test(f.line))).toBe(false)
    expect(found.find((f) => f.line.startsWith('ПАКЕТ')).entry).toBe(null)
  })
  it('reads English receipts too', () => {
    const en = readReceipt('Chicken breast 500g   4.99\nBananas   1.20', SEED_INGREDIENTS)
    expect(en.map((f) => [f.entry?.name, f.amount])).toEqual([
      ['Chicken breast', '500 g'],
      ['Banana', ''],
    ])
  })
  it('reads amounts', () => {
    expect(amountOn('САЛАМ 1.5 КГ')).toBe('1,5 kg')
    expect(amountOn('ВОДА 500МЛ')).toBe('500 ml')
    expect(amountOn('ХЛЯБ')).toBe('')
  })
})
