import { describe, expect, it } from 'vitest'
import { SEED_INGREDIENTS } from '../data/ingredients.js'
import { amountOn, cleanName, readReceipt, splitItem } from './receipt.js'

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

  it('reads a photographed receipt: only priced items above the total, misread letters and all', () => {
    // What the text reader made of a real receipt photo
    const photo = `"КОМЕ” 004
гр. София жк. Люлин 6, бул. Панчо Владигеров 21.ет. 1
ЕИК: 030466961
Код на оператор 0025          01
каса:2 Бон:172 Нул:2722
плик. CBA 10kr              16P x 0.20= 0.20 В
KO3YHaK Хасковски традици 1 BP x 2.70= 2.70 Б
KnoacaH 7 Days Max лешник 1 BP х 0.84= 0.84 Б
Кроасан 7 Days Max лешник Т БР х 0.84= 0.84 Б
напитка газирана Derby ко 1 БР x 1.09= 1.09 Б
ОБЩА СУМА ЕВРО            6.76
В БРОИ ЕВРО                               10.00
CBDODEGI1ERBIADAES376C2290B30E 3A67C ACAO`
    const found = readReceipt(photo, SEED_INGREDIENTS)
    expect(found.map((f) => [f.entry?.name ?? null, f.name, f.amount])).toEqual([
      [null, 'козунак Хасковски традици', '1'],
      ['Croissants', 'кпоасан 7 Days Max лешник', '2'],
      [null, 'напитка газирана Derby ко', '1'],
    ])
  })
  it('does not take short misreads for words', () => {
    expect(readReceipt('6 BEE   0.20\nEES   1.00', SEED_INGREDIENTS).filter((f) => f.entry)).toEqual([])
  })
  it('reads counts and weights next to the price', () => {
    expect(splitItem('КИСЕЛО МЛЯКО 400Г 2 БР x 1.29= 2.58 Б')).toEqual({ name: 'КИСЕЛО МЛЯКО 400Г', amount: '800 g' })
    expect(splitItem('БАНАНИ 0.712 кг х 2.49= 1.77')).toEqual({ name: 'БАНАНИ', amount: '0,712 kg' })
    expect(splitItem('ЯЙЦА М 10БР   3.99')).toEqual({ name: 'ЯЙЦА М 10БР', amount: '10' })
  })
  it('puts misread Cyrillic words back', () => {
    expect(cleanName('KO3YHaK хасковски')).toBe('козунак хасковски')
    expect(cleanName('напитка Derby')).toBe('напитка Derby')
    expect(cleanName('Chicken 500g')).toBe('Chicken 500g')
  })
})
