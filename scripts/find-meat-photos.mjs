// Looks up candidate photos on Wikimedia Commons (free licences) for catalog
// entries that have no TheMealDB picture (edit SEARCHES for each round), and saves small thumbnails plus their licence
// details to photo-candidates/. Run by .github/workflows/meat-photos.yml, since
// the build containers can't reach Commons.
import { mkdirSync, writeFileSync } from 'node:fs'

const SEARCHES = {
  'dried-parsley': ['dried parsley flakes', 'dried parsley'], 'dried-basil': ['dried basil', 'dried basil leaves'], 'dried-coriander': ['dried coriander leaves', 'dried cilantro'],
  'dried-dill': ['dried dill weed', 'dried dill'], 'dried-mint': ['dried mint leaves', 'dried mint'], 'dried-chives': ['dried chives', 'freeze dried chives'],
  'dried-thyme': ['dried thyme', 'dried thyme leaves'], 'dried-rosemary': ['dried rosemary', 'dried rosemary leaves'], 'dried-sage': ['dried sage leaves', 'rubbed sage'],
  'dried-tarragon': ['dried tarragon', 'tarragon dried spice'], 'dried-oregano': ['dried oregano', 'oregano spice'], 'dried-marjoram': ['dried marjoram', 'marjoram spice'],
  'dried-lovage': ['dried lovage', 'Levisticum officinale dried'], 'dried-savory': ['dried savory', 'chubritsa', 'Satureja hortensis dried'],
  'fresh-oregano': ['fresh oregano', 'Origanum vulgare leaves'], 'fresh-marjoram': ['fresh marjoram', 'Origanum majorana leaves'], 'savory': ['Satureja hortensis', 'summer savory'],
  'lovage': ['lovage leaves', 'Levisticum officinale'], 'lemongrass': ['lemongrass stalks', 'lemon grass'], 'kaffir-lime-leaves': ['kaffir lime leaves', 'makrut lime leaves'], 'curry-leaves': ['curry leaves', 'Murraya koenigii leaves'],
  'black-peppercorns': ['black peppercorns', 'peppercorns'], 'white-peppercorns': ['white peppercorns', 'white pepper whole'], 'white-pepper': ['ground white pepper', 'white pepper powder'],
  'ground-coriander': ['ground coriander', 'coriander powder'], 'caraway-seeds': ['caraway seeds', 'Carum carvi seeds'], 'ground-caraway': ['ground caraway', 'caraway powder'],
  'ground-cloves': ['ground cloves', 'clove powder'], 'ground-cardamom': ['ground cardamom', 'cardamom powder'], 'whole-nutmeg': ['whole nutmeg', 'nutmeg seeds'],
  'allspice': ['allspice berries', 'Pimenta dioica dried'], 'ground-allspice': ['ground allspice', 'allspice powder'], 'ground-fennel': ['ground fennel seed', 'fennel powder'],
  'fresh-turmeric': ['fresh turmeric root', 'turmeric rhizome'], 'himalayan-salt': ['himalayan salt', 'pink salt crystals'], 'fenugreek-leaves': ['kasuri methi', 'dried fenugreek leaves'],
}

const API = 'https://commons.wikimedia.org/w/api.php'
const UA = { 'User-Agent': 'SimmerCookingApp/1.0 (https://github.com/themazzy/cooking-app)' }
const strip = (s) => String(s ?? '').replace(/<[^>]+>/g, '').trim()

mkdirSync('photo-candidates', { recursive: true })
const found = {}
for (const [slug, queries] of Object.entries(SEARCHES)) {
  found[slug] = []
  let n = 0
  for (const q of [queries].flat()) try {
    const url = `${API}?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=8&gsrsearch=${encodeURIComponent(`${q} filetype:bitmap`)}&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=240`
    const pages = Object.values((await (await fetch(url, { headers: UA })).json()).query?.pages ?? {}).sort((a, b) => a.index - b.index)
    for (const p of pages) {
      if (found[slug].some((c) => c.title === p.title)) continue
      const info = p.imageinfo?.[0]
      if (!info?.thumburl) continue
      const meta = info.extmetadata ?? {}
      const file = `photo-candidates/${slug}-${n++}.jpg`
      const res = await fetch(info.thumburl, { headers: UA })
      if (!res.ok) continue
      writeFileSync(file, Buffer.from(await res.arrayBuffer()))
      found[slug].push({ file, title: p.title, page: info.descriptionurl, license: strip(meta.LicenseShortName?.value), artist: strip(meta.Artist?.value), thumb: info.thumburl })
      await new Promise((r) => setTimeout(r, 150))
    }
  } catch (e) {
    found[slug].push({ error: String(e) })
  }
}
writeFileSync('photo-candidates/candidates.json', JSON.stringify(found, null, 1))
// TheMealDB's ingredient names, to see which ones already have a picture there
try {
  const meals = (await (await fetch('https://www.themealdb.com/api/json/v1/1/list.php?i=list', { headers: UA })).json()).meals ?? []
  writeFileSync('photo-candidates/themealdb.txt', meals.map((m) => m.strIngredient).join('\n'))
} catch (e) {
  writeFileSync('photo-candidates/themealdb.txt', String(e))
}
