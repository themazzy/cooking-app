// Looks up candidate photos on Wikimedia Commons (free licences) for catalog
// entries that have no TheMealDB picture (edit SEARCHES for each round), and saves small thumbnails plus their licence
// details to photo-candidates/. Run by .github/workflows/meat-photos.yml, since
// the build containers can't reach Commons.
import { mkdirSync, writeFileSync } from 'node:fs'

const SEARCHES = {
  'dried-parsley': ['dried parsley leaves', 'Petroselinum dried', 'getrocknete Petersilie'], 'dried-basil': ['dried basil herb', 'getrocknetes Basilikum', 'basilic séché'],
  'dried-coriander': ['dried coriander leaf', 'getrockneter Koriander'], 'dried-chives': ['chives dried herb', 'getrockneter Schnittlauch', 'Schnittlauch gefriergetrocknet'],
  'dried-sage': ['dried sage', 'Salvia officinalis dried leaves', 'getrockneter Salbei'], 'dried-lovage': ['getrocknetes Liebstöckel', 'lovage dried leaves'],
  'ground-caraway': ['ground caraway seeds', 'Kümmel gemahlen'], 'ground-fennel': ['fennel seed powder', 'Fenchel gemahlen'],
  'fresh-oregano': ['Origanum vulgare harvested', 'oregano herb fresh leaves', 'fresh oregano bunch'], 'dried-savory': ['Bohnenkraut getrocknet', 'Satureja dried herb', 'чубрица'],
}
// TheMealDB pictures to compare with
const MEALDB = ['Oregano', 'Dried Oregano', 'Fresh Thyme', 'Thyme', 'Dried Mint', 'Dried Dill', 'Dried Leaves Of Summer Savoury', 'Whole black peppercorns', 'Peppercorns', 'Ground Black Pepper',
  'Ground Coriander', 'Ground Cumin', 'Ground Nutmeg', 'Ground Clove', 'Ground Cardomom', 'Allspice', 'Allspice Berries', 'Ground Allspice', 'Ground Turmeric', 'Turmeric', 'Ground Cinnamon',
  'Caraway Seed', 'Lemongrass', 'Lemongrass Stalks', 'Kaffir Lime Leaves', 'Lime Leaves', 'Green Cardamom Pods', 'Marjoram', 'Sage', 'Basil', 'Coriander', 'Coriander Seeds', 'Cumin', 'Cumin Seeds',
  'Cloves', 'Nutmeg', 'Cardamom', 'Fenugreek', 'Tarragon Leaves', 'Rosemary', 'Chives', 'Mint', 'Dill', 'Parsley', 'Black Pepper', 'Pepper', 'Ground Mustard', 'Mustard Powder']

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
for (const name of MEALDB) try {
  const res = await fetch(`https://www.themealdb.com/images/ingredients/${encodeURIComponent(name.toLowerCase().replace(/ /g, '_'))}-small.png`, { headers: UA })
  if (res.ok) writeFileSync(`photo-candidates/mealdb-${name.toLowerCase().replace(/ /g, '-')}.png`, Buffer.from(await res.arrayBuffer()))
} catch {}
// TheMealDB's ingredient names, to see which ones already have a picture there
try {
  const meals = (await (await fetch('https://www.themealdb.com/api/json/v1/1/list.php?i=list', { headers: UA })).json()).meals ?? []
  writeFileSync('photo-candidates/themealdb.txt', meals.map((m) => m.strIngredient).join('\n'))
} catch (e) {
  writeFileSync('photo-candidates/themealdb.txt', String(e))
}
