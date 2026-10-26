// Looks up candidate photos on Wikimedia Commons (free licences) for catalog
// entries that have no TheMealDB picture (edit SEARCHES for each round), and saves small thumbnails plus their licence
// details to photo-candidates/. Run by .github/workflows/meat-photos.yml, since
// the build containers can't reach Commons.
import { mkdirSync, writeFileSync } from 'node:fs'

const SEARCHES = {
  'soup-bones': ['soup bones beef', 'beef bones raw', 'bones for broth'], 'chicken-carcass': ['chicken carcass', 'chicken frame bones'],
  'beef-neck': ['beef neck meat', 'beef neck'], 'flat-iron-steak': ['flat iron steak'], 'picanha': ['picanha', 'picanha raw'], 'tri-tip': ['tri-tip', 'tri tip beef'],
  'veal-escalope': ['veal escalope', 'veal cutlet raw', 'Wiener Schnitzel raw'], 'veal-chops': ['veal chop', 'veal chops'],
  'lamb-neck': ['lamb neck', 'neck of lamb'], 'goat': ['goat meat', 'kid goat meat'], 'pork-back-fat': ['pork back fat', 'fatback pork', 'Speck fat'],
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
