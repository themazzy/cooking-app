import { describe, expect, it } from 'vitest'
import { parseIngredientLine, parseRecipeText } from './ingredients.js'

// Ingredient lists as recipe sites in the main languages write them (smaker.pl, giallozafferano,
// cookpad.com/mx, noovomoi.ca, neff-home.com/bg, rohlik.cz/chef, lecker.de), cut down
const rows = (text) => parseRecipeText(text).ingredients.map((i) => [i.group ?? '', i.quantity, i.quantityMax ?? null, i.unit, i.name])

describe('recipes in the main languages', () => {
  it('Polish: colon headings, unit with no amount, ranges, a lone step number', () => {
    const text = 'Składniki\nSpód ciasta:\n100 g masła\njajko\npłaska łyżeczka sody\nOwocowa wkładka:\n2-3 łyżki mąki do oprószenia owoców\nSposób przygotowania:\n1\nSkładniki przekładamy do miski.'
    expect(rows(text)).toEqual([
      ['Spód ciasta', 100, null, 'g', 'masła'],
      ['Spód ciasta', null, null, null, 'jajko'],
      ['Spód ciasta', 1, null, 'tsp', 'sody'],
      ['Owocowa wkładka', 2, 3, 'tbsp', 'mąki do oprószenia owoców'],
    ])
    expect(parseRecipeText(text).steps).toEqual(['Składniki przekładamy do miski.'])
  })

  it('Italian: "Per il …", word amounts, q.b.', () => {
    const { ingredients } = parseRecipeText('Ingredienti\nPer il ragù bianco:\n200 g carne macinata di vitello\nMezza cipolla\nMezzo bicchiere vino bianco\nInoltre:\nq.b. formaggio grattugiato\nPreparazione\nTritate la cipolla.')
    expect(ingredients.map((i) => [i.group, i.quantity, i.unit, i.name, i.note ?? null])).toEqual([
      ['Per il ragù bianco', 200, 'g', 'carne macinata di vitello', null],
      ['Per il ragù bianco', 0.5, null, 'cipolla', null],
      ['Per il ragù bianco', 0.5, 'cup', 'vino bianco', null],
      ['Inoltre', null, null, 'formaggio grattugiato', 'q.b.'],
    ])
  })

  it('Spanish: dashed headings, "a gusto", "Paso a paso"', () => {
    const { ingredients, steps } = parseRecipeText('Ingredientes\n----- Para la masa\n750 gr Harina\na gusto Sal\n----- Para la salsa\n1/4 cebolla común\nPaso a paso\n1. Ponemos harina en un bol.')
    expect(ingredients.map((i) => [i.group, i.quantity, i.unit, i.name])).toEqual([
      ['Para la masa', 750, 'g', 'Harina'],
      ['Para la masa', null, null, 'Sal'],
      ['Para la salsa', 0.25, null, 'cebolla común'],
    ])
    expect(steps).toEqual(['Ponemos harina en un bol.'])
  })

  it('French: "c. à soupe", "c. à thé", d\'', () => {
    expect(rows("Ingrédients\n1 c. à soupe d'origan séché\n1/2 c. à thé de poudre d'oignon")).toEqual([
      ['', 1, null, 'tbsp', 'origan séché'],
      ['', 0.5, null, 'tsp', "poudre d'oignon"],
    ])
  })

  it('Bulgarian: capital headings, portions line, "Щипка", "Стъпка 1"', () => {
    const { ingredients, steps } = parseRecipeText('4 порции\nСЪСТАВКИ\nЗА ТЕСТОТО\n150 г чисто брашно\nЩипка сол\n3 – 4 с. л. вода\nЗА ПЪЛНЕЖА\n2 яйца, разбити\nСтъпка 1\nСмесете брашното и солта.')
    expect(ingredients.map((i) => [i.group, i.quantity, i.quantityMax ?? null, i.unit, i.name])).toEqual([
      ['За тестото', 150, null, 'g', 'чисто брашно'],
      ['За тестото', 1, null, 'pinch', 'сол'],
      ['За тестото', 3, 4, 'tbsp', 'вода'],
      ['За пълнежа', 2, null, null, 'яйца, разбити'],
    ])
    expect(steps).toEqual(['Смесете брашното и солта.'])
  })

  it('Russian and German units', () => {
    expect(rows('Ингредиенты\nЧайная ложка муки\n2 столовые ложки жира\n½ стакана бульона\nЗелень по вкусу')).toEqual([
      ['', 1, null, 'tsp', 'муки'],
      ['', 2, null, 'tbsp', 'жира'],
      ['', 0.5, null, 'cup', 'бульона'],
      ['', null, null, null, 'Зелень'],
    ])
    expect(rows('Zutaten\n4 Personen\n1 Prise Salz\neine Prise Zucker\n2 Zehen Knoblauch')).toEqual([
      ['', 1, null, 'pinch', 'Salz'],
      ['', 1, null, 'pinch', 'Zucker'],
      ['', 2, null, 'clove', 'Knoblauch'],
    ])
  })

  it('Czech: "SUROVINY NA …" headings', () => {
    expect(rows('SUROVINY NA NÁPLŇ\n4 stroužky česneku\nSUROVINY NA OMÁČKU\nŠpetka soli')).toEqual([
      ['Na náplň', 4, null, 'clove', 'česneku'],
      ['Na omáčku', 1, null, 'pinch', 'soli'],
    ])
  })
})

// Tablespoons and teaspoons as each language writes them; the two must never be mixed up
const SPOONS = {
 tbsp: ['1 tbsp sugar','1 Tbsp sugar','1 T sugar','1 tablespoon sugar','1 lžíce cukru','2 lžíce cukru','1 polévková lžíce cukru','1 PL cukru','1 lž. cukru','1 lžíci cukru','1 с.л. захар','1 с. л. захар','1 супена лъжица захар','2 супени лъжици захар','1 лъжица захар','1 EL Zucker','1 Esslöffel Zucker','1 EL. Zucker','1 cucharada de azúcar','2 cucharadas de azúcar','1 cda azúcar','1 cucchiaio di zucchero','2 cucchiai di zucchero','1 c. à soupe de sucre','1 cuillère à soupe de sucre','1 càs sucre','1 CS sucre','1 łyżka cukru','2 łyżki cukru','1 ст. л. сахара','1 ст.л. сахара','1 столовая ложка сахара','2 столовые ложки сахара','1 lyžica cukru','2 lyžice cukru', '1 c.s. sucre', '1 cs sucre'],
 tsp: ['1 tsp salt','1 t salt','1 teaspoon salt','1 lžička soli','2 lžičky soli','1 kávová lžička soli','1 KL soli','1 čajová lžička soli','1 ч.л. сол','1 ч. л. сол','1 к.л. сол','1 чаена лъжичка сол','1 лъжичка сол','1 TL Salz','1 Teelöffel Salz','1 cucharadita de sal','1 cdta sal','1 cdita sal','1 cucchiaino di sale','2 cucchiaini di sale','1 c. à café de sel','1 c. à thé de sel','1 cuillère à café de sel','1 càc sel','1 łyżeczka soli','2 łyżeczki soli','1 ч. л. соли','1 ч.л. соли','1 чайная ложка соли','1 lyžička soli','2 lyžičky soli', '1 c.c. sel'],
}

describe('tablespoon or teaspoon', () => {
  for (const [unit, lines] of Object.entries(SPOONS)) {
    it.each(lines)(`%s is ${unit}`, (line) => expect(parseIngredientLine(line).unit).toBe(unit))
  }
})
