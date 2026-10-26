import { Capacitor, CapacitorHttp, registerPlugin } from '@capacitor/core'
import { supabase } from './supabase.js'
import { getHousehold } from './sync.js'

// Product barcodes for the pantry. A scan is looked up in the household's own
// list first (product_barcodes: what each product is and how much a pack
// holds, shared by both phones), then in Open Food Facts, the free open
// database (no key; about 18,000 products sold in Bulgaria plus imported
// brands). Whatever is picked for a product is remembered, so the household
// list fills the gaps Open Food Facts has.

const Scanner = registerPlugin('BarcodeScanner')

export const canScan = () => Capacitor.isNativePlatform()

/** Opens Google's code scanner (Play services). The barcode, or null when cancelled. */
export async function scanBarcode() {
  const res = await Scanner.scan()
  return res?.cancelled ? null : normalizeBarcode(res?.code)
}

/** Digits only; a 12-digit UPC-A as the 13-digit EAN that Open Food Facts uses. */
export function normalizeBarcode(text) {
  const digits = String(text ?? '').replace(/\D/g, '')
  return digits.length === 12 ? `0${digits}` : digits
}

/** Whether a typed EAN-8, UPC-A or EAN-13 has a correct check digit. */
export function isValidBarcode(code) {
  if (!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(code)) return false
  const digits = [...code].map(Number)
  const check = digits.pop()
  const sum = digits.reverse().reduce((s, d, i) => s + d * (i % 2 === 0 ? 3 : 1), 0)
  return (10 - (sum % 10)) % 10 === check
}

const UNITS = { g: 'g', gr: 'g', г: 'g', гр: 'g', kg: 'kg', кг: 'kg', ml: 'ml', мл: 'ml', l: 'l', л: 'l', cl: 'cl', mg: 'mg' }

/** How much one pack holds, as a stock amount ("500 g", "1 l"), or ''. */
export function packAmount(product) {
  let qty = Number(product?.product_quantity)
  let unit = UNITS[String(product?.product_quantity_unit ?? '').toLowerCase()]
  if (!(qty > 0) || !unit) {
    // "500 g", "1,5 л"; a multipack ("6 x 1,5 l") is left for the person to fill in
    const text = String(product?.quantity ?? '')
    if (/\d\s*[x×*]\s*\d/i.test(text)) return ''
    const m = text.match(/(\d+(?:[.,]\d+)?)\s*(kg|gr|g|ml|cl|l|кг|гр|г|мл|л)(?!\p{L})/iu)
    if (!m) return ''
    qty = Number(m[1].replace(',', '.'))
    unit = UNITS[m[2].toLowerCase()]
  }
  if (unit === 'cl') [qty, unit] = [qty * 10, 'ml']
  if (unit === 'mg') [qty, unit] = [qty / 1000, 'g']
  // Open Food Facts gives 1000 g for a kilo; the pantry reads 1 kg better
  if (unit === 'g' && qty >= 1000 && qty % 100 === 0) [qty, unit] = [qty / 1000, 'kg']
  if (unit === 'ml' && qty >= 1000 && qty % 100 === 0) [qty, unit] = [qty / 1000, 'l']
  return `${Math.round(qty * 1000) / 1000} ${unit}`
}

/** Brand and name of an Open Food Facts product, as printed on the pack. */
export function productLabel(product) {
  const name = [product?.product_name, product?.product_name_bg, product?.product_name_cs, product?.product_name_en, product?.generic_name_en].find((n) => n?.trim())?.trim() ?? ''
  const brand = String(product?.brands ?? '').split(',')[0].trim()
  const label = brand && !name.toLowerCase().includes(brand.toLowerCase()) ? `${brand} ${name}` : name || brand
  return [label, product?.quantity?.trim()].filter(Boolean).join(', ')
}

/**
 * The catalog entry a product most likely is, using `match` (the catalog
 * matcher): the English name, then its categories from the most specific
 * ("en:sunflower-oils" before "en:vegetable-oils"), then names in other languages.
 */
export function guessIngredient(product, match) {
  const categories = [...(product?.categories_tags ?? [])]
    .filter((t) => t.startsWith('en:'))
    .reverse()
    .map((t) => t.slice(3).replace(/-/g, ' '))
  const tries = [product?.product_name_en, product?.generic_name_en, ...categories, product?.product_name, product?.product_name_bg, product?.product_name_cs, product?.generic_name]
  for (const t of tries) {
    const found = t?.trim() && match(t)
    if (found) return found
  }
  return null
}

const OFF_FIELDS = 'product_name,product_name_en,product_name_bg,product_name_cs,generic_name,generic_name_en,brands,quantity,product_quantity,product_quantity_unit,categories_tags'
// Open Food Facts asks every app to name itself
const OFF_UA = 'CookingApp/1.0 (github.com/themazzy/cooking-app)'

/** The Open Food Facts product for a barcode, or null when it is not there. */
export async function openFoodFacts(code) {
  const url = `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${OFF_FIELDS}`
  let status
  let data
  if (Capacitor.isNativePlatform()) {
    const res = await CapacitorHttp.get({ url, headers: { 'User-Agent': OFF_UA }, responseType: 'json', connectTimeout: 10000, readTimeout: 15000 })
    status = res.status
    data = typeof res.data === 'string' ? JSON.parse(res.data || 'null') : res.data
  } else {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
    status = res.status
    data = await res.json().catch(() => null)
  }
  if (status === 404 || data?.status === 0) return null
  if (status >= 400 || !data) throw new Error(`Open Food Facts answered ${status}`)
  return data.product ?? null
}

// The table comes from supabase-product-barcodes.sql; before that is run, scanning still works
const missingTable = (error) => error && (error.code === '42P01' || error.code === 'PGRST205')

/** What the household saved for this barcode, or null. */
export async function knownBarcode(code) {
  const { data, error } = await supabase.from('product_barcodes').select('barcode, ingredient, product, pack').eq('barcode', code).maybeSingle()
  if (missingTable(error)) return null
  if (error) throw error
  return data
}

/** Remembers what a product is for both phones. False when the table is not set up yet. */
export async function rememberBarcode(code, { ingredient, product = '', pack = '' }) {
  const household_id = (await getHousehold()).id
  const { error } = await supabase
    .from('product_barcodes')
    .upsert({ household_id, barcode: code, ingredient, product, pack, updated_at: new Date().toISOString() }, { onConflict: 'household_id,barcode' })
  if (missingTable(error)) return false
  if (error) throw error
  return true
}

/**
 * Everything known about a barcode: { code, source: 'household' | 'openfoodfacts' | null,
 * product (label), pack, entry (catalog entry or null), ingredient (name) }.
 */
export async function lookupBarcode(code, match) {
  const known = await knownBarcode(code).catch(() => null)
  if (known) {
    const entry = match(known.ingredient)
    return { code, source: 'household', product: known.product, pack: known.pack, entry, ingredient: entry?.name ?? known.ingredient }
  }
  let product = null
  let offline = false
  try {
    product = await openFoodFacts(code)
  } catch {
    offline = true
  }
  if (!product) return { code, source: null, offline, product: '', pack: '', entry: null, ingredient: '' }
  const entry = guessIngredient(product, match)
  return { code, source: 'openfoodfacts', product: productLabel(product), pack: packAmount(product), entry, ingredient: entry?.name ?? '' }
}
