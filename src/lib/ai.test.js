import { describe, expect, it } from 'vitest'
import { aiPrompt, aiRecipeText } from './ai.js'
import { draftFromImport } from './recipeDraft.js'

const answer = {
  isRecipe: true,
  title: 'Francouzská cibulačka',
  servings: 4,
  ingredients: [
    { line: '400 g cibule' },
    { line: '1 lžíce másla' },
    { line: '50 ml bílého vína' },
    { group: 'Na podávání', line: '1 bageta' },
    { group: 'Na podávání', line: '50 g sýra' },
  ],
  steps: ['Cibuli oloupejte a nakrájejte na tenké plátky.', 'V hrnci rozpusťte máslo a cibuli restujte 15–20 minut.', 'Zalijte vodou (500–700 ml) a povařte.'],
}

describe('AI recipes', () => {
  it('turns the answer into text the parser reads', () => {
    const text = aiRecipeText(answer)
    const d = draftFromImport({ platform: 'facebook', description: 'Nejoblíbenější polévky', ai: text })
    expect(d.title).toBe('Francouzská cibulačka')
    expect(d.servings).toBe(4)
    expect(d.source).toBe('AI')
    expect(d.ingredients.map((i) => [i.qty, i.unit, i.name, i.group || null])).toEqual([
      ['400', 'g', 'Cibule', null],
      ['1', 'tbsp', 'Másla', null],
      ['50', 'ml', 'Bílého vína', null],
      ['1', '', 'Bageta', 'Na podávání'],
      ['50', 'g', 'Sýra', 'Na podávání'],
    ])
    expect(d.steps.split('\n').filter(Boolean)).toHaveLength(3)
    expect(d.raw.ai).toBe(text)
  })

  it('gives nothing when there is no recipe', () => {
    expect(aiRecipeText({ isRecipe: false, title: '', ingredients: [], steps: [] })).toBeNull()
  })

  it('puts the author comments and transcript in the prompt', () => {
    const p = aiPrompt({ description: 'Cap', comments: [{ author: 'chef', text: '2 eggs' }], transcript: 'Mix it', hasVideo: true })
    expect(p).toContain('Caption:\nCap')
    expect(p).toContain('chef: 2 eggs')
    expect(p).toContain('Mix it')
    expect(p).toContain('The video is attached.')
  })
})
