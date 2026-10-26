// Looks up candidate photos on Wikimedia Commons (free licences) for meat cuts
// that have no TheMealDB picture, and saves small thumbnails plus their licence
// details to photo-candidates/. Run by .github/workflows/meat-photos.yml, since
// the build containers can't reach Commons.
import { mkdirSync, writeFileSync } from 'node:fs'

const SEARCHES = {
  'ribeye-steak': 'raw ribeye steak', 'rump-steak': 'raw rump steak', 'flank-steak': 'raw flank steak', 'skirt-steak': 'raw skirt steak',
  't-bone-steak': 'raw T-bone steak', 'steak': 'raw beef steak', 'beef-sirloin': 'raw beef sirloin', 'beef-chuck': 'raw beef chuck',
  'beef-round': 'raw beef topside', 'beef-short-ribs': 'raw beef short ribs', 'beef-cheeks': 'raw beef cheeks', 'stewing-beef': 'raw diced beef stew meat',
  'roast-beef': 'sliced roast beef', 'corned-beef': 'corned beef sliced', 'beef-liver': 'raw beef liver', 'calf-liver': 'raw calf liver',
  'pork-liver': 'raw pork liver', 'beef-tongue': 'raw beef tongue', 'tripe': 'raw honeycomb tripe', 'bone-marrow': 'marrow bones raw',
  'veal-shank': 'raw veal shank ossobuco', 'pork-chops': 'raw pork chops', 'pork-loin': 'raw pork loin', 'pork-leg': 'raw pork leg',
  'pork-cheeks': 'raw pork cheeks', 'pork-neck': 'raw pork neck collar', 'pork-shoulder': 'raw pork shoulder', 'pork-tenderloin': 'raw pork tenderloin',
  'pork-ribs': 'raw pork spare ribs', 'pork-knuckle': 'raw pork knuckle', 'pork-belly': 'raw pork belly', 'pig-trotters': 'raw pig trotters',
  'gammon': 'gammon steak raw', 'chicken-wings': 'raw chicken wings', 'chicken-drumsticks': 'raw chicken drumsticks', 'chicken-hearts': 'raw chicken hearts',
  'chicken-gizzards': 'raw chicken gizzards', 'chicken-liver': 'raw chicken livers', 'turkey-breast': 'raw turkey breast', 'turkey-legs': 'raw turkey legs',
  'turkey': 'raw whole turkey', 'duck-breast': 'raw duck breast', 'rack-of-lamb': 'raw rack of lamb', 'lamb-shanks': 'raw lamb shanks',
  'pheasant': 'plucked pheasant raw', 'quail': 'raw quail plucked', 'goose': 'raw goose plucked', 'rabbit': 'raw rabbit meat',
  'hare': 'hare meat raw', 'venison': 'raw venison', 'wild-boar': 'wild boar meat raw', 'pancetta': 'pancetta',
  'lardons': 'lardons bacon', 'smoked-bacon': 'smoked bacon slices', 'salami': 'salami sliced', 'pepperoni': 'pepperoni sliced',
  'sujuk': 'sucuk sausage', 'lukanka': 'lukanka', 'chinese-sausage': 'lap cheong sausage', 'speck': 'speck ham',
  'serrano-ham': 'jamon serrano sliced', 'elenski-but': 'elenski but', 'bresaola': 'bresaola', 'pastarma': 'pastirma',
  'mortadella': 'mortadella sliced', 'kielbasa': 'kielbasa', 'merguez': 'merguez sausages', 'spekacky': 'špekáčky',
  'parky': 'párky', 'klobasa': 'klobása', 'jitrnice': 'jitrnice', 'smoked-meat': 'uzené maso', 'head-cheese': 'tlačenka',
  'meatballs': 'meatballs', 'kebapche': 'kebapche', 'char-siu': 'char siu', 'lard-cracklings': 'pork cracklings škvarky',
}

const API = 'https://commons.wikimedia.org/w/api.php'
const UA = { 'User-Agent': 'SimmerCookingApp/1.0 (https://github.com/themazzy/cooking-app)' }
const strip = (s) => String(s ?? '').replace(/<[^>]+>/g, '').trim()

mkdirSync('photo-candidates', { recursive: true })
const found = {}
for (const [slug, q] of Object.entries(SEARCHES)) {
  const url = `${API}?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=8&gsrsearch=${encodeURIComponent(`${q} filetype:bitmap`)}&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=240`
  try {
    const pages = Object.values((await (await fetch(url, { headers: UA })).json()).query?.pages ?? {}).sort((a, b) => a.index - b.index)
    found[slug] = []
    for (const [n, p] of pages.entries()) {
      const info = p.imageinfo?.[0]
      if (!info?.thumburl) continue
      const meta = info.extmetadata ?? {}
      const file = `photo-candidates/${slug}-${n}.jpg`
      const res = await fetch(info.thumburl, { headers: UA })
      if (!res.ok) continue
      writeFileSync(file, Buffer.from(await res.arrayBuffer()))
      found[slug].push({ file, title: p.title, page: info.descriptionurl, license: strip(meta.LicenseShortName?.value), artist: strip(meta.Artist?.value), thumb: info.thumburl })
      await new Promise((r) => setTimeout(r, 150))
    }
  } catch (e) {
    found[slug] = { error: String(e) }
  }
}
writeFileSync('photo-candidates/candidates.json', JSON.stringify(found, null, 1))
