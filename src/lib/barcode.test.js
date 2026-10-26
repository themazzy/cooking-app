import { describe, expect, it, vi } from 'vitest'
import { SEED_INGREDIENTS } from '../data/ingredients.js'
import { buildCatalogIndex, matchIngredient } from './catalog.js'

vi.mock('./supabase.js', () => ({ supabase: {} }))
vi.mock('./sync.js', () => ({ getHousehold: async () => ({ id: 'h1' }) }))

const { guessIngredient, isValidBarcode, normalizeBarcode, packAmount, productAisle, productKcal, productLabel, productName } = await import('./barcode.js')

const index = buildCatalogIndex(SEED_INGREDIENTS)
const match = (name) => matchIngredient(index, name)

describe('barcodes', () => {
  it('checks the check digit', () => {
    expect(isValidBarcode('3800201980654')).toBe(true)
    expect(isValidBarcode('3800201980655')).toBe(false)
    expect(isValidBarcode('96385074')).toBe(true)
    expect(isValidBarcode('12345')).toBe(false)
  })
  it('turns a UPC-A into the 13-digit form', () => {
    expect(normalizeBarcode('036000291452')).toBe('0036000291452')
    expect(normalizeBarcode(' 3800 2019 80654 ')).toBe('3800201980654')
  })
})

describe('pack size', () => {
  it('uses the numeric quantity first', () => {
    expect(packAmount({ product_quantity: '400', product_quantity_unit: 'g' })).toBe('400 g')
    expect(packAmount({ product_quantity: 1000, product_quantity_unit: 'ml' })).toBe('1 l')
    expect(packAmount({ product_quantity: 1000, product_quantity_unit: 'g' })).toBe('1 kg')
  })
  it('reads the printed quantity, also in Bulgarian', () => {
    expect(packAmount({ quantity: '1,5 л' })).toBe('1.5 l')
    expect(packAmount({ quantity: '125 гр' })).toBe('125 g')
    expect(packAmount({ quantity: '33 cl' })).toBe('330 ml')
    expect(packAmount({ quantity: '500g' })).toBe('500 g')
  })
  it('leaves multipacks and unknowns empty', () => {
    expect(packAmount({ quantity: '6 x 1,5 l' })).toBe('')
    expect(packAmount({ quantity: '10 бр' })).toBe('')
    expect(packAmount({})).toBe('')
  })
})

describe('what the product is', () => {
  it('finds the ingredient from the most specific category', () => {
    const p = { product_name: 'Слънчогледово олио', categories_tags: ['en:plant-based-foods', 'en:fats', 'en:vegetable-oils', 'en:sunflower-oils'] }
    expect(guessIngredient(p, match)?.name).toMatch(/sunflower oil/i)
  })
  it('falls back to the Bulgarian name', () => {
    expect(guessIngredient({ product_name: 'Прясно мляко 3%' }, match)?.name).toBe('Milk')
  })
  it('gives null when nothing matches', () => {
    expect(guessIngredient({ product_name: 'Xyzzy 42' }, match)).toBe(null)
  })
  it('labels a product with its brand once', () => {
    expect(productLabel({ product_name: 'Кисело мляко', brands: 'Верея, Danone', quantity: '400 г' })).toBe('Верея Кисело мляко, 400 г')
    expect(productLabel({ product_name: 'Verea yogurt', brands: 'Verea' })).toBe('Verea yogurt')
  })
})

describe('own ingredient from a product', () => {
  it('names it by brand and name, without the size', () => {
    expect(productName({ product_name: 'Zero', brands: 'Coca-Cola', quantity: '500 ml' })).toBe('Coca-Cola Zero')
    expect(productName({ product_name: 'Coca-Cola Zero Sugar', brands: 'Coca-Cola' })).toBe('Coca-Cola Zero Sugar')
  })
  it('puts it in an aisle from its categories', () => {
    expect(productAisle({ categories_tags: ['en:beverages', 'en:carbonated-drinks', 'en:sodas', 'en:colas'] })).toBe('Drinks')
    expect(productAisle({ categories_tags: ['en:dairies', 'en:fermented-milk-products', 'en:yogurts'] })).toBe('Dairy & eggs')
    expect(productAisle({ categories_tags: [] })).toBe('Other')
  })
  it('reads its own calories, so Cola Zero is not Cola', () => {
    expect(productKcal({ nutriments: { 'energy-kcal_100g': 0.3 } })).toBe(0.3)
    expect(productKcal({ nutriments: { 'energy-kcal_100g': 0 } })).toBe(0)
    expect(productKcal({ nutriments: { energy_100g: 180 } })).toBe(43)
    expect(productKcal({ nutriments: {} })).toBe(null)
  })
})
