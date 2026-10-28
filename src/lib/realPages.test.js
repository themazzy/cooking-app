import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { gunzipSync } from 'node:zlib'
import { parseRecipePage } from './reel/web.js'
import { draftFromImport } from './recipeDraft.js'

// Real recipe pages (Czech, Slovak, Bulgarian, English) saved by .github/workflows/recipe-corpus.yml
// on 2026-10-28 and slimmed by scripts/recipe-corpus/fixtures.mjs. Each page's reading is kept in
// fixtures/pages/expected/: a change there is a change in what the app imports, so check it by hand.
const dir = resolve(__dirname, 'fixtures/pages')
const pages = JSON.parse(readFileSync(resolve(dir, 'index.json'), 'utf8'))
const read = (file) => {
  const result = parseRecipePage(gunzipSync(readFileSync(resolve(dir, file))).toString('utf8'))
  return { result, draft: draftFromImport({ platform: 'web', url: 'x', ...result, comments: [] }) }
}
const cache = new Map()
const page = (part) => {
  const file = pages.find((p) => p.file.includes(part))?.file
  if (!file) throw new Error(`no page ${part}`)
  if (!cache.has(file)) cache.set(file, read(file))
  return cache.get(file)
}
const rows = (d) => d.ingredients.map((i) => [i.qty, i.unit, i.name, i.group ?? ''])

function summary({ result, draft: d }) {
  const lines = [
    `${result.structured ? 'JSON-LD' : 'PAGE'} | ${d.title} | servings ${d.servings} | prep ${d.prepMin} cook ${d.cookMin} total ${d.totalMin}`,
    ...d.ingredients.map((i) => `  ${[i.qty, i.unit, i.name].join(' | ')}${i.group ? `  [${i.group}]` : ''}`),
    'steps:',
    ...(d.steps ? d.steps.split('\n') : []).map((s) => `  ${s}`),
  ]
  return `${lines.join('\n')}\n`
}

describe('real recipe pages', () => {
  it.each(pages.map((p) => [p.file]))('%s', async (file) => {
    await expect(summary(page(file))).toMatchFileSnapshot(`./fixtures/pages/expected/${file.replace(/\.html\.gz$/, '.txt')}`)
  })
})

describe('pages without recipe data', () => {
  const textPages = () => pages.map((p) => page(p.file)).filter((p) => !p.result.structured)

  it('takes the title from the page, not a date or the site', () => {
    for (const { draft } of textPages()) {
      expect(draft.title).not.toMatch(/^\d{1,2}\.\s?\d{1,2}\.\s?\d{4}$|^O Kitchenette$|^Foto |^Hlavní obsah$/)
    }
    expect(page('slepicarna-blog.cz__2026-10-15').draft.title).toBe('Rychlá večeře v podobě knedlíků s vajíčkem a slaninou')
  })

  it('stops where the recipe ends', () => {
    for (const { draft } of textPages()) {
      expect(draft.steps).not.toMatch(/About the|komentář|Sdílet|Vybrané pro vás|Inzerce|Nahlásit chybu|Рецептата е добавена/i)
    }
  })

  it('reads blog ingredients written one per paragraph, with their parts', () => {
    const d = page('koprova-omacka-s-masem').draft
    expect([...new Set(d.ingredients.map((i) => i.group))]).toEqual(['Hovězí vývar', 'Knedlíky', 'Koprovou omáčku'])
    expect(d.ingredients).toHaveLength(30)
    expect(d.steps.split('\n')).toHaveLength(5)
  })

  it('reads lists inside list items and steps written as numbered paragraphs (Deník)', () => {
    const d = page('denik.cz__gastronomie-gulas-s-bramboracky').draft
    expect([...new Set(d.ingredients.map((i) => i.group))]).toEqual(['Na guláš', 'Na bramboráčky'])
    expect(d.steps.split('\n')).toHaveLength(19)
    expect(d.steps).not.toMatch(/Sůl Mouka Koření/)
  })

  it('reads ingredient boxes and leaves out the introduction (Supichka)', () => {
    const d = page('рецепта-320').draft
    expect(rows(d)[0]).toEqual(['500', 'g', 'Кайма', ''])
    expect(d.steps.split('\n')[0]).toMatch(/^Загрявате мазнината/)
  })

  it('walks a print page laid out in a table (Varecha)', () => {
    const d = page('tvarohove-kolace-videorecept-90471-vytlacit').draft
    expect([...new Set(d.ingredients.map((i) => i.group ?? ''))]).toEqual(['', 'Plnka', 'Navrch'])
    expect(rows(d)[2]).toEqual(['3,5–4', 'dl', 'Mlieko', ''])
  })
})

describe('pages with recipe data', () => {
  it('reads JSON-LD with line breaks inside its strings (Weber)', () => {
    const { result, draft } = page('weber.com__CZ-cs-recepty')
    expect(result.structured).toBe(true)
    expect(rows(draft)[1]).toEqual(['700', 'g', 'Rajských rajčat, oloupaných a nasekaných', ''])
    expect(draft.ingredients.map((i) => i.name).join(' ')).not.toMatch(/Completed step/)
  })

  it('reads the shops’ units: "1 × lžíce" (Lidl), "1 člž" after the name (Albert), "0,5 dcl" (Varecha)', () => {
    expect(rows(page('kuchynelidlu.cz__recept-cesnecka').draft)[2]).toEqual(['1', 'tbsp', 'Celý kmín Kania', ''])
    expect(rows(page('albert.cz__recepty-recky-salat').draft)[3]).toEqual(['1', 'tsp', 'Oregano sušené', ''])
    expect(rows(page('varecha.pravda.sk__recepty-gulas-fotorecept-42275-recept').draft)[2]).toEqual(['0,5', 'dl', 'Olej', ''])
  })

  it('leaves out the shop’s "found a mistake?" note instead of a method (Albert)', () => {
    expect(page('albert.cz__recepty-recky-salat').draft.steps).toBe('')
  })
})
