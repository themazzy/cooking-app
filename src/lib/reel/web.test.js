import { describe, expect, it } from 'vitest'
import { parseRecipeText } from '../ingredients.js'
import { parseRecipePage } from './web.js'

describe('recipe websites', () => {
  const page = `<html><head><meta property="og:site_name" content="Recepty.cz">
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"WebPage"},
{"@type":["Recipe"],"name":"Svíčková na smetaně","recipeYield":"4 porce",
"recipeIngredient":["500 g hovězí svíčkové","2 mrkve","200 ml smetany ke šlehání"],
"recipeInstructions":[{"@type":"HowToSection","name":"Omáčka","itemListElement":[{"@type":"HowToStep","text":"Zeleninu nakrájíme na kostičky."},{"@type":"HowToStep","text":"Podlijeme a dusíme 2 hodiny."}]}]}]}
</script></head><body></body></html>`

  it('reads the schema.org recipe', () => {
    const r = parseRecipePage(page)
    expect(r.structured).toBe(true)
    expect(r.author).toBe('Recepty.cz')
    const parsed = parseRecipeText(r.description)
    expect(parsed.ingredients.map((i) => [i.quantity, i.unit, i.name])).toEqual([
      [500, 'g', 'hovězí svíčkové'],
      [2, null, 'mrkve'],
      [200, 'ml', 'smetany ke šlehání'],
    ])
    expect(parsed.steps).toContain('Zeleninu nakrájíme na kostičky.')
  })

  it('falls back to the article text', () => {
    const r = parseRecipePage('<body><nav>Menu</nav><article><h2>Suroviny</h2><ul><li>3 vejce</li><li>100 g mouky</li></ul></article></body>')
    expect(r.structured).toBe(false)
    expect(parseRecipeText(r.description).ingredients).toHaveLength(2)
  })
})
