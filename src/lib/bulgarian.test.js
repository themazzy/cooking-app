import { describe, expect, it } from 'vitest'
import { parseIngredientLine, parseRecipeText } from './ingredients.js'
import { draftFromImport } from './recipeDraft.js'

const ing = (line) => {
  const i = parseIngredientLine(line)
  return i && [i.quantity, i.quantityMax, i.unit, i.name]
}

describe('Bulgarian recipes', () => {
  it('reads amounts and units', () => {
    expect(ing('500 г брашно')).toEqual([500, null, 'g', 'брашно'])
    expect(ing('200 гр. сирене')).toEqual([200, null, 'g', 'сирене'])
    expect(ing('1 кг картофи')).toEqual([1, null, 'kg', 'картофи'])
    expect(ing('400 мл прясно мляко')).toEqual([400, null, 'ml', 'прясно мляко'])
    expect(ing('1,5 л вода')).toEqual([1.5, null, 'l', 'вода'])
    expect(ing('2 с.л. олио')).toEqual([2, null, 'tbsp', 'олио'])
    expect(ing('2 с. л. захар')).toEqual([2, null, 'tbsp', 'захар'])
    expect(ing('1 ч.л. сол')).toEqual([1, null, 'tsp', 'сол'])
    expect(ing('1 к.л. сода бикарбонат')).toEqual([1, null, 'tsp', 'сода бикарбонат'])
    expect(ing('1 ч.ч. кисело мляко')).toEqual([1, null, 'cup', 'кисело мляко'])
    expect(ing('2 супени лъжици брашно')).toEqual([2, null, 'tbsp', 'брашно'])
    expect(ing('3 бр. яйца')).toEqual([3, null, 'pcs', 'яйца'])
    expect(ing('3 скилидки чесън')).toEqual([3, null, 'clove', 'чесън'])
    expect(ing('1 щипка черен пипер')).toEqual([1, null, 'pinch', 'черен пипер'])
    expect(ing('1 връзка магданоз')).toEqual([1, null, 'bunch', 'магданоз'])
    expect(ing('1 консерва домати')).toEqual([1, null, 'can', 'домати'])
    expect(ing('1 пакетче бакпулвер')).toEqual([1, null, 'pack', 'бакпулвер'])
    expect(ing('2 глави лук')).toEqual([2, null, 'head', 'лук'])
    expect(ing('2 до 3 моркова')).toEqual([2, 3, null, 'моркова'])
    expect(ing('половин чаша захар')).toEqual([0.5, null, 'cup', 'захар'])
    expect(ing('две яйца')).toEqual([2, null, null, 'яйца'])
  })

  it('reads name-first lines and "to taste"', () => {
    expect(ing('Брашно - 500 г')).toEqual([500, null, 'g', 'Брашно'])
    expect(ing('Яйца: 3 бр.')).toEqual([3, null, 'pcs', 'Яйца'])
    expect(parseIngredientLine('Сол - на вкус')).toMatchObject({ name: 'Сол', note: 'на вкус', quantity: null })
  })

  it('splits a caption into ingredients, groups and steps', () => {
    const text = [
      'Баница със сирене',
      'Приготвяне: 20 мин',
      'Необходими продукти за 6 порции:',
      '• 1 пакет кори за баница',
      '• 4 яйца',
      '• 400 г сирене',
      '• 1 ч.ч. кисело мляко',
      'За заливката:',
      '• 100 мл олио',
      '• сол, черен пипер, чубрица',
      'Начин на приготвяне:',
      '1. Разбийте яйцата с киселото мляко.',
      '2. Печете за 40 минути на 180 градуса.',
    ].join('\n')
    const r = parseRecipeText(text)
    expect(r.ingredients.map((i) => i.name)).toEqual(['кори за баница', 'яйца', 'сирене', 'кисело мляко', 'олио', 'сол', 'черен пипер', 'чубрица'])
    expect(r.ingredients[0].unit).toBe('pack')
    expect(r.ingredients[4].group).toBe('За заливката')
    expect(r.steps).toEqual(['Разбийте яйцата с киселото мляко.', 'Печете за 40 минути на 180 градуса.'])

    const d = draftFromImport({ platform: 'instagram', description: text })
    expect(d.servings).toBe(6)
    expect(d.prepMin).toBe(20)
  })

  it('reads a Bulgarian website with its instructions header', () => {
    const r = parseRecipeText('Съставки:\n- 500 г кайма\n- 1 глава лук\nСтъпки:\nЗапържете лука.\nДобавете каймата.')
    expect(r.ingredients).toHaveLength(2)
    expect(r.steps).toEqual(['Запържете лука.', 'Добавете каймата.'])
  })
})
