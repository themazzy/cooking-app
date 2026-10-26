import { describe, expect, it } from 'vitest'
import { parseRecipeText } from './ingredients.js'

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
