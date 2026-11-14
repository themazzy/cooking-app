import { afterEach, describe, expect, it, vi } from 'vitest'
import { aiConfig, aiRecipe } from './ai.js'

const ai = { key: 'AIzaTEST', model: 'gemini-flash-latest' }
const ok = (answer) =>
  new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(answer) }] }, finishReason: 'STOP' }] }), { status: 200 })
const bad = (status, message) => new Response(JSON.stringify({ error: { status: 'INVALID_ARGUMENT', message } }), { status })
const recipe = { isRecipe: true, title: 'Soup', ingredients: [{ line: '1 onion' }], steps: ['Cook.'] }

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('Gemini requests', () => {
  it('asks for minimal thinking and no low temperature', () => {
    const c = aiConfig()
    expect(c.thinkingConfig).toEqual({ thinkingLevel: 'minimal' })
    expect(c.temperature).toBeUndefined()
    expect(c.maxOutputTokens).toBeGreaterThan(0)
  })

  it('falls back to a thinking budget when the model refuses thinking levels', async () => {
    const bodies = []
    vi.stubGlobal('fetch', vi.fn(async (_url, init) => {
      const body = JSON.parse(init.body)
      bodies.push(body.generationConfig.thinkingConfig)
      return body.generationConfig.thinkingConfig?.thinkingLevel ? bad(400, 'Unknown name "thinkingLevel" at generation_config.thinking_config') : ok(recipe)
    }))
    const text = await aiRecipe(ai, { description: 'x' })
    expect(text).toMatch(/Soup/)
    expect(bodies).toEqual([{ thinkingLevel: 'minimal' }, { thinkingBudget: 0 }])
  })

  it('gives up with a clear message when Gemini does not answer', async () => {
    vi.stubGlobal('fetch', vi.fn((_url, init) => new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))))))
    await expect(aiRecipe(ai, { description: 'x' }, null, { timeoutMs: 50 })).rejects.toThrow('Gemini did not answer within 0 s.')
  })

  it('names a model that is gone', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => bad(404, 'models/gemini-old is not found')))
    await expect(aiRecipe({ ...ai, model: 'gemini-old' }, { description: 'x' })).rejects.toThrow(/gemini-old.*not available/)
  })

  it('says when the answer was cut off', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"isRecipe": true, "title": "So' }] }, finishReason: 'MAX_TOKENS' }] }), { status: 200 })))
    await expect(aiRecipe(ai, { description: 'x' })).rejects.toThrow('cut off')
  })
})
