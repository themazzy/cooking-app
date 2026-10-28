import { describe, expect, it } from 'vitest'
import { endOfRecipe } from './pageRecipe.js'

describe('endOfRecipe', () => {
  it('ends at comments, share lines and "top N" lists', () => {
    for (const line of ['Komentáře (3)', 'Komentářů: 12', '5 komentářů', 'Коментарите', 'Топ 10 рецепти за лятото', 'Сподели', 'Share this recipe', 'Print recipe', 'Jak se vám líbila polévka?', 'Komentárov: 4']) {
      expect(endOfRecipe(line), line).toBe(true)
    }
  })

  it('keeps steps that only start like a stop word', () => {
    for (const line of ['Tiskněte těsto prsty do formy.', 'Shape the dough into balls.', 'Sharpen the knife first.', 'Printed recipes fade.', 'Relatedly, salt the water.']) {
      expect(endOfRecipe(line), line).toBe(false)
    }
  })
})
