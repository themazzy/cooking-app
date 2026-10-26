import { describe, expect, it } from 'vitest'
import { detectServings, servingsFrom } from './recipeMeta.js'
import { draftFromImport } from './recipeDraft.js'
import { microdataServings, parseRecipePage } from './reel/web.js'

describe('portions', () => {
  it('reads them from text in English, Czech and Bulgarian', () => {
    expect(detectServings('Serves 4')).toBe(4)
    expect(detectServings('4-6 servings')).toBe(4)
    expect(detectServings('Yield: 8 servings')).toBe(8)
    expect(detectServings('Počet porcí: 5')).toBe(5)
    expect(detectServings('Recept pro 6 osob')).toBe(6)
    expect(detectServings('Порции: 4')).toBe(4)
    expect(detectServings('Брой порции: 6')).toBe(6)
    expect(detectServings('Продукти за 4 порции')).toBe(4)
    expect(detectServings('за 4 човека')).toBe(4)
    expect(detectServings('за 4-ма души')).toBe(4)
    expect(detectServings('за четири порции')).toBe(4)
  })

  it('does not take cooking times for portions', () => {
    expect(detectServings('Печете за 10 минути')).toBeNull()
    expect(detectServings('Vařte za 10 minut')).toBeNull()
    expect(detectServings('Smažte na 2 minuty')).toBeNull()
  })

  it('reads schema.org recipeYield in its many forms', () => {
    expect(servingsFrom(4)).toBe(4)
    expect(servingsFrom('4')).toBe(4)
    expect(servingsFrom(['4', '4 servings'])).toBe(4)
    expect(servingsFrom(['1 cake', '8 servings'])).toBe(8)
    expect(servingsFrom('4-6')).toBe(4)
    expect(servingsFrom('12 cookies')).toBe(12)
    expect(servingsFrom('Porce: 4')).toBe(4)
    expect(servingsFrom('за 4 порции')).toBe(4)
    expect(servingsFrom('6 порции')).toBe(6)
    expect(servingsFrom(null)).toBeNull()
    expect(servingsFrom('')).toBeNull()
  })

  it('reads microdata and recipe plugin boxes', () => {
    expect(microdataServings('<span itemprop="recipeYield">4 porce</span>')).toBe(4)
    expect(microdataServings('<meta itemprop="recipeYield" content="6">')).toBe(6)
    expect(microdataServings('<span class="wprm-recipe-servings wprm-block">3</span>')).toBe(3)
    expect(microdataServings('<p>nothing</p>')).toBeNull()
  })

  it('sets the portions of a website draft', () => {
    const html = `<script type="application/ld+json">{"@type":"Recipe","name":"Мусака","recipeYield":"6","recipeIngredient":["500 г кайма"]}</script>`
    const page = parseRecipePage(html)
    expect(page.meta.servings).toBe(6)
    expect(draftFromImport({ platform: 'web', ...page }).servings).toBe(6)
  })

  it('finds the portions on a page without structured data', () => {
    const page = parseRecipePage('<body><article><h1>Боб чорба</h1><p>Порции: 5</p><p>Продукти:</p><ul><li>500 г боб</li></ul></article></body>')
    expect(page.meta.servings).toBe(5)
  })
})
