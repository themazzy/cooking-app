// Diet and cooking-style tags of a recipe (Light, Fried, Vegetarian…): the
// list to pick from, and tags guessed from the ingredients, the steps and the
// calories. Tags are kept as names in recipe.tags; own tags are kept as typed.

import { recipeCalories, recipeMacros } from './calories.js'

export const DEFAULT_TAGS = [
  'Light', 'High protein', 'Low carb', 'Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free', 'Spicy',
  'Fried', 'Baked', 'Grilled', 'Steamed', 'Stewed', 'Air fryer', 'Slow cooker', 'One-pot', 'No-cook',
]

const same = (a, b) => a.toLowerCase() === b.toLowerCase()
export const hasTag = (r, tag) => (r?.tags ?? []).some((t) => same(t, tag))

// A vegan recipe is also vegetarian and dairy-free, without saying so
const IMPLIED = { vegetarian: ['Vegan'], 'dairy-free': ['Vegan'] }

/** Whether a recipe counts for a tag filter. */
export const tagMatches = (r, tag) => hasTag(r, tag) || (IMPLIED[tag.toLowerCase()] ?? []).some((t) => hasTag(r, t))

/** Tags used by any recipe, then the defaults, without duplicates. */
export function allTags(recipes = []) {
  const seen = new Map()
  for (const t of DEFAULT_TAGS) seen.set(t.toLowerCase(), t)
  for (const r of recipes) for (const t of r.tags ?? []) if (t && !seen.has(t.toLowerCase())) seen.set(t.toLowerCase(), t)
  return [...seen.values()]
}

/** `tags` with `add` put in (each once, by name). */
export const mergeTags = (tags = [], add = []) => [...tags, ...add.filter((a) => !tags.some((t) => same(t, a)))]

// Words in steps, titles and hashtags for each cooking style, in the parser's
// languages (EN CS SK BG DE ES IT FR PL RU, a few JA ZH KO). Stems: a match may
// go on with more letters, never start in the middle of a word.
const STYLE_WORDS = {
  // Frying as the way of cooking (not a quick sauté of onions)
  Fried: [
    'deep[- ]?fr', 'fried', 'in hot oil', 'frit(?!t?ata)', 'smažen', 'smaž(?:ít|te|íme|it)', 'usmaž', 'osmaž', 'vysmaž', 'fritéz', 'fritovan', 'vyprážan', 'vyprážať',
    'пърже', 'изпърже', 'пържен', 'frittier', 'ausgebacken', 'frei(?:r|d[ao]s?)\\b', 'frito', 'fritto', 'friggere', 'fritura', 'smażon', 'smażyć', 'usmaż', 'жарен', 'обжар(?:ить|ьте) во фритюре', 'во фритюре',
    '揚げ', '炸', '튀김', '튀기',
  ],
  Baked: [
    'bake', 'baking', 'baked', 'roast', 'oven', 'péct', 'pečen', 'upéct', 'upečt', 'pečte', 'pečeme', 'troub', 'rúr', 'piecť', 'фурна', 'изпече', 'пече', 'запеч',
    'backofen', 'backen', 'gebacken', 'ofen', 'hornea', 'horno', 'al forno', 'forno', 'infornare', 'cuire au four', 'au four', 'rôti', 'piekarnik', 'piec(?:z|ze)', 'upiec', 'духовк', 'выпека', 'запека',
    'オーブン', '烤', '오븐',
  ],
  Grilled: ['grill', 'barbecue', 'bbq', 'griluj', 'grilov', 'na roštu', 'на скара', 'скара', 'грил', 'gegrillt', 'parrilla', 'a la plancha', 'alla griglia', 'grigli', 'griller', 'grillé', 'z grilla', 'гриль', '焼き網', '烧烤', '구이'],
  Steamed: ['steam', 'v páře', 'na páře', 'в пара', 'на пара', 'dämpf', 'gedämpft', 'al vapor', 'al vapore', 'à la vapeur', 'na parze', 'на пару', '蒸'],
  Stewed: ['stew', 'braise', 'dus(?:it|íme|te|ím)', 'dušen', 'zadus', 'задуш', 'яхния', 'schmor', 'eintopf', 'guis', 'estofad', 'stufat', 'brasat', 'mijot', 'braiser', 'ragoût', 'duszon', 'dusić', 'туш(?:ить|ите|еный)', '煮込', '炖', '조림'],
  'Air fryer': ['air[- ]?fryer', 'airfryer', 'horkovzdušn\\p{L}* fritéz', 'еър фрайър', 'heißluftfritteuse', 'freidora de aire', "friggitrice ad aria", 'friteuse à air', 'frytkownic\\p{L}* beztłuszczow', 'аэрогрил', 'аерофрит'],
  'Slow cooker': ['slow[- ]?cook', 'crock[- ]?pot', 'pomal\\p{L}* hrn', 'бавноготварка', 'бавно готвене', 'schongarer', 'olla lenta', 'slow cooker', 'mijoteuse', 'wolnowar', 'медленноварк'],
  'One-pot': ['one[- ]?pot', 'one[- ]?pan', 'sheet[- ]?pan', 'tray[- ]?bake', 'v jednom hrnci', 'jeden hrnec', 'v jednom pekáči', 'в една тенджера', 'в един тиган', 'ein[- ]?topf', 'one pot', 'en una olla', 'in una pentola', 'une seule casserole', 'w jednym garnku', 'в одной кастрюле'],
  'No-cook': ['no[- ]?cook', 'no[- ]?bake', 'bez pečení', 'bez vaření', 'nepečen', 'без печене', 'без готвене', 'ohne backen', 'sin horno', 'senza cottura', 'sans cuisson', 'bez pieczenia', 'без выпечки', 'без варки'],
  Spicy: ['spicy', 'hot and spicy', 'pálivé', 'pálivý', 'pikantn', 'štipľav', 'люто', 'пикантн', 'scharf', 'picante', 'piccante', 'épicé', 'остр(?:ый|ое|ая)', '辛い', '辣', '매운'],
}
// Diet words that only count in a title or as a hashtag, where they describe the dish
const DIET_WORDS = {
  Vegan: ['vegan', 'veganské', 'veganský', 'веган', 'vegano', 'végétalien', 'wegańsk'],
  Vegetarian: ['vegetarian', 'veggie', 'vegetariánsk', 'вегетариан', 'vegetarisch', 'vegetariano', 'végétarien', 'wegetariańsk'],
  'Gluten-free': ['gluten[- ]?free', 'bezlepkov', 'без глутен', 'glutenfrei', 'sin gluten', 'senza glutine', 'sans gluten', 'bezglutenow', 'без глютена'],
  'Dairy-free': ['dairy[- ]?free', 'bez laktózy', 'bezmléčn', 'без млечни', 'laktosefrei', 'sin lactosa', 'senza lattosio', 'sans lactose', 'bez laktozy'],
  'High protein': ['high[- ]?protein', 'protein', 'proteinov', 'bílkovin', 'протеин', 'proteica', 'protéiné', 'białkow', 'белков'],
  'Low carb': ['low[- ]?carb', 'keto', 'nízkosacharid', 'кето', 'kohlenhydratarm', 'bajo en carbohidratos', 'низкоуглевод'],
  Light: ['light', 'lehk(?:é|ý|á)', 'fit', 'nízkokalori', 'лека', 'леко', 'leicht', 'ligero', 'leggero', 'léger', 'lekk(?:i|ie)', 'лёгк'],
}

const wordRe = (list) => new RegExp(`(?<![\\p{L}])(?:${list.join('|')})`, 'iu')
const STYLE_RE = Object.entries(STYLE_WORDS).map(([tag, list]) => [tag, wordRe(list)])
const DIET_RE = Object.entries(DIET_WORDS).map(([tag, list]) => [tag, wordRe(list)])
const HASHTAG_RE = Object.entries({ ...STYLE_WORDS, ...DIET_WORDS }).map(([tag, list]) => [tag, new RegExp(`^(?:${list.map((w) => w.replace(/\[- \]\?|\[- \]|\s/g, '')).join('|')})`, 'iu')])

// Ingredient names (English catalog names, or the recipe's own words when the
// catalog doesn't know them) that rule a diet out
const MEAT = /(?<![\p{L}])(?:meat|beef|pork|veal|lamb|mutton|chicken|turkey|duck|goose|bacon|ham(?![\p{L}])|sausage|salami|chorizo|prosciutto|lard|gelatin|anchov|fish sauce|tuna|salmon|cod|shrimp|prawn|maso|hovězí|vepřov|kuř|krůt|kachn|slanin|šunk|klobás|sádl|ryb(?!íz)|месо|пиле|свинск|телешк|агнешк|наденица|шунка|бекон|риба|fleisch|huhn|speck|carne|pollo|cerdo|manzo|maiale|viande|poulet|porc|mięs|kurczak|wieprz|мясо|курица|свинин|говядин)/iu
const STOCK = /(?:chicken|beef|fish|meat|bone) (?:stock|broth)|stock cube|bouillon/i
const DAIRY = /(?<![\p{L}])(?:milk|butter|cream|cheese|yog(?:h)?urt|quark|kefir|ghee|whey|mléko|máslo|smetan|sýr|tvaroh|jogurt|мляко|масло краве|сирене|кашкавал|сметана|кисело мляко|milch|sahne|käse|leche|queso|latte|formaggio|lait|beurre|fromage|mleko|masło|ser |молоко|сливк|сыр)/iu
const PLANT = /(?:plant|soy|soya|oat|almond|coconut|rice|cashew|vegan|peanut|cocoa|nut) ?(?:milk|butter|cream|cheese|yog)|tofu|tempeh|seitan|hummus|margarine|butter ?beans?|butternut|cocoa butter|cream of tartar/i
const EGG = /(?<![\p{L}])(?:eggs?|egg yolks?|egg whites?|vejc|vajec|vajíč|яйц|ei(?:er)?|huevo|uov|œuf|oeuf|jaj)/iu
const ANIMAL = /honey|med(?![\p{L}])|мед(?![\p{L}])|gelatin|želatin/iu
const GLUTEN =
  /(?<![\p{L}])(?:flour|wheat|bread|breadcrumbs|pasta|spaghetti|penne|macaroni|lasagne|tagliatelle|fusilli|noodles|couscous|bulgur|semolina|barley|rye|spelt|pastry|dough|tortilla|pita|naan|biscuit|cookie|cracker|crouton|soy sauce|beer|oats?|mouka|chléb|chleba|rohlík|houska|strouhank|těstovin|krupic|брашно|хляб|галет|тесто|макарон|mehl|brot|harina|farina|pane|farine|pain|mąka|chleb|мука|хлеб)/iu
const GLUTEN_FREE = /(?:rice|corn|maize|potato|almond|coconut|buckwheat|chickpea|tapioca|gluten[- ]?free|rice paper|rice noodles|glass noodles|bezlepk)/i
const CHILLI = /chil+i|chile|jalape|cayenne|sriracha|gochujang|gochugaru|harissa|hot sauce|sambal|chipotle|habanero|tabasco|piri|scotch bonnet|bird'?s eye|wasabi|feferon|чушк[аи] лют|люти|lute|scharf|peperoncin|guindilla|острый перец/iu
const MILD = /sweet chil+i|chil+i con carne|sweet paprika/i

const OIL = /(?<![\p{L}])(?:oil|olej|олио|масло|öl|aceite|olio|huile)/iu
// Millilitres of oil in a row, for deep frying
const oilMl = (i) => {
  const n = parseFloat(String(i.qty ?? '').replace(',', '.'))
  if (!(n > 0) || !OIL.test(i.name ?? '')) return 0
  const u = String(i.unit ?? '').toLowerCase()
  return u === 'l' ? n * 1000 : u === 'dl' ? n * 100 : u === 'ml' ? n : u === 'cup' || u === 'cups' ? n * 240 : 0
}

/** Diet and style tags named by a caption's hashtags (#vegan, #airfryer, #keto). */
export function tagsFromHashtags(text) {
  const out = []
  for (const m of String(text ?? '').matchAll(/#([\p{L}\d_-]+)/gu)) {
    const tag = m[1].toLowerCase().replace(/[_-]/g, '')
    for (const [name, re] of HASHTAG_RE) if (re.test(tag) && !out.includes(name)) out.push(name)
  }
  // Every reel calls itself #protein or #fit; only clear ones count
  return out.filter(
    (t) => (t !== 'Light' || /#(?:light|lehk|лек)/i.test(text)) && (t !== 'High protein' || /#(?:high_?protein|vysokoprotein|proteinrecipe|protein(?:ov|ow))/i.test(text)),
  )
}

/** Tags from schema.org suitableForDiet ("https://schema.org/VeganDiet") and keywords. */
export function tagsFromSchema(recipe) {
  const out = []
  const DIETS = { Vegan: 'Vegan', Vegetarian: 'Vegetarian', GlutenFree: 'Gluten-free', LowLactose: 'Dairy-free', LowCalorie: 'Light', LowFat: 'Light' }
  for (const d of [].concat(recipe?.suitableForDiet ?? [])) {
    const name = DIETS[String(d).split('/').pop().replace(/Diet$/, '')]
    if (name && !out.includes(name)) out.push(name)
  }
  const words = [].concat(recipe?.keywords ?? []).flatMap((k) => String(k).split(','))
  for (const w of words) for (const [name, re] of DIET_RE) if (re.test(w.trim()) && w.trim().length < 30 && !out.includes(name)) out.push(name)
  return out
}

/**
 * Tags a recipe looks like it has: { tags, why } where why maps a tag to a
 * short reason. `match` finds an ingredient's catalog entry by name.
 */
export function suggestTags(recipe, match = () => null) {
  const why = {}
  const add = (tag, reason) => (why[tag] ??= reason)
  const named = (recipe.ingredients ?? []).filter((i) => i.name?.trim())
  const rows = named.map((i) => {
    const entry = match(i.name)
    return { i, entry, name: entry?.name ?? i.name, own: i.name }
  })
  const words = (r) => `${r.name} | ${r.own} | ${r.entry?.base ?? ''}`
  const steps = [recipe.steps, recipe.original?.steps].filter(Boolean).join('\n')
  const title = [recipe.title, recipe.original?.title].filter(Boolean).join('\n')

  for (const [tag, re] of DIET_RE) if (re.test(title) && tag !== 'Light') add(tag, 'in the title')
  for (const [tag, re] of STYLE_RE) {
    if (re.test(title)) add(tag, 'in the title')
    else if (re.test(steps) && tag !== 'Fried' && tag !== 'Spicy') add(tag, 'in the steps')
  }
  // Frying words in the steps only count with breading or a lot of oil (schnitzel, fritters)
  const oil = named.reduce((s, i) => s + oilMl(i), 0)
  if (oil >= 250) add('Fried', `${Math.round(oil)} ml of oil`)
  else if (STYLE_RE.find(([t]) => t === 'Fried')[1].test(steps) && rows.some((r) => /breadcrumb|strouhank|галета|panko|paniermehl/i.test(words(r)))) add('Fried', 'breaded and fried')
  if (rows.some((r) => CHILLI.test(words(r)) && !MILD.test(words(r)))) add('Spicy', 'has chilli')
  else if (STYLE_RE.find(([t]) => t === 'Spicy')[1].test(steps)) add('Spicy', 'in the steps')

  // Diets: only when most ingredients are known, so an unknown one is unlikely to be meat
  const known = rows.filter((r) => r.entry).length
  if (rows.length >= 2 && known >= rows.length * 0.7) {
    const meat = rows.some((r) => ['Meat', 'Fish'].includes(r.entry?.aisle) || MEAT.test(words(r)) || STOCK.test(words(r)))
    const dairy = rows.some((r) => !PLANT.test(words(r)) && !EGG.test(r.name) && (r.entry?.aisle === 'Dairy & eggs' ? !/tofu|tempeh|seitan|hummus|plant milk|vegan/i.test(r.name) : DAIRY.test(words(r))))
    const egg = rows.some((r) => EGG.test(r.name) && !/noodle|flax/i.test(r.name))
    const animal = rows.some((r) => ANIMAL.test(words(r)))
    const gluten = rows.some((r) => GLUTEN.test(words(r)) && !GLUTEN_FREE.test(words(r)))
    if (!meat) add('Vegetarian', 'no meat or fish')
    if (!meat && !dairy && !egg && !animal) add('Vegan', 'no meat, fish, dairy or eggs')
    if (!dairy) add('Dairy-free', 'no dairy')
    if (!gluten && known === rows.length) add('Gluten-free', 'no flour, bread or pasta')
  }

  // Calories and macros per portion, when most ingredients are counted
  if (recipe.servings > 0 && rows.length) {
    const kcal = recipeCalories(named, match)
    const macros = recipeMacros(named, match)
    const counted = named.length - kcal.missing.length >= named.length * 0.7
    if (counted && kcal.total > 0) {
      const per = kcal.total / recipe.servings
      const protein = macros.protein / recipe.servings
      const carbs = macros.carbs / recipe.servings
      if (per <= 450) add('Light', `about ${Math.round(per)} kcal a portion`)
      if (protein >= 30 || (protein >= 20 && (protein * 4) / per >= 0.3)) add('High protein', `about ${Math.round(protein)} g protein a portion`)
      if (carbs <= 20 && per >= 150) add('Low carb', `about ${Math.round(carbs)} g carbs a portion`)
    }
  }
  // The two that make the other redundant
  if (why.Vegan) {
    delete why.Vegetarian
    delete why['Dairy-free']
  }
  const tags = DEFAULT_TAGS.filter((t) => why[t]).concat(Object.keys(why).filter((t) => !DEFAULT_TAGS.includes(t)))
  return { tags, why }
}

/** Tags to start an imported recipe with: hashtags and the site's own, then the guessed ones. */
export function importTags(recipe, match) {
  return mergeTags(recipe.tags ?? [], suggestTags(recipe, match).tags)
}
