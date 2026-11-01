import { formatStock, parseStock } from './stock.js'

// What is bought in a shop is a whole pack, not what a recipe asks for:
// 2 tbsp of butter on the list is a 250 g block at home. A pack size comes
// from what the household set for the ingredient (shopping list `packs`),
// then the last scanned product, then the usual pack in Bulgarian and Czech shops.

/** Usual pack sizes by catalog name (lowercase). Loose vegetables and fruit have none. */
export const USUAL_PACKS = {
  butter: '250 g',
  milk: '1 l',
  buttermilk: '500 ml',
  kefir: '500 ml',
  ayran: '500 ml',
  cream: '200 ml',
  'double cream': '250 ml',
  'single cream': '200 ml',
  'whipped cream': '250 ml',
  'sour cream': '200 g',
  yogurt: '400 g',
  'greek yogurt': '400 g',
  eggs: '10 pcs',
  cheddar: '200 g',
  parmesan: '100 g',
  mozzarella: '125 g',
  feta: '200 g',
  sirene: '400 g',
  kashkaval: '400 g',
  'cream cheese': '200 g',
  mascarpone: '250 g',
  ricotta: '250 g',
  quark: '250 g',
  'cottage cheese': '250 g',
  halloumi: '250 g',
  flour: '1 kg',
  'plain flour': '1 kg',
  'self-raising flour': '1 kg',
  'wholemeal flour': '1 kg',
  sugar: '1 kg',
  'brown sugar': '500 g',
  'icing sugar': '500 g',
  'vanilla sugar': '10 g',
  'baking powder': '10 g',
  'baking soda': '50 g',
  yeast: '7 g',
  cornstarch: '200 g',
  cocoa: '100 g',
  'dark chocolate': '100 g',
  'milk chocolate': '100 g',
  salt: '1 kg',
  'black pepper': '50 g',
  paprika: '50 g',
  cinnamon: '50 g',
  rice: '1 kg',
  'basmati rice': '1 kg',
  pasta: '500 g',
  spaghetti: '500 g',
  penne: '500 g',
  oats: '500 g',
  breadcrumbs: '200 g',
  lentils: '500 g',
  chickpeas: '400 g',
  beans: '400 g',
  'vegetable oil': '1 l',
  'sunflower oil': '1 l',
  'olive oil': '500 ml',
  'sesame oil': '250 ml',
  vinegar: '500 ml',
  'soy sauce': '150 ml',
  'fish sauce': '200 ml',
  ketchup: '500 g',
  mayonnaise: '400 g',
  mustard: '300 g',
  'tomato paste': '140 g',
  'canned tomatoes': '400 g',
  passata: '500 g',
  'coconut milk': '400 ml',
  'stock cubes': '8 pcs',
  honey: '400 g',
  tortillas: '6 pcs',
  'puff pastry': '1 pcs',
  'filo pastry': '400 g',
  bacon: '200 g',
  ham: '200 g',
  lukanka: '200 g',
  'ground beef': '500 g',
  'ground pork': '500 g',
  'chicken breast': '500 g',
  potatoes: '2 kg',
  walnuts: '200 g',
  almonds: '200 g',
  peas: '400 g',
}

const key = (name) => String(name ?? '').trim().toLowerCase()

/**
 * The pack size for an ingredient ("250 g"), or ''. `own` is the household's
 * { name: pack } from the list, `scanned` a Map of name → pack from scanned products.
 */
export function packFor(name, entry, { own = {}, scanned = null } = {}) {
  const names = [...new Set([key(name), key(entry?.name), key(entry?.base)].filter(Boolean))]
  // Set to '' by the household: not sold in packs
  for (const n of names) if (own && Object.hasOwn(own, n)) return own[n] ?? ''
  for (const n of names) if (scanned?.get(n)) return scanned.get(n)
  for (const n of names) if (USUAL_PACKS[n]) return USUAL_PACKS[n]
  return ''
}

/** A shopping item's amount in `base` ('g', 'ml' or 'pcs'), weighing or measuring it by density when needed; null when it can't be. */
export function amountIn(item, base, entry) {
  const a = parseStock([item.qty, item.unit].filter((x) => String(x ?? '').trim()).join(' '))
  if (!a) return null
  if (a.base === base) return a.value
  const d = entry?.density
  if (d && a.base === 'ml' && base === 'g') return a.value * d
  if (d && a.base === 'g' && base === 'ml') return a.value / d
  return null
}

const split = (text) => {
  const m = String(text ?? '').trim().match(/^(\S+)\s*(.*)$/)
  return m ? { qty: m[1], unit: m[2] } : { qty: '', unit: '' }
}

/**
 * What to put at home for a bought shopping item: whole packs that cover
 * what the list needs ({ packs, pack, qty, unit }), or the list's own amount
 * when there is no pack size ({ packs: null, pack: '', qty, unit }).
 */
export function boughtAmount(item, entry, pack) {
  const p = parseStock(pack)
  if (!p || p.value <= 0) return { packs: null, pack: '', qty: item.qty ?? '', unit: item.unit ?? '' }
  const need = amountIn(item, p.base, entry)
  // A little over a pack is still one pack (rounding in recipes), and never less than one
  const packs = need == null ? 1 : Math.max(1, Math.ceil(need / p.value - 0.05))
  return { packs, pack, ...packsAmount(packs, pack) }
}

/** `packs` × "250 g" as { qty, unit }: 2 × 250 g → 500 g, 3 × 1 l → 3 l. */
export function packsAmount(packs, pack) {
  const p = parseStock(pack)
  if (!p) return { qty: '', unit: '' }
  const { qty, unit } = split(formatStock({ value: p.value * packs, base: p.base }))
  return { qty, unit: unit || (p.base === 'pcs' ? '' : p.base) }
}
