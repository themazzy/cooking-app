// One-off: saves albert.cz recipe page raw + JS chunks that mention recipes, to find where steps load from.
import { mkdirSync, writeFileSync } from 'node:fs'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
const H = { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml,*/*', 'Accept-Language': 'cs,en;q=0.7' }
const base = 'https://www.albert.cz'
const page = base + '/recepty/dusene-cervene-zeli-jako-od-maminky/r/R00000806'
mkdirSync('probe/js', { recursive: true })
const r = await fetch(page, { headers: H })
const html = await r.text()
writeFileSync('probe/page.html', html)
console.log(r.status, html.length)
const srcs = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => new URL(m[1], base).href)
const log = []
const seen = new Set()
const queue = [...srcs]
while (queue.length && seen.size < 200) {
  const u = queue.shift()
  if (seen.has(u)) continue
  seen.add(u)
  try {
    const t = await (await fetch(u, { headers: H })).text()
    const hit = /recipe|Recipe|recept/.test(t)
    log.push(`${hit ? 'HIT' : '   '} ${t.length} ${u}`)
    if (hit) writeFileSync('probe/js/' + u.split('/').pop().replace(/[^\w.-]/g, '_'), t)
    // webpack chunk names referenced
    for (const m of t.matchAll(/static\/chunks\/[\w\/.\-\[\]]+\.js/g)) queue.push(base + '/_next/' + m[0])
  } catch (e) { log.push('ERR ' + u + ' ' + e.message) }
}
writeFileSync('probe/scripts.txt', log.join('\n'))
// Guesses at APIs
for (const [name, url, opts] of [
  ['gql-get', base + '/api/v1/?operationName=RecipeDetail', {}],
]) {
  try { const x = await fetch(url, { headers: H, ...opts }); writeFileSync('probe/' + name + '.txt', x.status + '\n' + (await x.text()).slice(0, 20000)) } catch (e) {}
}
