import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { gunzipSync } from 'node:zlib'
import { draftFromImport } from '../recipeDraft.js'
import { parseRecipeText } from '../ingredients.js'
import { albertRecipe, ingredientGroups, jsonLdImage, parseRecipePage } from './web.js'

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

  it('finds the recipe picture', () => {
    expect(jsonLdImage('https://a.cz/1.jpg')).toBe('https://a.cz/1.jpg')
    expect(jsonLdImage([{ '@type': 'ImageObject', url: 'https://a.cz/2.jpg' }, 'https://a.cz/3.jpg'])).toBe('https://a.cz/2.jpg')
    expect(jsonLdImage(null)).toBe(null)
    expect(parseRecipePage(page).image).toBe(null)
    const withImage = page.replace('"name":"Svíčková na smetaně"', '"name":"Svíčková na smetaně","image":["/img/svickova.jpg"]')
    expect(parseRecipePage(withImage).image).toBe('/img/svickova.jpg')
    expect(parseRecipePage('<head><meta property="og:image" content="https://b.cz/x.jpg"></head><article>3 vejce</article>').image).toBe('https://b.cz/x.jpg')
  })

  it('keeps ingredient groups from the page', () => {
    const wprm = `<script type="application/ld+json">{"@type":"Recipe","name":"Plum cake","recipeIngredient":["150 ml milk lukewarm","70 g unsalted butter","800 g Italian plums","100 g all-purpose flour"]}</script>
<div class="wprm-recipe-ingredients-container"><h3 class="wprm-recipe-header">Ingredients</h3>
<div class="wprm-recipe-ingredient-group"><h4 class="wprm-recipe-group-name">Yeast dough:</h4><ul><li>150 ml milk, lukewarm</li><li>70 g butter</li></ul></div>
<div class="wprm-recipe-ingredient-group"><h4 class="wprm-recipe-group-name">For topping</h4><ul><li>800 g plums</li></ul></div>
<div class="wprm-recipe-ingredient-group"><h4 class="wprm-recipe-group-name">Posypka streusel</h4><ul><li>100 g flour</li></ul></div></div>`
    expect(ingredientGroups(wprm).map((g) => [g.name, g.items.length])).toEqual([
      ['Yeast dough', 2],
      ['For topping', 1],
      ['Posypka streusel', 1],
    ])
    const parsed = parseRecipeText(parseRecipePage(wprm).description)
    expect(parsed.ingredients.map((i) => [i.group, i.name])).toEqual([
      ['Yeast dough', expect.stringContaining('milk')],
      ['Yeast dough', expect.stringContaining('butter')],
      ['For topping', expect.stringContaining('plums')],
      ['Posypka streusel', expect.stringContaining('flour')],
    ])
  })

  it('ignores a single unnamed list', () => {
    expect(ingredientGroups('<div class="recipe-ingredients"><h3>Ingredients</h3><ul><li>3 eggs</li><li>1 cup flour</li></ul></div>')).toEqual([])
  })
})

describe('albert.cz', () => {
  // getRecipe answers recorded from albert.cz/api/v1 on 2026-10-28
  const api = (name) => JSON.parse(readFileSync(resolve(__dirname, `../fixtures/albert/${name}.json`), 'utf8'))
  const greekPage = gunzipSync(readFileSync(resolve(__dirname, '../fixtures/pages/albert.cz__recepty-recky-salat-r-a10989.html.gz'))).toString('utf8')

  it('reads the steps and the time from the API answer', () => {
    const r = albertRecipe(api('dusene-cervene-zeli'))
    expect(r.totalMin).toBe(30)
    expect(r.steps).toHaveLength(2)
    expect(r.steps[0]).toMatch(/^Cibuli oloupejte, nakrájejte nadrobno/)
    expect(r.steps[1]).toMatch(/svatomartinské huse\.$/)
    expect(albertRecipe({ data: null })).toBeNull()
  })

  it('fills the empty method and replaces the 2 hours JSON-LD gives every recipe', () => {
    const before = draftFromImport({ platform: 'web', url: 'x', ...parseRecipePage(greekPage), comments: [] })
    expect(before.steps).toBe('')
    expect(before.totalMin).toBe(120)
    const after = draftFromImport({ platform: 'web', url: 'x', ...parseRecipePage(greekPage, albertRecipe(api('recky-salat'))), comments: [] })
    expect(after.totalMin).toBe(30)
    expect(after.prepMin ?? null).toBeNull()
    expect(after.steps).toMatch(/^Rajčata omyjte a nakrájejte na větší kusy/)
    expect(after.ingredients.map((i) => i.name)).toEqual(before.ingredients.map((i) => i.name))
  })
})
