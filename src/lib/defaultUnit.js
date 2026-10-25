// The unit an ingredient is usually counted in at home, preselected when
// adding it to the stock: by aisle, with exceptions by name.

const BY_AISLE = {
  Meat: 'g',
  Fish: 'g',
  'Dairy & eggs': 'g',
  Vegetables: 'g',
  Fruit: 'pcs',
  Herbs: 'bunch',
  Spices: 'g',
  Baking: 'g',
  'Pasta & grains': 'g',
  Bakery: 'pcs',
  'Oils & sauces': 'ml',
  'Nuts & seeds': 'g',
  Drinks: 'ml',
  Frozen: 'g',
  Other: 'pcs',
}

const BY_NAME = {
  pcs: [
    'eggs', 'egg yolks', 'egg whites', 'sausages', 'italian sausage', 'lukanka', 'kebapche', 'chicken', 'duck', 'goose', 'quail', 'rabbit',
    'onion', 'red onion', 'shallots', 'leek', 'potatoes', 'sweet potatoes', 'carrots', 'celeriac', 'cucumber', 'bell pepper', 'yellow pepper',
    'green pepper', 'red pepper', 'kapia pepper', 'chilli', 'jalapeño', 'scotch bonnet', 'courgette', 'aubergine', 'broccoli', 'cauliflower',
    'cabbage', 'red cabbage', 'chinese cabbage', 'lettuce', 'iceberg lettuce', 'pumpkin', 'butternut squash', 'beetroot', 'fennel', 'turnip',
    'swede', 'parsnip', 'corn on the cob', 'artichokes', 'bok choy', 'avocado', 'lemon', 'lime', 'orange', 'tomatoes', 'vine tomatoes', 'plum tomatoes',
    'cans', 'bread', 'stock cubes', 'vanilla pod', 'gelatine leaves', 'puff pastry', 'shortcrust pastry', 'filo pastry', 'pizza dough',
    'burrata', 'mozzarella', 'camembert', 'brie', 'halloumi',
  ],
  head: ['garlic'],
  bunch: ['spring onions', 'celery', 'radishes', 'asparagus', 'watercress'],
  g: ['strawberries', 'raspberries', 'blueberries', 'blackberries', 'cherries', 'sour cherries', 'grapes', 'cranberries', 'redcurrants', 'raisins',
    'sultanas', 'dried fruit', 'dried apricots', 'prunes', 'dates', 'figs', 'glacé cherries', 'coconut', 'tamarind', 'rhubarb',
    'tomato paste', 'jam', 'apricot jam', 'raspberry jam', 'peanut butter', 'tahini', 'capers', 'olives', 'green olives', 'pickles', 'lyutenitsa', 'ajvar',
    'pesto', 'harissa', 'miso', 'gochujang', 'curry paste', 'thai green curry paste', 'massaman curry paste', 'madras paste', 'garlic paste', 'ginger paste',
    'lard', 'duck fat', 'suet', 'mustard', 'dijon mustard', 'wholegrain mustard', 'mayonnaise', 'horseradish sauce', 'canned tomatoes', 'coconut oil', 'ginger', 'horseradish'],
  ml: ['milk', 'cream', 'double cream', 'single cream', 'buttermilk', 'kefir', 'ayran', 'plant milk', 'condensed milk', 'whipped cream', 'custard',
    'honey', 'maple syrup', 'golden syrup', 'treacle', 'agave syrup', 'vanilla', 'food colouring', 'lemon juice', 'lime juice', 'caramel'],
  tsp: [],
  pack: ['yeast', 'baking powder', 'baking soda', 'vanilla sugar', 'custard powder', 'gelatine', 'tortillas', 'corn tortillas', 'taco shells', 'pita',
    'naan', 'flatbread', 'burger buns', 'digestive biscuits', 'ladyfingers', 'crackers', 'pretzels', 'croutons', 'rusks', 'croissants', 'brioche',
    'crisps', 'popcorn', 'cookies', 'tofu', 'tempeh', 'spring rolls', 'chips', 'ice cream', 'frozen pastry', 'sprinkles', 'marshmallows', 'meringue'],
}

const UNIT_OF = new Map(Object.entries(BY_NAME).flatMap(([unit, names]) => names.map((n) => [n, unit])))

/** Default unit for a catalog entry (or its base); custom ones without a base use their aisle. */
export function defaultUnit(entry) {
  if (!entry) return 'pcs'
  for (const key of [entry.name, entry.base]) {
    const u = key && UNIT_OF.get(key.toLowerCase())
    if (u) return u
  }
  return BY_AISLE[entry.aisle] ?? 'pcs'
}

/** Units offered when adding to the stock. */
export const STOCK_UNITS = ['g', 'kg', 'ml', 'l', 'pcs', 'pack', 'can', 'bunch', 'head', 'clove', 'tbsp', 'tsp', 'cup']

/** "1,5 kg" → ['1,5', 'kg'], "6" → ['6', 'pcs'], "some" → ['', ''] */
export function splitAmount(text) {
  const m = String(text ?? '').trim().match(/^([\d.,½¼¾⅓⅔/]+(?:\s*[–-]\s*[\d.,]+)?)\s*(.*)$/)
  if (!m) return ['', '']
  return [m[1], m[2].trim() || 'pcs']
}

export const joinAmount = (qty, unit) => (String(qty ?? '').trim() ? `${String(qty).trim()}${unit && unit !== 'pcs' ? ` ${unit}` : ''}` : '')
