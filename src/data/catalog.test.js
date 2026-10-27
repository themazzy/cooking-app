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
  it('tells fresh herbs from dried, and whole spices from ground', () => {
    const m = (text) => matchIngredient(index, text)?.name
    const cases = {
      'fresh coriander, chopped': 'Coriander', 'dried coriander': 'Dried coriander', 'coriander seeds': 'Coriander seeds', 'ground coriander': 'Ground coriander',
      'fresh parsley': 'Parsley', 'dried parsley': 'Dried parsley', 'Dry parsley': 'Dried parsley', 'dried parsley flakes': 'Dried parsley',
      'fresh basil leaves': 'Basil', 'Dry basil': 'Dried basil', 'thyme sprigs': 'Thyme', 'dried thyme': 'Dried thyme', 'Dry Chives': 'Dried chives',
      'dried oregano': 'Oregano', 'Dry oregano': 'Oregano', 'fresh oregano': 'Fresh oregano', 'dried marjoram': 'Marjoram', 'rubbed sage': 'Dried sage', 'dill weed': 'Dried dill',
      'ground cumin': 'Cumin', 'cumin seeds': 'Cumin seeds', 'whole cumin': 'Cumin seeds',
      'ground black pepper': 'Black pepper', 'Ground Pepper': 'Black pepper', 'freshly ground black pepper': 'Black pepper', 'black peppercorns': 'Black peppercorns', 'whole peppercorns': 'Black peppercorns',
      'pink peppercorns': 'Pink peppercorns', 'white peppercorns': 'White peppercorns', 'ground white pepper': 'White pepper',
      'ground cloves': 'Ground cloves', 'whole cloves': 'Cloves', '3 garlic cloves': 'Garlic', 'ground cardamom': 'Ground cardamom', 'cardamom pods': 'Cardamom',
      'ground cinnamon': 'Cinnamon', 'cinnamon stick': 'Cinnamon sticks', 'whole nutmeg': 'Whole nutmeg', 'grated nutmeg': 'Nutmeg', 'ground allspice': 'Ground allspice', 'allspice berries': 'Allspice',
      'ground fennel': 'Ground fennel', 'fennel seeds': 'Fennel seeds', 'ground ginger': 'Ground ginger', 'fresh ginger': 'Ginger', 'fresh turmeric': 'Fresh turmeric', 'ground turmeric': 'Turmeric',
      'Pink Salt': 'Himalayan salt', 'Red paprika': 'Paprika', 'kasuri methi': 'Fenugreek leaves',
      'mletý kmín': 'Ground caraway', 'kmín': 'Caraway seeds', 'mletý římský kmín': 'Cumin', 'celý pepř': 'Black peppercorns', 'mletý pepř': 'Black pepper', 'sušená bazalka': 'Dried basil',
      'majoránka': 'Marjoram', 'čerstvá majoránka': 'Fresh marjoram', 'mleté nové koření': 'Ground allspice', 'nové koření': 'Allspice', 'mletý hřebíček': 'Ground cloves', 'růžová sůl': 'Himalayan salt',
      'сушен магданоз': 'Dried parsley', 'магданоз': 'Parsley', 'черен пипер на зърна': 'Black peppercorns', 'черен пипер': 'Black pepper', 'чубрица': 'Savory',
    }
    for (const [text, name] of Object.entries(cases)) expect(m(text), text).toBe(name)
  })
})
