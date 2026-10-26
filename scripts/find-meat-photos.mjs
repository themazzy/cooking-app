// Looks up candidate photos on Wikimedia Commons (free licences) for meat cuts
// that have no TheMealDB picture, and saves small thumbnails plus their licence
// details to photo-candidates/. Run by .github/workflows/meat-photos.yml, since
// the build containers can't reach Commons.
import { mkdirSync, writeFileSync } from 'node:fs'

const SEARCHES = {
  'rump-steak': ['rump steak meat', 'incategory:"Beef steaks"'], 'flank-steak': ['flank steak', 'bavette meat'], 'skirt-steak': ['skirt steak', 'hanger steak'],
  'beef-round': ['beef topside joint', 'incategory:"Raw beef"'], 'beef-short-ribs': ['short ribs beef', 'incategory:"Beef ribs"'], 'beef-cheeks': ['beef cheek meat', 'ox cheek'],
  'beef-chuck': ['beef chuck', 'chuck roast'], 'stewing-beef': ['beef cubes', 'diced beef meat', 'stewing beef'], 'tripe': ['tripe food', 'incategory:"Tripe"'],
  'veal-shank': ['ossobuco', 'veal shank'], 'pork-tenderloin': ['pork tenderloin', 'pork fillet meat'], 'gammon': ['gammon', 'gammon steak'],
  'chicken-gizzards': ['gizzards food', 'chicken gizzard'], 'lamb-shanks': ['lamb shank', 'lamb shanks'], 'pheasant': ['pheasant meat', 'roast pheasant'],
  'wild-boar': ['wild boar meat', 'boar meat'], 'calf-liver': ['calf liver', 'veal liver'], 'pork-liver': ['pork liver', 'pig liver food'],
  'beef-tongue': ['beef tongue', 'ox tongue food'], 'bone-marrow': ['marrow bones', 'bone marrow food'], 'pork-loin': ['pork loin', 'pork loin roast'],
  'pork-leg': ['pork leg meat', 'leg of pork'], 'pork-cheeks': ['pork cheeks', 'pig cheek meat'], 'pork-neck': ['pork neck', 'pork collar', 'krkovice'],
  'pork-shoulder': ['pork shoulder', 'pork shoulder roast'], 'pork-ribs': ['pork ribs', 'spare ribs', 'incategory:"Spare ribs"'], 'pork-knuckle': ['pork knuckle', 'ham hock', 'Schweinshaxe'],
  'chicken-hearts': ['chicken hearts', 'incategory:"Chicken hearts (food)"'], 'turkey-breast': ['turkey breast meat', 'turkey breast fillet'], 'turkey-legs': ['turkey leg meat', 'turkey drumstick'],
  'turkey': ['roast turkey', 'whole turkey meat', 'thanksgiving turkey'], 'duck-breast': ['duck breast', 'magret'], 'rack-of-lamb': ['rack of lamb', 'lamb rack'],
  'quail': ['quail meat', 'roasted quail'], 'goose': ['roast goose', 'goose meat'], 'hare': ['hare meat', 'jugged hare'],
  'lardons': ['lardons', 'diced bacon'], 'elenski-but': ['Елено бут', 'Еленски бут'], 'mortadella': ['mortadella', 'mortadella bologna'], 'smoked-meat': ['smoked pork meat', 'Kassler', 'smoked meat'],
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
