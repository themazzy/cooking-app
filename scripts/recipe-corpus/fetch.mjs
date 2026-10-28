// Downloads the recipe pages in seeds.txt (and a few more recipes linked from each one) for the
// parser tests, and saves them to recipe-corpus/ with scripts and styles removed (recipe data in
// application/ld+json stays). Run by .github/workflows/recipe-corpus.yml, since the build
// containers can't reach recipe sites.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const EXTRA = Number(process.env.EXTRA ?? 1)
const LIMIT = Number(process.env.LIMIT ?? 120)
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
const HEADERS = { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml', 'Accept-Language': 'cs,sk;q=0.9,bg;q=0.8,en;q=0.7' }

const seeds = readFileSync(new URL('./seeds.txt', import.meta.url), 'utf8')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'))

/** The page without what the parser never reads, so the saved files stay small. */
const slim = (html) =>
  html
    .replace(/<script\b(?![^>]*application\/ld\+json)[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<(style|svg|noscript|iframe|template)\b[\s\S]*?<\/\1>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s(?:srcset|sizes|style|data-(?!recipe|wprm|tasty|mv)[\w-]+)="[^"]*"/gi, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')

const fileName = (url) => {
  const u = new URL(url)
  const slug = decodeURIComponent(u.pathname + u.search).replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 80)
  return `${u.hostname.replace(/^www\./, '')}__${slug || 'home'}.html`
}

/** Links to other recipes on the same site: same host, a path shaped like the seed's. */
function moreRecipes(html, seed) {
  const base = new URL(seed)
  const shape = base.pathname.split('/').filter(Boolean)
  const out = new Set()
  for (const m of html.matchAll(/href="([^"#]+)"/gi)) {
    let u
    try {
      u = new URL(m[1].replace(/&amp;/g, '&'), base)
    } catch {
      continue
    }
    if (u.hostname !== base.hostname || u.href === base.href) continue
    const parts = u.pathname.split('/').filter(Boolean)
    // Same depth and the same first folder ("/recept/…", "/2026/…"), and a slug long enough to be a recipe
    if (parts.length !== shape.length || (shape.length > 1 && parts[0] !== shape[0])) continue
    if ((parts.at(-1) ?? '').length < 12 || /kategori|tag|autor|author|page|search|hledat|login/i.test(u.pathname)) continue
    out.add(u.origin + u.pathname + (base.search && u.search ? u.search : ''))
  }
  return [...out]
}

async function get(url) {
  const r = await fetch(url, { headers: HEADERS, redirect: 'follow', signal: AbortSignal.timeout(25000) })
  return { status: r.status, url: r.url, html: await r.text() }
}

mkdirSync('recipe-corpus/pages', { recursive: true })
const index = []
const seen = new Set()
const queue = seeds.map((url) => ({ url, seed: true }))
while (queue.length && index.length < LIMIT) {
  const { url, seed } = queue.shift()
  if (seen.has(url)) continue
  seen.add(url)
  try {
    const page = await get(url)
    const file = fileName(url)
    const ok = page.status < 400
    if (ok) writeFileSync(`recipe-corpus/pages/${file}`, slim(page.html))
    index.push({ url, finalUrl: page.url, status: page.status, file: ok ? file : null, seed, bytes: page.html.length, jsonLd: /application\/ld\+json/i.test(page.html) })
    console.log(page.status, url)
    // Followed links go to the end, so every seed is fetched first
    if (ok && seed) for (const more of moreRecipes(page.html, url).slice(0, EXTRA)) queue.push({ url: more, seed: false })
  } catch (e) {
    index.push({ url, status: 0, error: String(e.message ?? e), seed })
    console.log('ERR', url, e.message)
  }
  await new Promise((r) => setTimeout(r, 800))
}
writeFileSync('recipe-corpus/index.json', JSON.stringify(index, null, 1))
console.log(`${index.filter((p) => p.file).length} of ${index.length} pages saved`)
