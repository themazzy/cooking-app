import { expect, it } from 'vitest'
import { parseRecipePage } from './reel/web.js'
import { draftFromImport } from './recipeDraft.js'
import { parseRecipeText } from './ingredients.js'
// Blog post without recipe data (slepicarna-blog.cz, 2026-10-15), its layout as
// read on the page; step wording shortened
const html = `<html><head><meta property="og:site_name" content="Slepičárna blog"></head><body><header><nav>Menu</nav></header>
<article><h3 class="entry-title">Rychlá večeře v podobě knedlíků s vajíčkem a slaninou</h3>
<div class="meta">15.10.2026 by Slepice No comment(s)</div>
<div class="cats"><a>Chuťovky</a>, <a>Maso a ryby</a>, <a>Ostatní</a>, <a>Přílohy a saláty</a>, <a>Recepty z naší kuchyně</a>, <a>říjen</a>, <a>Škola české kuchyně</a></div>
<div class="tags"><a>česká kuchyně</a>, <a>jak na to</a>, <a>knedlíky</a>, <a>knedlíky s vejcem</a>, <a>kyselá okurka</a>, <a>recept</a>, <a>rychlovka</a>, <a>slanina</a>, <a>Slepičárna</a>, <a>večeře</a>, <a>vejce</a>, <a>ze zbytků</a></div>
<img alt="Rychlá večeře v podobě knedlíků s vajíčkem a slaninou">
<p>Zbyly vám knedlíky? Tohle je rychlá večeře. Doporučuji hutnější knedlíky z polohrubé mouky a prášku do pečiva, které se nejdřív opečou dozlatova a pak se zalijí vajíčky.</p>
<p><strong>Knedlíky s vajíčkem</strong><br>4 porce<br>příprava: 20 minut</p>
<p><strong>Co na knedlíky?</strong></p>
<ul><li>12 plátků knedlíků (houskových – najdete je např. tady)</li><li>10 vajec</li><li>sůl a pepř</li><li>100 ml smetany ke šlehání (33 %)</li><li>200 g anglické slaniny</li><li>5 jarních cibulek</li><li>2 lžíce olivového oleje</li><li>kyselé okurky na podávání</li></ul>
<p><strong>Jak na to?</strong></p>
<ol><li>Knedlíky nakrájej na kostičky, slaninu taky. Jarní cibulku nakrájej na kolečka a odděl bílou část od zelené. Vejce rozšlehej se smetanou, solí a pepřem.</li>
<li>Na velké pánvi rozehřej olej a knedlíky na něm opeč ze všech stran dozlatova a do křupava. Přidej slaninu, nech ji pustit tuk a přihoď bílou část cibulky.</li>
<li>Stáhni teplotu, aby pánev trochu vychladla a vejce se hned nesrazila. Vlij vaječnou směs, zvyš plamen a za stálého míchání ji dodělej podle chuti. Posyp zelenou cibulkou a podávej s kyselými okurkami.</li></ol>
<div class="share">Facebook Twitter Google+ LinkedIn Pinterest</div></article>
<aside>Sidebar</aside><footer>foot</footer></body></html>`
it('reads a Czech blog recipe with question headings', () => {
  const d = draftFromImport({ platform: 'web', url: 'x', ...parseRecipePage(html), comments: [] })
  expect(d.title).toBe('Rychlá večeře v podobě knedlíků s vajíčkem a slaninou')
  expect(d.servings).toBe(4)
  expect(d.prepMin).toBe(20)
  expect(d.ingredients.map((i) => [i.qty, i.unit, i.name])).toEqual([
    ['12', 'slice', 'Knedlíků (houskových – najdete je např. tady)'],
    ['10', '', 'Vajec'],
    ['', '', 'Sůl a pepř'],
    ['100', 'ml', 'Smetany ke šlehání (33 %)'],
    ['200', 'g', 'Anglické slaniny'],
    ['5', '', 'Jarních cibulek'],
    ['2', 'tbsp', 'Olivového oleje'],
    ['', '', 'Kyselé okurky na podávání'],
  ])
  const steps = d.steps.split('\n')
  expect(steps).toHaveLength(3)
  expect(steps[0]).toMatch(/^Knedlíky nakrájej/)
  expect(steps[2]).toMatch(/kyselými okurkami\.$/)
})

it('keeps caption questions from starting a section', () => {
  const caption = 'Co na to říkáte?\nJak na to? 👇\n200 g mouky\n2 vejce\nVšechno smíchej a peč 20 minut.'
  const r = parseRecipeText(caption)
  expect(r.ingredients.map((i) => i.name)).toEqual(['mouky', 'vejce'])
  expect(parseRecipeText('Co na to říkáte?\nKrásný den\nMám rád podzim').ingredients).toEqual([])
})

it('ignores post dates and share buttons, keeps amounts with dots', () => {
  const r = parseRecipePage('<article><p>15.10.2026</p><p>2026-10-15 by Slepice</p><h2>Suroviny</h2><ul><li>1.5 kg brambor</li><li>2 vejce</li></ul><p>Facebook Twitter Pinterest</p></article>')
  expect(parseRecipeText(r.description).ingredients.map((i) => [i.quantity, i.name])).toEqual([[1.5, 'brambor'], [2, 'vejce']])
})
