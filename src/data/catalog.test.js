import { describe, expect, it } from 'vitest'
import { AISLES, EXTRA_ALIASES, SEED_INGREDIENTS } from './ingredients.js'
import { buildCatalogIndex, matchIngredient, normalizeName } from '../lib/catalog.js'

const index = buildCatalogIndex(SEED_INGREDIENTS)
const names = new Set(SEED_INGREDIENTS.map((e) => e.name.toLowerCase()))

describe('ingredient catalog', () => {
  it('has unique names in known aisles, with bases that exist', () => {
    expect(names.size).toBe(SEED_INGREDIENTS.length)
    for (const e of SEED_INGREDIENTS) {
      expect(AISLES, e.name).toContain(e.aisle)
      if (e.base) expect(names.has(e.base.toLowerCase()), `${e.name} → ${e.base}`).toBe(true)
    }
  })
  it('finds every ingredient by its own name', () => {
    for (const e of SEED_INGREDIENTS) expect(index.exact.get(normalizeName(e.name))?.name, e.name).toBe(e.name)
  })
  it('adds local words only to ingredients that exist', () => {
    for (const name of EXTRA_ALIASES.keys()) expect(names.has(name), name).toBe(true)
  })
  it('reads Czech, Bulgarian, Chinese and Japanese ingredients', () => {
    const m = (text) => matchIngredient(index, text)?.name
    expect(m('mrkve')).toBe('Carrots')
    expect(m('hladká mouka')).toBe('Fine flour')
    expect(m('polohrubá mouka')).toBe('Medium-coarse flour')
    expect(m('tvaroh')).toBe('Quark')
    expect(m('kmín')).toBe('Caraway seeds')
    expect(m('бяло сирене')).toBe('Sirene')
    expect(m('кисело мляко')).toBe('Yogurt')
    expect(m('Shaoxing wine')).toBe('Shaoxing wine')
    expect(m('doubanjiang')).toBe('Doubanjiang')
    expect(m('bonito flakes')).toBe('Bonito flakes')
    expect(m('kewpie mayo')).toBe('Japanese mayonnaise')
    expect(m('dashi')).toBe('Dashi')
    expect(m('silken tofu')).toBe('Silken tofu')
  })
})
