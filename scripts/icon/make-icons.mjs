// Renders the app icon (foreground.svg on background.svg) into the Android launcher icons,
// the splash screens and the website icons. Run: node scripts/icon/make-icons.mjs
import { createRequire } from 'node:module'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '../..')
const res = join(root, 'android/app/src/main/res')
const { chromium } = createRequire(import.meta.url)('playwright')

const fg = readFileSync(join(here, 'foreground.svg'), 'utf8')
const bg = readFileSync(join(here, 'background.svg'), 'utf8')
const inner = (svg) => svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')
// One SVG: background and foreground, cut to a shape. The launcher shows the middle 72 of 108 units.
const combined = (radius) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="18 18 72 72"><defs><clipPath id="c"><rect x="18" y="18" width="72" height="72" rx="${radius}"/></clipPath></defs><g clip-path="url(#c)">${inner(bg)}${inner(fg)}</g></svg>`

const browser = await chromium.launch()
const page = await browser.newPage()
async function png(svg, width, height, file, background = 'transparent') {
  await page.setViewportSize({ width, height })
  await page.setContent(`<body style="margin:0;background:${background};display:grid;place-items:center;height:100vh">${svg}</body>`)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, await page.screenshot({ omitBackground: background === 'transparent', type: 'png' }))
}
const sized = (svg, px) => svg.replace('<svg ', `<svg width="${px}" height="${px}" `)

const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 }
for (const [d, k] of Object.entries(DENSITIES)) {
  await png(sized(combined(16), 48 * k), 48 * k, 48 * k, join(res, `mipmap-${d}/ic_launcher.png`))
  await png(sized(combined(36), 48 * k), 48 * k, 48 * k, join(res, `mipmap-${d}/ic_launcher_round.png`))
  await png(sized(fg, 108 * k), 108 * k, 108 * k, join(res, `mipmap-${d}/ic_launcher_foreground.png`))
}

// Splash screens: the icon in the middle of the background colour
const SPLASH = { mdpi: [320, 480], hdpi: [480, 800], xhdpi: [720, 1280], xxhdpi: [960, 1600], xxxhdpi: [1280, 1920] }
const splashBg = '#2e7d55'
for (const [d, [w, h]] of Object.entries(SPLASH)) {
  const icon = Math.round(Math.min(w, h) * 0.5)
  await png(sized(fg, icon), w, h, join(res, `drawable-port-${d}/splash.png`), splashBg)
  await png(sized(fg, icon), h, w, join(res, `drawable-land-${d}/splash.png`), splashBg)
}
await png(sized(fg, 240), 480, 320, join(res, 'drawable/splash.png'), splashBg)

// Website: SVG favicon and a PNG for phones' home screens
mkdirSync(join(root, 'public'), { recursive: true })
writeFileSync(join(root, 'public/icon.svg'), combined(16))
await png(sized(combined(0), 180), 180, 180, join(root, 'public/apple-touch-icon.png'))
await png(sized(combined(16), 512), 512, 512, join(root, 'public/icon-512.png'))
await browser.close()
