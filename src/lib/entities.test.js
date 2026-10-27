import { describe, expect, it } from 'vitest'
import { decodeEntities, htmlToText } from './reel/html.js'
import { parseRecipeText, tidyIngredient } from './ingredients.js'
import { splitSteps } from './cook.js'
import { toEditable } from './recipeEdit.js'
import { draftFromImport } from './recipeDraft.js'

describe('decodeEntities', () => {
  it('decodes named, numeric and accented entities', () => {
    expect(decodeEntities('Saut&eacute; until golden.')).toBe('Sauté until golden.')
    expect(decodeEntities('cr&egrave;me br&ucirc;l&eacute;e, jalape&ntilde;o, K&uuml;hlschrank')).toBe('crème brûlée, jalapeño, Kühlschrank')
    expect(decodeEntities('&Scaron;koda &ccedil;a &Aring;')).toBe('Škoda ça Å')
    expect(decodeEntities('Saut&#233; &#xE9; &#x2013; 180&deg;C &frac12; cup')).toBe('Sauté é – 180°C ½ cup')
    expect(decodeEntities('salt &amp; pepper &ndash; &hellip;')).toBe('salt & pepper – …')
  })

  it('decodes double- and triple-escaped entities', () => {
    expect(decodeEntities('Saut&amp;eacute; until golden.')).toBe('Sauté until golden.')
    expect(decodeEntities('Saut&amp;amp;eacute;')).toBe('Sauté')
    expect(decodeEntities('&amp;#233;')).toBe('é')
  })

  it('leaves plain ampersands and unknown names alone', () => {
    expect(decodeEntities('Salt & pepper, R&D')).toBe('Salt & pepper, R&D')
    expect(decodeEntities('&notathing; &#0;')).toBe('&notathing; &#0;')
    expect(decodeEntities(null)).toBe('')
  })

  it('is used for HTML text from websites', () => {
    expect(htmlToText('<p>Saut&amp;eacute; until golden.</p>')).toBe('Sauté until golden.')
  })
})

describe('imported and saved text', () => {
  it('parsed recipes read decoded text', () => {
    const parsed = parseRecipeText('Ingredients\n2 tbsp cr&egrave;me fra&icirc;che\nMethod\nSaut&amp;eacute; until golden.')
    expect(parsed.ingredients[0].name).toMatch(/crème fraîche/)
    expect(parsed.steps.join(' ')).toContain('Sauté until golden.')
  })

  it('drafts from a website import have no entities', () => {
    const draft = draftFromImport({ description: 'Cr&egrave;me potatoes\nIngredients\n500 g potatoes\n2 tbsp olive oil\nSteps\n1. Saut&amp;eacute; until golden.\n2. Bake.' })
    expect(draft.title).toBe('Crème potatoes')
    expect(draft.steps).toContain('Sauté until golden.')
    expect(draft.steps).not.toContain('&')
  })

  it('saved recipes show decoded steps and ingredient names', () => {
    expect(splitSteps('1. Peel.\n2. Saut&eacute; until golden.').map((s) => s.text ?? s)).toEqual(
      expect.arrayContaining([expect.stringContaining('Sauté until golden.')]),
    )
    expect(tidyIngredient({ qty: '1', unit: 'cup', name: 'cr&egrave;me fra&icirc;che' }).name).toBe('crème fraîche')
    expect(toEditable({ ingredients: [], steps: ['Saut&eacute;'] }).steps).toBe('Sauté')
  })
})
