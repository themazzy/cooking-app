import { expect, it } from 'vitest'
import { parseRecipePage } from './reel/web.js'
import { draftFromImport } from './recipeDraft.js'
import { parseRecipeText } from './ingredients.js'
import { findTimers } from './cook.js'
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

// Second post from the same blog (2026-07-08): a two-word "Co na …?" heading
const devilled = `<html><body><article><h3>Jak na retro ďábelskou směs z mletého masa s topinkami</h3>
<div>8.7.2026 by Slepice No comment(s)</div><div><a>Chuťovky</a>, <a>Maso a ryby</a></div>
<p>Retro klasika. Salamandr je gril, který znají i profesionální kuchyně.</p>
<p><strong>Ďábelská směs na topinky</strong><br>4 porce<br>příprava: 45 minut</p>
<p><strong>Co na ďábelské topinky?</strong></p>
<ul><li>8 plátků chleba</li><li>400 g mletého masa (mix hovězí a vepřové)</li><li>2 šalotky</li><li>4 stroužky česneku</li><li>1 lžíce oleje</li><li>2 lžíce rajčatového protlaku</li><li>1 konzerva loupaných rajčat (400 g)</li><li>1 chilli papričku (dle chuti)</li><li>3 lžíce ajvaru</li><li>sůl a pepř</li><li>160 g strouhaného ementálu</li></ul>
<p><strong>Jak na to?</strong></p>
<ol><li>Šalotky a česnek oloupej a nakrájej nadrobno, na rozehřátém oleji je osmahni dozlatova. Přidej maso, osol, opepři a opékej, dokud nepustí šťávu a nezezlátne.</li>
<li>Vmíchej protlak a opékej, až se vše spojí. Přidej loupaná rajčata, promíchej a opékej. Vmíchej nasekanou chilli, pak ajvar a krátce opékej, aby se tekutina odpařila (chvilku to potrvá). Dochuť solí a pepřem a nech vychladnout.</li>
<li>Připrav topinky a nastrouhej sýr. Směs rozděl na topinky, posyp chilli a sýrem a lehce přitlač prsty. Krátce zapeč v troubě pod grilem, nebo použij domácí salamandr.</li></ol>
<div>Facebook Twitter Google+ LinkedIn Pinterest</div></article></body></html>`
it('reads the devilled mince toast recipe', () => {
  const d = draftFromImport({ platform: 'web', url: 'x', ...parseRecipePage(devilled), comments: [] })
  expect([d.servings, d.prepMin]).toEqual([4, 45])
  expect(d.ingredients.map((i) => [i.qty, i.unit, i.name])).toEqual([
    ['8', 'slice', 'Chleba'],
    ['400', 'g', 'Mletého masa (mix hovězí a vepřové)'],
    ['2', '', 'Šalotky'],
    ['4', 'clove', 'Česneku'],
    ['1', 'tbsp', 'Oleje'],
    ['2', 'tbsp', 'Rajčatového protlaku'],
    ['1', 'can', 'Loupaných rajčat'],
    ['1', '', 'Chilli papričku (dle chuti)'],
    ['3', 'tbsp', 'Ajvaru'],
    ['', '', 'Sůl a pepř'],
    ['160', 'g', 'Strouhaného ementálu'],
  ])
  expect(d.steps.split('\n')).toHaveLength(3)
})

// Third post (2026-04-08): "(asi 400 g)" after the potatoes, a 20 minute step
const gulas = `<html><body><article><h3>Naučíme vás buřtguláš, polévku, co připomíná prázdniny u babičky</h3>
<div>8.4.2026 by Slepice No comment(s)</div>
<p>Buřtguláš je klasika ze školní jídelny i od babičky.</p>
<p><strong>Buřtguláš s vejci</strong><br>4 porce<br>příprava: 60 minut</p>
<p><strong>Co na buřtguláš?</strong></p>
<ul><li>4 buřty</li><li>1 lžíce vepřového sádla (nebo oleje)</li><li>1 velká cibule</li><li>1 lžička drceného kmínu</li><li>1 lžička sušeného česneku (nebo 2 stroužky)</li><li>2 lžíce hladké mouky</li><li>1 lžíce sladké papriky</li><li>1 lžíce uzené papriky</li><li>1 l domácího vývaru (např. kuřecí)</li><li>8 středně velkých brambor typu B (asi 400 g)</li><li>1 lžíce sušené majoránky</li><li>sůl a pepř</li><li>4 vejce vařená natvrdo</li><li>čerstvá petrželka</li><li>pečivo na podávání</li></ul>
<p><strong>Jak na to?</strong></p>
<ol><li>Na sádle osmahni nadrobno nakrájenou cibuli dozlatova, přidej na kousky nakrájené buřty a kmín. Přidej česnek, mouku a obě papriky, promíchej, zalij vývarem a přidej brambory nakrájené na kostky.</li>
<li>Přiveď k varu, přidej majoránku, osol a opepři. Vař asi 20 minut, dokud brambory nezměknou a trochu se nerozvaří, jejich škrob polévku zahustí.</li>
<li>Mezitím uvař vejce natvrdo, oloupej je, nakrájej na kostičky a vmíchej do guláše.</li>
<li>Hotový guláš posyp čerstvou petrželkou a podávej s pečivem.</li></ol>
<div>Facebook Twitter Google+ LinkedIn Pinterest</div></article></body></html>`
it('reads the buřtguláš recipe', () => {
  const d = draftFromImport({ platform: 'web', url: 'x', ...parseRecipePage(gulas), comments: [] })
  expect([d.servings, d.prepMin]).toEqual([4, 60])
  const names = d.ingredients.map((i) => [i.qty, i.unit, i.name])
  expect(names).toHaveLength(15)
  expect(names[9]).toEqual(['8', '', 'Středně velkých brambor typu B'])
  expect(names[8]).toEqual(['1', 'l', 'Domácího vývaru (např. kuřecí)'])
  expect(names.slice(-3)).toEqual([['4', '', 'Vejce vařená natvrdo'], ['', '', 'Čerstvá petrželka'], ['', '', 'Pečivo na podávání']])
  expect(d.steps.split('\n')).toHaveLength(4)
  expect(findTimers(d.steps)).toEqual([{ label: '20 min', seconds: 1200 }])
})
