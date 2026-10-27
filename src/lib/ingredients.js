import { detectServings, timesFromText } from './recipeMeta.js'

// Rule-based reader for recipe captions and transcripts, in Czech, Bulgarian
// and English, plus the units and headings of German, Spanish, Italian, French,
// Polish, Russian, Japanese, Chinese and Korean (other languages are translated
// to English first, in App). It finds ingredient lines ("200 g hladké mouky", "2 с.л. олио", "Flour - 2 cups") and
// method steps. Anything it can't place is left for the user to edit.

const UNITS = {
  g: ['g', 'gr', 'gram', 'gramy', 'gramů', 'gramu', 'grams', 'gramm', 'г', 'гр', 'грам', 'грама', 'grammi', 'gramos', 'grammes', 'gramów', 'грамм', 'грамма', 'граммов'],
  kg: ['kg', 'kilo', 'kila', 'кг', 'килограм', 'килограма', 'кило', 'килограмм'],
  ml: ['ml', 'mililitr', 'mililitry', 'mililitrů', 'мл', 'милилитър', 'милилитра', 'millilitri', 'мл.', 'cc'],
  dl: ['dl', 'decilitr', 'decilitry', 'decilitrů', 'дл'],
  l: ['l', 'litr', 'litry', 'litrů', 'liter', 'liters', 'litre', 'litres', 'л', 'литър', 'литра', 'litro', 'litri', 'litros', 'литр'],
  tbsp: ['polévková lžíce', 'polévkové lžíce', 'polévkovou lžíci', 'polévkových lžic', 'lžíce', 'lžic', 'lžíci', 'lž', 'pl', 'tbsp', 'tbs', 'tablespoon', 'tablespoons', 'с.л', 'с. л', 'сл', 'супена лъжица', 'супени лъжици', 'лъжица', 'лъжици', 'el', 'esslöffel', 'cucharada', 'cucharadas', 'cucchiaio', 'cucchiai', 'cuillère à soupe', 'cuillères à soupe', 'c. à s', 'càs', 'łyżka', 'łyżki', 'łyżek', 'ст.л', 'ст. л', 'столовая ложка', 'столовые ложки', 'столовых ложек', 'c. à soupe', 'c.à.s', 'c. a soupe', 'cuil. à soupe', 'cuchara', 'cucharadas soperas', 'cucchiai rasi', 'столовой ложки', 'ст. ложка', 'ст. ложки', 'ст.ложки', 'polievková lyžica', 'polievkové lyžice', 'polievkovú lyžicu', 'lyžica', 'lyžice', 'lyžicu', 'lyžíc', 'cda', 'cdas', 'cucharada sopera', 'cucharadas soperas', 'c.s', 'cs'],
  tsp: ['kávová lžička', 'kávové lžičky', 'kávovou lžičku', 'kávových lžiček', 'čajová lžička', 'čajové lžičky', 'čajovou lžičku', 'čajových lžiček', 'lžička', 'lžičky', 'lžiček', 'lžičku', 'lžl', 'kl', 'tsp', 'teaspoon', 'teaspoons', 'ч.л', 'ч. л', 'чл', 'к.л', 'к. л', 'чаена лъжичка', 'чаени лъжички', 'кафена лъжичка', 'кафени лъжички', 'лъжичка', 'лъжички', 'tl', 'teelöffel', 'cucharadita', 'cucharaditas', 'cucchiaino', 'cucchiaini', 'cuillère à café', 'cuillères à café', 'c. à c', 'càc', 'łyżeczka', 'łyżeczki', 'łyżeczek', 'чайная ложка', 'чайные ложки', 'чайных ложек', 'c. à café', 'c. à thé', 'c.à.c', 'c. a café', 'cuil. à café', 'cucharaditas rasas', 'cucchiaini rasi', 'ч. ложка', 'ч. ложки', 'ч.ложки', 'чайной ложки', 'kávová lyžička', 'kávové lyžičky', 'kávovú lyžičku', 'čajová lyžička', 'čajové lyžičky', 'lyžička', 'lyžičky', 'lyžičku', 'lyžičiek', 'cdta', 'cdtas', 'cdita', 'cditas', 'c.c'],
  cup: ['mug', 'mugs', 'glass', 'glasses', 'hrnek', 'hrnky', 'hrnku', 'hrnků', 'cup', 'cups', 'ч.ч', 'ч. ч', 'чч', 'чаена чаша', 'чаени чаши', 'водна чаша', 'водни чаши', 'чаша', 'чаши', 'tasse', 'tasses', 'taza', 'tazas', 'tazza', 'tazze', 'szklanka', 'szklanki', 'szklanek', 'стакан', 'стакана', 'стаканов', 'vaso', 'vasos', 'bicchiere', 'bicchieri', 'verre', 'verres', 'Tasse', 'Tassen'],
  pcs: ['stalk', 'stalks', 'sprig', 'sprigs', 'ks', 'kus', 'kusy', 'kusů', 'piece', 'pieces', 'pcs', 'бр', 'брой', 'броя', 'stück', 'stk', 'szt', 'шт', 'pezzo', 'pezzi', 'pieza', 'piezas', 'pièce', 'pièces', 'sztuka', 'sztuki', 'штука', 'штуки', 'штук'],
  clove: ['stroužek', 'stroužky', 'stroužků', 'clove', 'cloves', 'скилидка', 'скилидки', 'скилидката', 'Zehe', 'Zehen', 'spicchio', 'spicchi', 'diente', 'dientes', 'gousse', 'gousses', 'ząbek', 'ząbki', 'ząbków', 'зубчик', 'зубчика', 'зубчиков'],
  pinch: ['špetka', 'špetku', 'špetky', 'pinch', 'щипка', 'щипки', 'Prise', 'Prisen', 'Messerspitze', 'pizzico', 'pizzichi', 'pizca', 'pizcas', 'pincée', 'pincées', 'szczypta', 'szczypty', 'щепотка', 'щепотки'],
  can: ['plechovka', 'plechovky', 'plechovku', 'konzerva', 'konzervy', 'can', 'cans', 'tin', 'tins', 'консерва', 'консерви', 'кутия', 'кутии', 'буркан', 'буркана', 'jar', 'jars', 'Dose', 'Dosen', 'lata', 'latas', 'barattolo', 'barattoli', 'boîte', 'boîtes', 'puszka', 'puszki', 'банка', 'банки'],
  pack: ['kostka', 'kostky', 'kostku', 'kostek', 'кофичка', 'кофички', 'envelope', 'envelopes', 'balení', 'bal', 'balíček', 'balíčky', 'balíčku', 'pack', 'packs', 'packet', 'packets', 'пакет', 'пакета', 'пакетче', 'пакетчета', 'опаковка', 'опаковки', 'Packung', 'Packungen', 'Päckchen', 'Pck', 'Pkg', 'bustina', 'bustine', 'confezione', 'sobre', 'sobres', 'paquete', 'paquetes', 'sachet', 'sachets', 'paquet', 'paczka', 'paczki', 'opakowanie', 'пакетик', 'пакетика', 'упаковка'],
  head: ['hlava', 'hlavy', 'hlav', 'head', 'heads', 'глава', 'глави', 'главичка', 'главички'],
  slice: ['plátek', 'plátky', 'plátků', 'slice', 'slices', 'филия', 'филии', 'резен', 'резена', 'резенчета', 'Scheibe', 'Scheiben', 'fetta', 'fette', 'rebanada', 'rebanadas', 'loncha', 'lonchas', 'tranche', 'tranches', 'plaster', 'plastry', 'ломтик', 'ломтика', 'ломтиков'],
  bunch: ['svazek', 'svazky', 'svazku', 'bunch', 'връзка', 'връзки', 'китка', 'китки', 'Bund', 'mazzetto', 'mazzo', 'manojo', 'botte', 'pęczek', 'pęczki', 'пучок', 'пучка'],
  handful: ['hrst', 'hrsti', 'handful', 'шепа', 'шепи', 'Handvoll', 'manciata', 'puñado', 'poignée', 'garść', 'горсть'],
  floz: ['fl oz', 'fl. oz', 'fl.oz', 'floz', 'fluid ounce', 'fluid ounces'],
  pint: ['pint', 'pints', 'pt'],
  quart: ['quart', 'quarts', 'qt'],
  oz: ['oz', 'ounce', 'ounces'],
  stick: ['stick', 'sticks'],
  lb: ['lb', 'lbs', 'pound', 'pounds'],
}

export const UNIT_LOOKUP = new Map(Object.entries(UNITS).flatMap(([canon, words]) => words.map((w) => [w.toLowerCase(), canon])))
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s*')
const UNIT_RE = [...UNIT_LOOKUP.keys()].sort((a, b) => b.length - a.length).map(escape).join('|')

/** Canonical unit of a unit as written ("С. л." → tbsp), or undefined. */
export const unitOf = (u) => UNIT_LOOKUP.get(u.toLowerCase().replace(/\.$/, '').replace(/\s+/g, ' ')) ?? UNIT_LOOKUP.get(u.toLowerCase().replace(/\.$/, '').replace(/\s+/g, ''))

const CJK_CHAR = '[\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}\\p{Script=Hangul}]'
const FRACTIONS = { '½': 0.5, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 0.25, '¾': 0.75, '⅛': 0.125 }
const NUM = `(?:\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d+[½⅓⅔¼¾⅛]|\\d+(?:[.,]\\d+)?|[½⅓⅔¼¾⅛])`
const QTY = `(${NUM})(?:\\s*(?:-|–|to|až|до)\\s*(${NUM}))?`
const UNIT = `(${UNIT_RE})\\.?(?![\\p{L}])`

// "200 g mouky", "2 eggs", "1/2 cup sugar", "200g flour"
const QTY_FIRST = new RegExp(`^${QTY}\\s*(?:${UNIT})?\\s*(?:of\\s+)?(.+)$`, 'iu')
// "Garlic: 2 heads (for roasting)", "Spices — 1 teaspoon each": name, separator, amount, note
const LABELLED = new RegExp(`^(.+?)\\s*[:–—-]\\s+${QTY}\\s*(?:${UNIT})?\\s*(.*)$`, 'iu')
// "mouka 200 g", "Flour - 200g", "cukr: 2 lžíce"
// "Salt and pepper: to taste", "Sůl: podle chuti"
const TASTE = '(?:to taste|as needed|optional|podle chuti|dle chuti|podle potřeby|dle potřeby|volitelně|на вкус|по вкус|по желание|според вкуса|колкото поеме|nach geschmack|nach belieben|q\\.\\s?b\\.?|quanto basta|a gusto|al gusto|c/n|cantidad necesaria|au goût|selon le goût|do smaku|по вкусу)'
const TO_TASTE = new RegExp(`^(.+?)\\s*[:–—-]?\\s+(${TASTE})\\.?$`, 'iu')
// "q.b. formaggio grattugiato", "a gusto Sal", "c/n Agua"
const TASTE_FIRST = new RegExp(`^(${TASTE})\\s+(.+)$`, 'iu')
const NAME_FIRST = new RegExp(`^(.+?)\\s*[-–:,]?\\s+${QTY}\\s*(?:${UNIT})?\\s*$`, 'iu')

const INGREDIENT_HEADER = /^(ingredients?|ingredience|suroviny|potřebujete|budete potřebovat|you('ll)? need|what you need|съставки|продукти|необходими продукти|необходими съставки|нужни продукти|нужни съставки|необходимо|ви трябва|zutaten|ingredientes|ingredienti|ingrédients|składniki|ingrediencie|ингредиенты|продукты|інгредієнти|材料|食材|用料|主料|主材料|재료|필수\s?재료|주재료|기본\s?재료|준비물)(?![\p{L}])/iu
const STEP_HEADER = /^(postup|příprava|method|instructions|directions|steps|how to make( it)?|начин на приготвяне|приготвяне|приготовление|изпълнение|стъпки|инструкции|метод|zubereitung|anleitung|preparación|elaboración|modo de preparo|preparazione|procedimento|préparation|étapes|przygotowanie|sposób przygotowania|приготовление|способ приготовления|приготування|paso a paso|pasos|modo de preparación|procedimiento|passaggi|étapes|作り方|手順|做法|作法|步骤|步驟|制作方法|製作方法|制作步骤|만드는\s?법|조리\s?순서|조리\s?과정|조리\s?방법|조리법)(?![\p{L}])|(?:做法步骤|做法步驟|的做法|的作法)$/iu
// A sub-list heading: "For the sauce", "Na omáčku", "Pro těsto", "За соса", and the same in the languages
// recipes often come in before they are translated: "Für die Soße", "Para la salsa", "Per il sugo", "Pour la sauce", "Do sosu", "Для соуса"
const FOR = '(?:for|na|pro|за|für|para|per|pour|do|для)'
const FOR_HEADING = new RegExp(`^${FOR}\\s+\\p{L}`, 'iu')
// "Ingredients for the sauce", "Suroviny na těsto", "Продукти за плънката": a heading for one sub-list
const INGREDIENTS_FOR = new RegExp(`^(?:ingredients?|ingredience|suroviny|съставки|продукти|необходими продукти|необходими съставки|нужни продукти|zutaten|ingredientes|ingredienti|ingrédients|składniki|ингредиенты|продукты)\\s+(${FOR}\\s+.+)$`, 'iu')
const capitalise = (s) => s.charAt(0).toLocaleUpperCase() + s.slice(1)
const isShouted = (s) => s === s.toLocaleUpperCase() && /\p{Lu}/u.test(s)
const BRACKETED = /^[【\[<＜〈《「(（]\s*([^【】\[\]<>＜＞〈〉《》「」()（）]{1,30}?)\s*[】\]>＞〉》」)）][\s:：]*$/u
// Sub-lists in Japanese, Chinese and Korean recipes: 調味料 / 调料 (seasoning), タレ (sauce), 양념 (seasoning)
const CJK_GROUP_WORDS = /^(?:合わせ調味料|調味料|调味料|调料|調料|配料|辅料|輔料|酱汁|醬汁|酱料|醬料|料汁|タレ|たれ|ソース|あん|ドレッシング|양념장|양념|소스|드레싱|육수)$/u
// "あんの材料", "酱汁材料", "양념 재료", "[양념재료]": the ingredients of one part
const CJK_PART_OF = /^(.+?)\s*(?:の材料|材料|用料|재료)$/u
/** The group a CJK heading names, null when it names the whole list, undefined when it is not one. */
function cjkGroup(header) {
  if (!CJK.test(header) || /\d/.test(header)) return undefined
  if (CJK_GROUP_WORDS.test(header)) return header
  const m = header.match(CJK_PART_OF)
  if (m && m[1].length <= 12) return /^(?:필수|主|主要|基本)$/.test(m[1]) ? null : m[1]
  return undefined
}
// "ЗА ТЕСТОТО" → "За тестото"
const headingCase = (s) => capitalise(isShouted(s) ? s.toLocaleLowerCase() : s)

/**
 * The group a heading line starts ("For the sauce"), or null. Inside an ingredient list a short line
 * ending in ":" or written in capitals ("SAUCE") is one too.
 */
export function groupHeading(line, inList) {
  const bracketed = BRACKETED.exec(line.trim())
  const header = (bracketed ? bracketed[1] : line).replace(/[\s:：–—-]+$/u, '').trim()
  if (!header) return null
  const cjk = cjkGroup(header)
  if (cjk !== undefined) return cjk
  // "[Sauce]", "【タレ】", "<양념장>": a line in brackets is a heading, unless it names the whole list
  if (bracketed && !/\d/.test(header) && wordCount(header) <= 5 && !new RegExp(`^${TASTE}$`, 'iu').test(header)) return INGREDIENT_HEADER.test(header) || STEP_HEADER.test(header) ? null : headingCase(header)
  if (!header || /\d/.test(header) || /[.!?]$/.test(header)) return null
  if (STEP_HEADER.test(header) || /^(?:notes?|tips?|poznámk|tip|бележк|съвет)/iu.test(header)) return null
  const words = wordCount(header)
  const sub = header.match(INGREDIENTS_FOR)
  if (sub && words <= 7) return headingCase(sub[1])
  if (INGREDIENT_HEADER.test(header)) return null
  if (words > 5 || parseIngredientLine(line)) return null
  if (FOR_HEADING.test(header) && (inList || /:\s*$/.test(line) || words <= 4)) return headingCase(header)
  if (!inList) return null
  if (/:\s*$/.test(line)) return headingCase(cleanName(header))
  if (header.length >= 3 && isShouted(header) && words <= 3) return headingCase(header)
  return null
}

const STEP_WORD = '(?:step|krok|стъпка|schritt|paso|passo|étape|etape|шаг|步骤|步驟|단계|ステップ)'
const NUMBERED_STEP = new RegExp(`^(?:${STEP_WORD}\\s*)?\\d{1,2}\\s*(?:[.):]\\s+|[.)、．]\\s*(?=${CJK_CHAR}))(?=\\p{L})`, 'iu')
// A step number on a line of its own ("1", "Стъпка 1", "Schritt 2"), as recipe sites lay them out
const STEP_NUMBER_ONLY = new RegExp(`^(?:${STEP_WORD}\\s*)?\\d{1,2}\\s*[.):]?$`, 'iu')
const DECORATION = /^[\s\-–—•*·・>]+|^[\p{Extended_Pictographic}️‍\s]+/u

export function parseQuantity(s) {
  if (!s) return null
  s = s.trim()
  if (FRACTIONS[s] != null) return FRACTIONS[s]
  let m = s.match(/^(\d+)\s+(\d+)\/(\d+)$/)
  if (m) return Number(m[1]) + Number(m[2]) / Number(m[3])
  m = s.match(/^(\d+)\/(\d+)$/)
  if (m) return Number(m[1]) / Number(m[2])
  m = s.match(/^(\d+)\s*([½⅓⅔¼¾⅛])$/)
  if (m) return Number(m[1]) + FRACTIONS[m[2]]
  const n = Number(s.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

// Full-width letters and digits ("１２０ｇ"), the ideographic space, circled step numbers
// ("①") and wave dashes ("10〜15分") as plain text, so Japanese, Chinese and Korean lines read like the rest
const CIRCLED = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳'
export const plainWidth = (s) =>
  s
    // (，。！？ stay as they are: steps keep their own punctuation)
    .replace(/[\uFF08-\uFF0B\uFF0D-\uFF1A\uFF1C-\uFF1E\uFF21-\uFF3A\uFF41-\uFF5A]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/\u3000/g, ' ')
    .replace(/[〜～]/g, '-')
    .replace(/[①-⑳]/g, (c) => `${CIRCLED.indexOf(c) + 1}. `)

function cleanLine(line) {
  return plainWidth(line)
    .replace(DECORATION, '')
    .replace(/(\s#[\p{L}\d_]+)+\s*$/u, '') // trailing hashtags
    .trim()
}

// Measurements left in a name ("ground beef (680g)", "/450 g butter") belong in the amount
const MEASURE_UNITS = 'g|gr|grams?|kg|ml|l|dl|oz|ounces?|lbs?|pounds?|cups?|tbsp|tsp|fl\\.?\\s?oz|г|гр|кг|мл|л'
const IN_PARENS = new RegExp(`\\(\\s*(?:about|approx\\.?|ca\\.?|около|~)?\\s*${NUM}\\s*(?:${MEASURE_UNITS})\\.?(?:\\s*(?:/|or)\\s*${NUM}\\s*(?:${MEASURE_UNITS})\\.?)?\\s*\\)`, 'giu')
const LOOSE = new RegExp(`(?:^|\\s|/)${NUM}\\s*(?:${MEASURE_UNITS})\\.?(?=\\s|$|[,/)])`, 'giu')
const stripMeasures = (s) => s.replace(IN_PARENS, ' ').replace(LOOSE, ' ').replace(/\(\s*\)/g, ' ').replace(/\s{2,}/g, ' ')

const cleanName = (s) =>
  stripMeasures(s)
    .replace(/^[-–:,/\s]+|[\s.,;:/]+$/g, '')
    .replace(/^(?:of|de|di|du|des)\s+(?=\p{L})|^(?:d|dell|dall)['’](?=\p{L})/iu, '') // "50 ml / 2 oz of cream", "300 g de harina", "1 c. à soupe d'origan"
    .trim()

// A unit left at the start of a name, as a translation leaves it: "tablespoon of cornstarch", "heaped teaspoon salt"
const UNIT_IN_NAME = new RegExp(`^(?:(?:heaped|heaping|level|rounded|scant|full|large|small)\\s+)?(${UNIT_RE})\\.?\\s+(?:of\\s+)?(?=\\p{L})`, 'iu')

// "glass noodles" are noodles, not a glass of noodles
const NOT_A_UNIT = /^glass(?:es)?\s+noodles?\b/i

// Peppers measured in spoons are the ground spice: "1 tbsp sweet peppers" (from Bulgarian
// "сладък червен пипер") is sweet paprika, "1 tsp hot red pepper" hot paprika
const SPICE_UNITS = new Set(['tsp', 'tbsp', 'pinch'])
const PEPPER_SPICE = /^(sweet|hot|smoked)?\s*(?:red\s+)?peppers?(\s*[,(].*)?$/i
function pepperSpice(i, unit) {
  if (!SPICE_UNITS.has(unit)) return i
  const m = String(i.name ?? '').match(PEPPER_SPICE)
  // Plain "pepper" in spoons is black pepper, which the catalog already reads
  if (!m || (!m[1] && !/red/i.test(i.name))) return i
  return { ...i, name: `${m[1] ? `${m[1].toLowerCase()} ` : ''}paprika${m[2] ?? ''}` }
}

/** The name with its first letter made capital ("onion" → "Onion", "лук" → "Лук"); the rest stays as written. */
export const capitalizeName = (name) => String(name ?? '').replace(/^([^\p{L}\p{N}]*)(\p{Ll})/u, (all, lead, c) => lead + c.toLocaleUpperCase())

/** An editable ingredient ({ qty, unit, name }) with a unit or "of" moved out of its name. */
export function tidyIngredient(i) {
  const name = i.name ?? ''
  const m = i.unit || NOT_A_UNIT.test(name) ? null : name.match(UNIT_IN_NAME)
  const unit = m && m[1].length > 1 ? unitOf(m[1]) : null
  if (unit) return pepperSpice({ ...i, unit: unit === 'pcs' ? '' : unit, name: name.slice(m[0].length) }, unit)
  const rest = name.replace(/^of\s+(?=\p{L})/iu, '')
  return pepperSpice(rest === name ? i : { ...i, name: rest }, unitOf(String(i.unit ?? '')) ?? i.unit)
}

// Amounts written as words at the start of a line: "половин чаша", "půl lžičky", "две яйца"
const WORD_AMOUNTS = {
  половин: '½', půl: '½', един: '1', една: '1', едно: '1', два: '2', две: '2', три: '3', четири: '4', пет: '5', шест: '6',
  jedna: '1', jeden: '1', dvě: '2', dva: '2', tři: '3', čtyři: '4',
  half: '½', one: '1', two: '2', three: '3', four: '4',
  halbe: '½', halber: '½', eine: '1', einen: '1', zwei: '2', drei: '3',
  medio: '½', media: '½', mezzo: '½', mezza: '½', due: '2', dos: '2', tres: '3',
  demi: '½', demie: '½', deux: '2', trois: '3',
  pół: '½', dwie: '2', trzy: '3',
  половина: '½', одна: '1', одно: '1',
}
const WORD_AMOUNT = new RegExp(`^(${Object.keys(WORD_AMOUNTS).join('|')})\\s+(?=\\p{L})`, 'iu')
// Short words that are only an amount before a unit: "a pinch of salt", "un cucchiaio d'olio", "ein EL Öl"
const ARTICLE_UNIT = new RegExp(`^(?:a|an|un|una|uno|une|ein|einen|eine)\\s+(?=(?:heaped |level |rounded )?(?:${UNIT_RE})\\.?(?![\\p{L}]))`, 'iu')
// A line that starts with a unit and no amount means one: "Щипка сол", "Чайная ложка муки", "płaska łyżeczka sody"
const UNIT_FIRST = new RegExp(`^(?:(?:płaska|płaskie|czubata|czubate|heaped|level|rounded|gestrichener|gehäufter|rasa|colmo)\\s+)?(?=(?:${UNIT_RE})\\.?\\s+\\p{L})`, 'iu')
const wordAmount = (s) => {
  const t = s.replace(WORD_AMOUNT, (all, w) => `${WORD_AMOUNTS[w.toLowerCase()]} `).replace(ARTICLE_UNIT, '1 ')
  const m = t.match(UNIT_FIRST)
  // Only units long enough not to be a word ("g", "l", "pl" stay as they are)
  return m && /^\p{L}{3}/u.test(t.slice(m[0].length)) && unitOf(t.slice(m[0].length).match(new RegExp(`^(?:${UNIT_RE})`, 'iu'))?.[0] ?? '') ? `1 ${t.slice(m[0].length)}` : t
}

// In English recipes a capital "T" is a tablespoon and a small "t" a teaspoon, so these go before
// units are matched without regard to case
const SPOON_LETTER = new RegExp(`^(${NUM}(?:\\s*(?:-|–|to)\\s*${NUM})?)\\s*([Tt])\\.?\\s+(?=\\p{L})`, 'u')
const spoonLetter = (s) => s.replace(SPOON_LETTER, (all, qty, t) => `${qty} ${t === 'T' ? 'tbsp' : 'tsp'} `)

// Japanese, Chinese and Korean. Words are not split by spaces, so these lines have their own reader.
export const CJK = new RegExp(CJK_CHAR, 'u')
const CJK_UNITS = {
  g: ['g', 'gr', '克', 'グラム', '그램'],
  kg: ['kg', '公斤', '千克', 'キロ', '킬로그램', '킬로'],
  ml: ['ml', 'cc', '毫升', 'ミリリットル', '밀리리터', '미리'],
  l: ['l', 'リットル', '리터'],
  tbsp: ['大さじ', '大匙', '大匙子', '汤匙', '湯匙', '大勺', '큰술', '큰스푼', '밥숟가락', '숟가락', '숟갈', 'T', 'tbsp'],
  tsp: ['小さじ', '小匙', '茶匙', '小勺', '작은술', '티스푼', '찻숟가락', 't', 'tsp'],
  cup: ['カップ', '杯', '컵', '종이컵'],
  pcs: ['個', '个', '개', '本', '根', '只', '隻', '颗', '顆', '粒', '마리', '대', '알', '丁'],
  clove: ['瓣', '쪽', 'かけ', '片'],
  slice: ['枚', '장', '조각'],
  pinch: ['ひとつまみ', '一撮', '꼬집'],
  pack: ['パック', '袋', '包', '봉지', '봉', '팩'],
  can: ['缶', '罐', '캔'],
  bunch: ['束', '把', '단'],
  handful: ['줌', 'ひとつかみ'],
  head: ['玉', '头', '頭', '통', '株'],
  // Chinese weights, turned into grams
  jin: ['斤'],
  liang: ['两', '兩'],
}
const CJK_UNIT_LOOKUP = new Map(Object.entries(CJK_UNITS).flatMap(([canon, words]) => words.map((w) => [w, canon])))
const CJK_UNIT = `(${[...CJK_UNIT_LOOKUP.keys()].sort((a, b) => b.length - a.length).map(escape).join('|')})`
// 半 = ½, Chinese and Korean numerals
const CJK_NUMBERS = { 半: '½', 半分: '½', 반: '½', 一: '1', 二: '2', 两: '2', 兩: '2', 三: '3', 四: '4', 五: '5', 六: '6', 七: '7', 八: '8', 九: '9', 十: '10', 한: '1', 두: '2', 세: '3', 네: '4' }
const CJK_NUM = `(?:${NUM}|半分|[半반一二两兩三四五六七八九十한두세네])`
const CJK_QTY = `(${CJK_NUM})(?:\\s*(?:-|~|〜|～)\\s*(${CJK_NUM}))?`
const cjkNumber = (s) => (s == null ? null : parseQuantity(CJK_NUMBERS[s] ?? s))
const SIZE = '(?:約|约|약|中|大|小|大きめ|小さめ)?'
// 少々 (a little), 適量 / 适量 / 적당량 (as needed), お好みで (to your liking)
const CJK_TASTE = '(?:お好みで\\s*)?(?:少々|少量|適量|適宜|适量|適量|少许|少許|若干|약간|적당량|적당히|조금|お好みで|お好み)'
// "玉ねぎ 1/2個", "豚肉 150g", "猪肉300克", "じゃがいも 中3個", "姜片 4片"
const CJK_NAME_QTY = new RegExp(`^(.+?)\\s*${SIZE}\\s*${CJK_QTY}\\s*${CJK_UNIT}?$`, 'u')
// "醤油 大さじ2", "砂糖 小さじ1/2": the unit comes before the amount
const CJK_UNIT_QTY = new RegExp(`^(.+?)\\s*${CJK_UNIT}\\s*${CJK_QTY}$`, 'u')
// "300克猪肉", "2个鸡蛋", "半个洋葱"
const CJK_QTY_NAME = new RegExp(`^${CJK_QTY}\\s*${CJK_UNIT}\\s*(.+)$`, 'u')
const CJK_TASTE_LINE = new RegExp(`^(.+?)\\s*(${CJK_TASTE})$`, 'u')
// "塩 ひとつまみ": a unit with no amount means one
const CJK_UNIT_ONLY = new RegExp(`^(.+?)\\s*(ひとつまみ|一撮|꼬집|ひとつかみ|한\\s*줌|한\\s*꼬집)$`, 'u')

function cjkIngredient(raw, name, qty, qtyMax, unitWord, note) {
  let canon = unitWord ? (CJK_UNIT_LOOKUP.get(unitWord) ?? null) : null
  // にんにく1片 is a clove, 姜片 4片 a slice
  if (unitWord === '片' && !/にんにく|ニンニク|大蒜|蒜/.test(name)) canon = 'slice'
  let quantity = cjkNumber(qty)
  let quantityMax = cjkNumber(qtyMax)
  if (canon === 'jin' || canon === 'liang') {
    const g = canon === 'jin' ? 500 : 50
    quantity = quantity == null ? null : quantity * g
    quantityMax = quantityMax == null ? null : quantityMax * g
    canon = 'g'
  }
  if (canon === 'pcs') canon = null
  const clean = name.replace(/^[\s:：、,]+|[\s:：、,]+$/g, '').trim()
  if (!clean) return null
  return { raw, quantity, quantityMax, unit: canon, name: clean, ...(note ? { note } : {}) }
}

/** One Japanese, Chinese or Korean ingredient line, or null. */
function parseCjkLine(text) {
  // A note in brackets at the end: "八角 1-2个（可以不放）", "고추장 2큰술(봉긋하게)"
  const noteMatch = text.match(/^(.*?\S)\s*[(（]([^()（）]*)[)）]$/u)
  const body = noteMatch && !/^\s*\d/.test(noteMatch[2]) ? noteMatch[1] : text.replace(/[(（][^()（）]*[)）]/gu, ' ').trim()
  const note = noteMatch && body === noteMatch[1] ? noteMatch[2].trim() : null
  let m = body.match(CJK_UNIT_QTY)
  if (m && CJK.test(m[1])) return cjkIngredient(text, m[1], m[3], m[4], m[2], note)
  m = body.match(CJK_NAME_QTY)
  // A number at the end needs a unit when it is written as a word ("三" in 三文鱼 is not an amount)
  if (m && CJK.test(m[1]) && (m[4] || /\d|[½⅓⅔¼¾⅛]/.test(m[2]))) return cjkIngredient(text, m[1], m[2], m[3], m[4], note)
  m = body.match(CJK_QTY_NAME)
  if (m && CJK.test(m[4])) return cjkIngredient(text, m[4], m[1], m[2], m[3], note)
  m = body.match(CJK_UNIT_ONLY)
  if (m) return cjkIngredient(text, m[1], '1', null, m[2].replace(/^(한)\s*/, ''), note)
  m = body.match(CJK_TASTE_LINE)
  if (m && CJK.test(m[1])) return { raw: text, quantity: null, quantityMax: null, unit: null, name: m[1].trim(), note: [m[2], note].filter(Boolean).join(', ') }
  return null
}

// "1-1/2 cups" is one and a half (as American recipes write it), not one to a half
const MIXED_DASH = /^(\d+)-(\d+\/\d+)(?=\s|$)/
// "2 heaping tablespoons", "1 level tsp": the spoon is the unit
const HEAPED = new RegExp(`^(${NUM})\\s+(?:heaping|heaped|level|rounded|scant|generous|good|big|small)\\s+(?=(?:${UNIT_RE})\\.?(?![\\p{L}]))`, 'iu')
// "1 (14 oz) can coconut milk": the size of the can is a note
const SIZE_FIRST = new RegExp(`^(${NUM})\\s*\\([^)]*\\)\\s*(?=\\p{L})`, 'u')
// "2 x 400 g cans chickpeas" → 2 cans; "2 x 200 g chicken breasts" → 400 g
const TIMES = /^(\d+)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(g|kg|ml|l|oz|г|гр|кг|мл)\.?\s+(\p{L}+)(.*)$/iu
function multiplied(text) {
  const m = text.match(TIMES)
  if (!m) return text
  const [, n, size, unit, word, rest] = m
  if (['can', 'pack'].includes(unitOf(word))) return `${n} ${word}${rest}`
  return `${Number(n) * Number(size.replace(',', '.'))} ${unit} ${word}${rest}`
}

// "1 cup plus 2 tbsp milk": the two amounts added up in the first unit
const PLUS = new RegExp(`^(${NUM})\\s*(${UNIT_RE})\\.?\\s+(?:plus|\\+|and|a)\\s+(${NUM})\\s*(${UNIT_RE})\\.?\\s+(?=\\p{L})`, 'iu')
const IN_BASE = { tsp: ['ml', 4.93], tbsp: ['ml', 14.79], cup: ['ml', 236.6], ml: ['ml', 1], dl: ['ml', 100], l: ['ml', 1000], g: ['g', 1], kg: ['g', 1000], oz: ['g', 28.35], lb: ['g', 453.6] }
function plus(text) {
  const m = text.match(PLUS)
  if (!m) return text
  const [a, b] = [IN_BASE[unitOf(m[2])], IN_BASE[unitOf(m[4])]]
  if (!a || !b || a[0] !== b[0]) return text
  const total = parseQuantity(m[1]) + (parseQuantity(m[3]) * b[1]) / a[1]
  return `${Math.round(total * 1000) / 1000} ${m[2]} ${text.slice(m[0].length)}`
}

/** Reads one ingredient line. Returns null when the line has no quantity. */
export function parseIngredientLine(line) {
  const text = plus(multiplied(spoonLetter(wordAmount(cleanLine(line))))
    .replace(MIXED_DASH, '$1 $2')
    .replace(HEAPED, '$1 ')
    .replace(SIZE_FIRST, '$1 '))
  if (!text) return null
  if (CJK.test(text)) {
    const cjk = parseCjkLine(text)
    if (cjk) return cjk
  }
  let m = text.match(QTY_FIRST)
  if (m && m[3] && NOT_A_UNIT.test(`${m[3]} ${m[4]}`)) m = [m[0], m[1], m[2], undefined, `${m[3]} ${m[4]}`]
  if (m) {
    const name = cleanName(m[4])
    if (name)
      return {
        raw: text,
        quantity: parseQuantity(m[1]),
        quantityMax: parseQuantity(m[2]),
        unit: m[3] ? unitOf(m[3]) : null,
        name,
      }
  }
  m = text.match(LABELLED)
  if (m) {
    const name = cleanName(m[1])
    const note = m[5].trim()
    if (name)
      return {
        raw: text,
        quantity: parseQuantity(m[2]),
        quantityMax: parseQuantity(m[3]),
        unit: m[4] ? unitOf(m[4]) : null,
        name,
        ...(note ? { note } : {}),
      }
  }
  m = text.match(TO_TASTE)
  if (m && cleanName(m[1])) return { raw: text, quantity: null, quantityMax: null, unit: null, name: cleanName(m[1]), note: m[2] }
  m = text.match(TASTE_FIRST)
  if (m && cleanName(m[2])) return { raw: text, quantity: null, quantityMax: null, unit: null, name: cleanName(m[2]), note: m[1] }
  m = text.match(NAME_FIRST)
  if (m) {
    const name = cleanName(m[1])
    if (name)
      return {
        raw: text,
        quantity: parseQuantity(m[2]),
        quantityMax: parseQuantity(m[3]),
        unit: m[4] ? unitOf(m[4]) : null,
        name,
      }
  }
  return null
}

const wordCount = (s) => s.split(/\s+/).filter(Boolean).length

// Words that say how an ingredient is prepared, so "onion, finely chopped, divided" stays one ingredient
const PREP = /^(?:finely|roughly|thinly|freshly|lightly|chopped|minced|diced|sliced|grated|crushed|peeled|melted|softened|divided|optional|to taste|for\b|at room|room temperature|cut|torn|drained|rinsed|beaten|plus|or\b|about|halved|cubed|shredded|ground$|cooked|uncooked|large|small|medium|whole|fresh$|\w+ed\b)/i
// The same in Bulgarian: "лук, ситно нарязан", "масло, разтопено"
const PREP_BG = /^(?:ситно|едро|тънко|наситно|на кубчета|на филийки|на ленти|нарязан|настърган|счукан|смлян|разтопен|омекнал|обелен|почистен|сварен|изпечен|пресен|голям|голяма|малък|малка|среден|средна|на вкус|по вкус|по желание|за\s|или\s|около)/iu

/**
 * One line holding several ingredients, as separate lines: "1 tsp cumin, 1 tsp paprika and ½ tsp turmeric",
 * or in an ingredient list "Spices: cumin, paprika, turmeric, chilli". Null when it is one ingredient.
 */
export function splitCombined(line, inList = false) {
  const text = cleanLine(line)
  const parts = text
    .split(/\s*;\s*|,\s+|\s+\+\s+|\s+(?:and|a|и|&)\s+(?=\d|[½⅓⅔¼¾⅛])/u)
    .map((s) => s.replace(/^(?:and|a|и|&)\s+/i, '').trim())
    .filter(Boolean)
  if (parts.length < 2) return null
  // "1 tsp each of cumin, paprika and turmeric" / "cumin, paprika and turmeric, 1 tsp each"
  const each = text.match(new RegExp(`^(${NUM}\\s*(?:${UNIT_RE})?\\.?)\\s+each\\s+(?:of\\s+)?(.+)$`, 'iu')) ?? text.match(new RegExp(`^(.+?)\\s*[,—–:-]?\\s+(${NUM}\\s*(?:${UNIT_RE})?\\.?)\\s+each\\.?$`, 'iu'))
  if (each) {
    const [amount, list] = /^\d|^[½⅓⅔¼¾⅛]/.test(each[1]) ? [each[1], each[2]] : [each[2], each[1]]
    const items = list
      .replace(/^[^:]{1,30}:\s*/u, '')
      .split(/,\s+|\s+(?:and|a|и|&)\s+/u).map((x) => x.trim()).filter(Boolean)
    if (items.length >= 2) return items.map((x) => `${amount} ${x}`)
  }
  // Every part has its own amount
  const parsed = parts.map((p) => parseIngredientLine(p))
  if (parsed.every((p) => p && p.quantity != null)) return parts
  if (!inList) return null
  // A label and a list of names without amounts
  const [, label, rest] = text.match(/^([^:]{1,30}):\s*(.+)$/u) ?? [null, null, text]
  const names = rest
    .split(/\s*;\s*|,\s+|\s+(?:and|a|и|&)\s+(?=[^,]*$)/u)
    .map((s) => s.trim())
    .filter(Boolean)
  const short = names.every((n) => wordCount(n) <= 3 && !PREP.test(n) && !PREP_BG.test(n) && !/\d/.test(n))
  if (short && (names.length >= 3 || (label && names.length >= 2))) return names
  return null
}

const MARKER = new RegExp(`^\\s*(?:([★☆◎●○◯◆◇■□▲△])|[(]([A-D])[)]|([A-D])(?=\\s*${CJK_CHAR}))\\s*`, 'u')

/**
 * Splits a caption or transcript into ingredients and steps.
 * Returns { ingredients: [{ raw, quantity, quantityMax, unit, name, note?, group? }], steps: [string] }.
 */
export function parseRecipeText(text) {
  const ingredients = []
  const steps = []
  let section = null // 'ingredients' | 'steps' | null
  let group = null // sub-list inside the ingredients, e.g. "Tzatziki sauce"
  const add = (ing) => ingredients.push(group ? { ...ing, group } : ing)

  for (const rawLine of (text ?? '').split(/\r?\n/)) {
    // "★醤油 大さじ1", "A 酒 大さじ2": Japanese recipes mark what is mixed together; the mark is the group
    const mark = MARKER.exec(plainWidth(rawLine))
    const line = cleanLine(mark ? plainWidth(rawLine).slice(mark[0].length) : rawLine)
    if (!line || /^(#[\p{L}\d_]+\s*)+$/u.test(line)) continue
    if (mark && section !== 'steps') {
      const ing = parseIngredientLine(line)
      if (ing) {
        ingredients.push({ ...ing, group: mark[1] ?? mark[2] ?? mark[3] })
        section ??= 'ingredients'
        continue
      }
    }

    const header = (BRACKETED.exec(line)?.[1] ?? line).replace(/[:：\s]+$/u, '')
    // "Prep time: 15 min", "Приготвяне: 20 мин" are times (read elsewhere), not a section
    if (/^[^:–-]{1,30}[:–-]\s*\d/u.test(line) && wordCount(line) <= 6 && Object.values(timesFromText(line)).some((v) => v != null)) continue
    // "For the sauce", "Ingredients for the sauce", "Тесто:" start a sub-list of the ingredients
    const sub = section !== 'steps' || INGREDIENTS_FOR.test(header) ? groupHeading(line, section === 'ingredients') : null
    if (sub) {
      group = sub
      // A loose "For the sauce" in a caption is only a list once ingredients follow
      if (section === 'ingredients' || /:\s*$/.test(line) || INGREDIENTS_FOR.test(header)) section = 'ingredients'
      continue
    }
    // "Ingredients", or "Необходими продукти за 4 порции"
    // A sentence ("Składniki przekładamy do miski.") is not a heading
    const sentence = /[.!?。！？]$/.test(line)
    if (!sentence && INGREDIENT_HEADER.test(header) && (wordCount(header) <= 4 || (wordCount(header) <= 7 && detectServings(header)))) {
      section = 'ingredients'
      group = null
      continue
    }
    if (!sentence && STEP_HEADER.test(header) && wordCount(header) <= 4) {
      section = 'steps'
      group = null
      continue
    }

    if (STEP_NUMBER_ONLY.test(line)) {
      if (section !== 'ingredients' || /\p{L}/u.test(line)) section = 'steps'
      continue
    }
    if (NUMBERED_STEP.test(line) && !(section === 'ingredients' && parseIngredientLine(line.replace(NUMBERED_STEP, '')))) {
      steps.push(line.replace(NUMBERED_STEP, ''))
      section ??= 'steps'
      continue
    }

    if (section === 'steps') {
      steps.push(line)
      continue
    }

    const several = splitCombined(line, section === 'ingredients')
    if (several) {
      for (const part of several) add(parseIngredientLine(part) ?? { raw: part, quantity: null, quantityMax: null, unit: null, name: cleanName(part) })
      section ??= 'ingredients'
      continue
    }

    const ing = parseIngredientLine(line)
    // Outside an ingredient list, only short lines with a quantity count, so
    // sentences like "Bake for 25 minutes at 180 °C" don't become ingredients
    // "4 порции", "4 Personen" is the portion count, not an ingredient
    if (ing && !ing.unit && wordCount(line) <= 3 && detectServings(line)) continue
    // "5分煮る" (simmer 5 minutes) has no spaces to count words by: outside a list it needs a unit
    if (ing && section !== 'ingredients' && !ing.unit && CJK.test(line) && /^\d/.test(line)) continue
    if (ing && (section === 'ingredients' || ing.unit || wordCount(line) <= 5)) {
      add(ing)
    } else if (section === 'ingredients' && !/[.!?。！？]$/.test(line) && wordCount(line) <= 20) {
      add({ raw: line, quantity: null, quantityMax: null, unit: null, name: cleanName(line) })
    }
  }
  return { ingredients, steps }
}
