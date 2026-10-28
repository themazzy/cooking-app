// Copies recipe pages saved by fetch.mjs into src/lib/fixtures/pages/ for the parser tests,
// smaller still (no pictures, links, buttons or attributes the parser doesn't read) and gzipped.
// Usage: node scripts/recipe-corpus/fixtures.mjs <recipe-corpus dir> <page file>...
import { JSDOM } from 'jsdom'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'

const [dir, ...files] = process.argv.slice(2)
const index = JSON.parse(readFileSync(`${dir}/index.json`, 'utf8'))
const out = new URL('../../src/lib/fixtures/pages/', import.meta.url)
mkdirSync(out, { recursive: true })
const KEEP = new Set(['class', 'id', 'property', 'itemprop', 'itemtype', 'content', 'type', 'name', 'datetime'])

const list = []
for (const file of files) {
  const entry = index.find((p) => p.file === file)
  const doc = new JSDOM(readFileSync(`${dir}/pages/${file}`, 'utf8')).window.document
  for (const el of doc.querySelectorAll('img, picture, source, video, audio, svg, link, style, noscript, iframe, input, select, option, textarea, i')) el.remove()
  for (const el of doc.querySelectorAll('script')) if (!/ld\+json/i.test(el.getAttribute('type') ?? '')) el.remove()
  for (const el of doc.querySelectorAll('meta')) if (!/^og:(?:title|site_name|image|description)$/.test(el.getAttribute('property') ?? '')) el.remove()
  for (const el of doc.querySelectorAll('*')) {
    for (const a of [...el.attributes]) if (!KEEP.has(a.name)) el.removeAttribute(a.name)
  }
  // Links become their text; empty boxes go
  for (const a of doc.querySelectorAll('a')) a.replaceWith(...a.childNodes)
  for (let again = true; again; ) {
    again = false
    for (const el of doc.querySelectorAll('div, span, section, ul, li, p')) {
      if (!el.textContent.trim() && !el.querySelector('br')) {
        el.remove()
        again = true
      }
    }
  }
  const html = `<!doctype html>\n${doc.documentElement.outerHTML}`.replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n')
  writeFileSync(new URL(`${file}.gz`, out), gzipSync(html, { level: 9 }))
  list.push({ file: `${file}.gz`, url: entry?.url ?? null })
}
writeFileSync(new URL('index.json', out), `${JSON.stringify(list, null, 1)}\n`)
