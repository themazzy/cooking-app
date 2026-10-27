import { describe, expect, it } from 'vitest'
import { parseRecipePage } from './reel/web.js'
import { draftFromImport } from './recipeDraft.js'
import { findTimers } from './cook.js'
import { pages } from './fixtures/recipePages.js'

const draft = (key) => draftFromImport({ platform: 'web', url: 'x', ...parseRecipePage(`<html><body>${pages[key]}</body></html>`), comments: [] })
const rows = (d) => d.ingredients.map((i) => [i.qty, i.unit, i.name])
const timers = (d) => findTimers(d.steps).map((t) => t.label)

describe('recipe pages without recipe data', () => {
  it('stops at the second recipe on a page', () => {
    for (const key of ['denik', 'novinky']) {
      const d = draft(key)
      expect(d.steps).not.toMatch(/Houbový|perkelt/)
      expect(rows(d).map((r) => r[2])).not.toContain('Hub')
      expect(rows(d).map((r) => r[2])).not.toContain('Vepřové plece')
    }
  })

  it('reads a list written as one paragraph, and the prose after it as steps', () => {
    const d = draft('skrblik')
    expect(rows(d)).toContainEqual(['900–1000', 'ml', 'Vývaru nebo vody'])
    expect(rows(d)).toContainEqual(['', '', 'Koření (8x celý pepř, 6x nové koření a 3x bobkový list)'])
    expect(rows(d)).toHaveLength(18)
    expect(d.steps.split('\n')).toHaveLength(6)
    expect(timers(d)).toEqual(['1 h', '1,5–2 h'])
    const g = draft('skrblikgulas')
    expect(rows(g)).toContainEqual(['5–7', 'clove', 'Česneku'])
    expect(rows(g)).toHaveLength(11)
  })

  it('skips page labels and tips, reads name-first lines', () => {
    const d = draft('iprima')
    expect(rows(d)[0]).toEqual(['2', 'pcs', 'Cibule'])
    expect(rows(d)).toContainEqual(['4', 'pcs', 'Jalovec'])
    expect(rows(d).map((r) => r[2])).not.toContain('Minut')
    expect(d.steps).not.toMatch(/PRIMA TIP/)
    expect(timers(d)).toEqual(['1 min'])
    expect(rows(draft('rohlik')).map((r) => r[2])).not.toContain('Min')
    expect(rows(draft('banitsa')).map((r) => r[2])).not.toContain('Calories, kcal')
  })

  it('reads amounts after "cca", "přibližně", "around" and "1 ounce or 30 grams"', () => {
    expect(rows(draft('austriacs'))[1]).toEqual(['500', 'g', 'Cibule'])
    expect(rows(draft('denikmak'))[1]).toEqual(['220', 'g', 'Špaldové hladké mouky'])
    const b = rows(draft('banitsa'))
    expect(b[1]).toEqual(['9', 'oz', 'Yogurt'])
    expect(b[5]).toEqual(['1', 'oz', 'Butter'])
  })

  it('reads a Slovak page: Prísady, Príprava, PL/ČL, Krok 1, porcií', () => {
    const d = draft('austriask')
    expect([d.servings, d.prepMin]).toEqual([4, 300])
    expect(rows(d)).toHaveLength(16)
    expect(rows(d)[1]).toEqual(['500', 'g', 'Cibuľa'])
    expect(rows(d)[4]).toEqual(['1', 'tsp', 'Paradajkového pretlaku'])
    expect(d.steps.split('\n')[0]).toBe('Mäso nakrájajte na kocky.')
    expect(timers(d)).toEqual(['2–3 h', '10–15 min'])
  })

  it('reads "Na 5 porcí potřebujete:" as the start of the list', () => {
    const d = draft('forbeskure')
    expect(d.servings).toBe(5)
    expect(rows(d)[0]).toEqual(['1', '', 'Velké kuře nebo 5 stehen'])
    expect(rows(d)).toHaveLength(13)
  })

  it('leaves out equipment and the tools list after the method', () => {
    const d = draft('weber')
    expect(rows(d).map((r) => r[2])).toEqual(['Jemně nasekaná cibule', 'Rajských rajčat, oloupaných a nasekaných', 'Jemně nakrájeného čínského česneku', 'Bobkový list', 'Tyčinka skořice', 'Tygřích krevet, neloupaných', 'Feta sýra', 'Sůl a pepř', 'Řepkový olej', 'Nápoje Ouzo'])
    expect(d.steps.split('\n')).toHaveLength(4)
  })

  it('takes page headings over a list as sub-lists, keeps notes out of the steps', () => {
    const d = draft('donkey')
    expect(d.ingredients.filter((i) => i.group === 'Filling')).toHaveLength(8)
    expect(d.ingredients.filter((i) => i.group === 'Topping')).toHaveLength(4)
    expect(rows(d)[2][2]).toBe('Passata (or you can use around 150 g fresh diced tomatoes)')
    expect(draft('cooklike').steps).not.toMatch(/Notes|beef broth/)
  })

  it('reads the product name and amount layout of rohlik.cz', () => {
    expect(rows(draft('rohlikrajska')).slice(0, 2)).toEqual([['1', 'kg', 'Hovězí loupané plece'], ['2', '', 'Větší oloupané mrkve']])
    expect(draft('rohlikrajska').ingredients[0].group).toBe('Hovězí vývar a základ omáčky')
  })

  it('reads the clock-style time "Čas na přípravu: 00:40"', () => {
    const d = draft('suedtirol')
    expect(d.prepMin).toBe(40)
    expect(rows(d).map((r) => r[2])).not.toContain('Čas na přípravu, :40')
  })
})
