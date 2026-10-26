import { describe, expect, it } from 'vitest'
import { SEED_INGREDIENTS } from '../data/ingredients.js'
import { buildCatalogIndex, matchIngredient } from './catalog.js'
import { NUTRITION, gramsOf, recipeCalories } from './calories.js'
import { parseIngredientLine, tidyIngredient } from './ingredients.js'
import { buildShoppingList, formatAmount, parseAmount, scaleAmount, sumRow } from './scale.js'
import { parseStock, takeFrom } from './stock.js'
import { convertIngredient } from './units.js'

// Amounts, units and ingredient names from real recipes, end to end: the
// catalog match, metric display, shopping list sums, stock and calories.

const index = buildCatalogIndex(SEED_INGREDIENTS.map((e) => ({ ...e, ...NUTRITION.get(e.name.toLowerCase()), name: e.name })))
const match = (name) => matchIngredient(index, name)
const m = (name) => match(name)?.name ?? null
const line = (text) => {
  const p = parseIngredientLine(text)
  return p && { qty: p.quantityMax != null ? `${p.quantity}–${p.quantityMax}` : String(p.quantity ?? ''), unit: p.unit ?? '', name: p.name }
}
const metric = (qty, unit, name) => {
  const c = convertIngredient({ qty, unit, name }, 'metric', match)
  return `${c.qty} ${c.unit}`
}

describe('ingredient names that contain another ingredient', () => {
  it('does not take the first word for the thing', () => {
    expect(m('cream of tartar')).toBe('Cream of tartar')
    expect(m('cream of mushroom soup')).toBe('Condensed soup')
    expect(m('almond butter')).toBe('Nut butter')
    expect(m('garlic salt')).toBe('Garlic salt')
    expect(m('chickpea flour')).toBe('Chickpea flour')
    expect(m('ginger ale')).toBe('Ginger ale')
    expect(m('corn syrup')).toBe('Golden syrup')
    expect(m('lemon pepper')).toBe('Lemon pepper')
    expect(m('hot dog buns')).toBe('Burger buns')
    expect(m('quail eggs')).toBe('Eggs')
    expect(m('nut milk')).toBe('Plant milk')
    expect(m('crushed red pepper')).toBe('Chilli flakes')
    expect(m('chili flakes')).toBe('Chilli flakes')
  })
  it('keeps the ones that were right', () => {
    expect(m('cream of wheat')).toBe('Semolina')
    expect(m('peanut butter')).toBe('Peanut butter')
    expect(m('butter beans')).toBe('Butter beans')
    expect(m('coconut milk')).toBe('Coconut milk')
    expect(m('egg noodles')).toBe('Egg noodles')
    expect(m('eggplant')).toBe('Aubergine')
    expect(m('garlic cloves')).toBe('Garlic')
    expect(m('sweet potato')).toBe('Sweet potatoes')
  })
  it('reads pepper as black pepper and peppers as the vegetable', () => {
    expect(m('pepper')).toBe('Black pepper')
    expect(m('Pepper, to taste')).toBe('Black pepper')
    expect(m('peppers')).toBe('Bell pepper')
    expect(m('2 red peppers')).toBe('Red pepper')
  })
  it('takes the first of two choices', () => {
    expect(m('butter or margarine')).toBe('Butter')
    expect(m('honey or maple syrup')).toBe('Honey')
    expect(m('máslo nebo sádlo')).toBe('Butter')
  })
})

describe('Czech names', () => {
  it('reads granulated sugar, coconut milk and stocks', () => {
    expect(m('cukr krupice')).toBe('Sugar')
    expect(m('krupice')).toBe('Semolina')
    expect(m('kokosové mléko')).toBe('Coconut milk')
    expect(m('hovězí vývar')).toBe('Beef stock')
    expect(m('kuřecí vývar')).toBe('Chicken stock')
    expect(m('sůl a pepř')).toBe('Salt and pepper')
  })
  it('reads the forms used after an amount', () => {
    expect(m('hladké mouky')).toBe('Fine flour')
    expect(m('polohrubé mouky')).toBe('Medium-coarse flour')
    for (const [word, name] of [['bramborů', 'Potatoes'], ['petrželky', 'Parsley'], ['tvarohu', 'Quark'], ['prášku do pečiva', 'Baking powder'], ['čokolády', 'Dark chocolate'], ['oleje', 'Vegetable oil'], ['jogurtu', 'Yogurt']]) expect(m(word), word).toBe(name)
  })
})

describe('Bulgarian names', () => {
  it('reads everyday words', () => {
    for (const [word, name] of [['масло', 'Butter'], ['краве масло', 'Butter'], ['сметана', 'Cream'], ['сирене', 'Sirene'], ['извара', 'Quark'], ['краставица', 'Cucumber'], ['яйце', 'Eggs'], ['яйца', 'Eggs'], ['жълтъци', 'Egg yolks'], ['лимон', 'Lemon'], ['кайма', 'Ground beef'], ['гъби', 'Mushrooms'], ['тиквичка', 'Courgette'], ['джоджен', 'Mint'], ['нишесте', 'Cornstarch'], ['сода', 'Baking soda'], ['мляко', 'Milk'], ['пилешко месо', 'Chicken']]) expect(m(word), word).toBe(name)
  })
  it('reads words with the article on the end', () => {
    for (const [word, name] of [['доматите', 'Tomatoes'], ['солта', 'Salt'], ['лукът', 'Onion'], ['брашното', 'Flour'], ['маслото', 'Butter'], ['млякото', 'Milk'], ['яйцата', 'Eggs'], ['гъбите', 'Mushrooms'], ['сиренето', 'Sirene']]) expect(m(word), word).toBe(name)
    expect(m('паста')).toBe('Pasta')
  })
})

describe('ingredient lines', () => {
  it('reads sticks of butter and weighs them', () => {
    expect(line('1 stick butter')).toEqual({ qty: '1', unit: 'stick', name: 'butter' })
    expect(line('2 sticks (226g) unsalted butter')).toEqual({ qty: '2', unit: 'stick', name: 'unsalted butter' })
    expect(metric('1', 'stick', 'butter')).toBe('115 g')
    expect(metric('½', 'stick', 'butter')).toBe('57 g')
    expect(gramsOf({ qty: '2', unit: 'stick' }, match('butter'))).toBe(226)
    // A cinnamon stick is a piece, not 113 g
    expect(metric('2', 'stick', 'cinnamon')).toBe('2 stick')
  })
  it('reads American mixed numbers with a dash as one amount', () => {
    expect(line('1-1/2 cups milk')).toEqual({ qty: '1.5', unit: 'cup', name: 'milk' })
    expect(parseAmount('1-1/2')).toEqual({ min: 1.5, max: null })
    expect(parseAmount('1-2')).toEqual({ min: 1, max: 2 })
  })
  it('reads can sizes and multiplied packs', () => {
    expect(line('1 (14 oz) can coconut milk')).toEqual({ qty: '1', unit: 'can', name: 'coconut milk' })
    expect(line('2 x 400g cans chickpeas')).toEqual({ qty: '2', unit: 'can', name: 'chickpeas' })
    expect(line('2 x 200 g chicken breasts')).toEqual({ qty: '400', unit: 'g', name: 'chicken breasts' })
  })
  it('adds "1 cup plus 2 tbsp" into one amount', () => {
    expect(line('1 cup plus 2 tbsp milk')).toEqual({ qty: '1.125', unit: 'cup', name: 'milk' })
    expect(line('1 lb + 4 oz ground beef')).toEqual({ qty: '1.25', unit: 'lb', name: 'ground beef' })
  })
  it('reads heaping spoons, cubes of yeast and tubs of yogurt', () => {
    expect(line('2 heaping tablespoons cocoa')).toEqual({ qty: '2', unit: 'tbsp', name: 'cocoa' })
    expect(line('1 kostka droždí')).toEqual({ qty: '1', unit: 'pack', name: 'droždí' })
    expect(line('1/2 kostky másla')).toEqual({ qty: '0.5', unit: 'pack', name: 'másla' })
    expect(line('1 кофичка кисело мляко')).toEqual({ qty: '1', unit: 'pack', name: 'кисело мляко' })
    expect(line('1 jar pesto')).toEqual({ qty: '1', unit: 'can', name: 'pesto' })
  })
})

describe('metric display', () => {
  it('weighs butter, grated cheese, brown sugar and chopped greens', () => {
    expect(metric('1', 'cup', 'butter')).toBe('230 g')
    expect(metric('1', 'cup', 'grated parmesan')).toBe('96 g')
    expect(metric('1', 'cup', 'shredded cheddar')).toBe('110 g')
    expect(metric('1', 'cup', 'brown sugar')).toBe('215 g')
    expect(metric('2', 'cups', 'spinach')).toBe('145 g')
    expect(metric('1', 'cup', 'peanut butter')).toBe('250 g')
    expect(metric('1', 'cup', 'cukr krupice')).toBe('205 g')
  })
  it('keeps liquids in millilitres, ounces of them too', () => {
    expect(metric('1', 'cup', 'milk')).toBe('240 ml')
    expect(metric('1', 'cup', 'honey')).toBe('240 ml')
    expect(metric('1', 'cup', 'olive oil')).toBe('240 ml')
    expect(metric('3', 'cups', 'chicken stock')).toBe('720 ml')
    expect(metric('8', 'oz', 'milk')).toBe('235 ml')
    expect(metric('8', 'oz', 'cream cheese')).toBe('225 g')
    expect(metric('1', 'lb', 'ground beef')).toBe('455 g')
  })
})

describe('amounts', () => {
  it('shows eighths of spoons, quarters of kilograms and litres', () => {
    expect(scaleAmount('1/8', 1.5, 'tsp')).toBe('⅛')
    expect(scaleAmount('0,5', 0.5, 'l')).toBe('0,25')
    expect(formatAmount(1.25, 'kg')).toBe('1,25')
    expect(formatAmount(1.36, 'kg')).toBe('1,4')
    expect(formatAmount(2.08, 'cup')).toBe('2 ¼')
  })
  it('reads thousands with a space and refuses division by zero', () => {
    expect(parseAmount('1 000')).toEqual({ min: 1000, max: null })
    expect(parseAmount('1 1/2')).toEqual({ min: 1.5, max: null })
    expect(parseAmount('1/0')).toBeNull()
  })
})

describe('shopping list sums', () => {
  const list = (ingredients) => buildShoppingList([{ recipe: { title: 'A', ingredients }, factor: 1 }], match).map((i) => [i.name, [i.qty, i.unit].join(' ').trim(), ...i.extra])
  it('adds cups of flour to grams of flour', () => {
    expect(list([{ qty: '1', unit: 'cup', name: 'flour' }, { qty: '300', unit: 'g', name: 'flour' }])).toEqual([['Flour', '430 g']])
  })
  it('weighs flour measured only in cups', () => {
    expect(list([{ qty: '2', unit: 'cups', name: 'flour' }])).toEqual([['Flour', '260 g']])
  })
  it('adds butter in grams, spoons and sticks', () => {
    expect(list([{ qty: '200', unit: 'g', name: 'butter' }, { qty: '2', unit: 'tbsp', name: 'butter' }, { qty: '1', unit: 'stick', name: 'butter' }])).toEqual([['Butter', '340 g']])
  })
  it('adds spoons of oil to millilitres, and teaspoons to tablespoons', () => {
    expect(list([{ qty: '2', unit: 'tsp', name: 'olive oil' }, { qty: '1', unit: 'tbsp', name: 'olive oil' }, { qty: '100', unit: 'ml', name: 'olive oil' }])).toEqual([['Olive oil', '125 ml']])
    expect(list([{ qty: '3', unit: 'tsp', name: 'soy sauce' }, { qty: '1', unit: 'tbsp', name: 'soy sauce' }])).toEqual([['Soy sauce', '2 tbsp']])
    expect(list([{ qty: '1', unit: 'tsp', name: 'cumin' }])).toEqual([['Cumin', '1 tsp']])
  })
  it('counts eggs with and without "pcs" together', () => {
    expect(list([{ qty: '2', unit: '', name: 'eggs' }, { qty: '1', unit: 'pcs', name: 'egg' }])).toEqual([['Eggs', '3']])
  })
})

describe('stock amounts', () => {
  it('reads amounts with spaces', () => {
    expect(parseStock('1 000 g')).toEqual({ value: 1000, base: 'g' })
    expect(parseStock('1 1/2 kg')).toEqual({ value: 1500, base: 'g' })
    expect(parseStock('1 ½ l')).toEqual({ value: 1500, base: 'ml' })
    expect(takeFrom('1 000 g', '250', 'g')).toBe('750 g')
  })
})

describe('calories', () => {
  it('counts sticks of butter and granulated sugar', () => {
    const c = recipeCalories([{ qty: '1', unit: 'stick', name: 'butter' }, { qty: '100', unit: 'g', name: 'cukr krupice' }], match)
    expect(c.missing).toEqual([])
    expect(Math.round(c.rows[0].kcal)).toBe(814)
    expect(c.rows[1].kcal).toBe(NUTRITION.get('sugar').kcal)
  })
})

// Rows as older imports saved them in Jan's recipes
describe('saved recipes', () => {
  it('skips headings saved as ingredients', () => {
    expect(sumRow({ qty: '', unit: '', name: 'For the custard filling' })).toBeNull()
    expect(sumRow({ qty: '', unit: '', name: 'salt to taste' })).not.toBeNull()
    const list = buildShoppingList([{ recipe: { title: 'Buns', ingredients: [{ qty: '', unit: '', name: 'For the milk bread' }, { qty: '1', unit: 'cup', name: 'milk' }] }, factor: 1 }], match)
    expect(list.map((i) => i.name)).toEqual(['Milk'])
  })
  it('counts a unit left in the name', () => {
    const c = recipeCalories([{ qty: '1', unit: '', name: 'tablespoon of cornstarch' }, { qty: '1', unit: '', name: 'mug Full cream milk' }, { qty: '50', unit: 'ml', name: 'of cream' }], match)
    expect(c.missing).toEqual([])
    expect(c.rows.map((r) => r.name)).toEqual(['cornstarch', 'Full cream milk', 'cream'])
  })
  it('matches pork lard, mirim and rice cakes by the cup', () => {
    expect(m('pork lard ((or sunflower / canola oil))')).toBe('Lard')
    expect(m('Mirim')).toBe('Mirin')
    expect(metric('2', 'cup', 'Rice Cakes')).toBe('310 g')
  })
  it('converts both ends of a range into one unit', () => {
    const us = convertIngredient({ qty: '1–2', unit: 'l', name: 'water' }, 'imperial', match)
    expect(`${us.qty} ${us.unit}`).toBe('1–2 qt')
    expect(metric('2–3', 'lb', 'potatoes')).toBe('0,9–1,4 kg')
  })
})

describe('the last three wrong imports', () => {
  it('reads a glass of wine as a cup, but glass noodles as noodles', () => {
    expect(line('1 glass red wine')).toEqual({ qty: '1', unit: 'cup', name: 'red wine' })
    expect(line('2 glasses of water')).toEqual({ qty: '2', unit: 'cup', name: 'water' })
    expect(line('200 g glass noodles')).toEqual({ qty: '200', unit: 'g', name: 'glass noodles' })
    expect(line('1 glass noodles')).toEqual({ qty: '1', unit: '', name: 'glass noodles' })
    expect(tidyIngredient({ qty: '100', unit: '', name: 'glass noodles' }).name).toBe('glass noodles')
  })
  it('reads a note in brackets when it names the ingredient', () => {
    expect(m('Pork (17.6oz. Mince)')).toBe('Ground pork')
    expect(m('Beef (10.5oz. Mince)')).toBe('Ground beef')
    expect(m('Tomatoes (14.1oz. Peeled)')).toBe('Tomatoes')
    expect(m('Red onion (Brown. Chopped)')).toBe('Red onion')
  })
  it('reads peppers measured in spoons as paprika', () => {
    expect(tidyIngredient({ qty: '1', unit: 'tbsp', name: 'sweet peppers' }).name).toBe('sweet paprika')
    expect(tidyIngredient({ qty: '1', unit: 'tsp', name: 'hot red pepper' }).name).toBe('hot paprika')
    expect(tidyIngredient({ qty: '2', unit: 'tbsp', name: 'red pepper' }).name).toBe('paprika')
    expect(tidyIngredient({ qty: '1', unit: 'tsp', name: 'pepper' }).name).toBe('pepper')
    expect(tidyIngredient({ qty: '2', unit: '', name: 'sweet peppers' }).name).toBe('sweet peppers')
    expect(m('sweet paprika')).toBe('Paprika')
  })
})
