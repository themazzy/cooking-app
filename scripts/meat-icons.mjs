// Draws the meat pictures for the ingredient catalog (public/ingredients/*.svg),
// for cuts that have no TheMealDB picture. Run: node scripts/meat-icons.mjs
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const out = join(dirname(fileURLToPath(import.meta.url)), '../public/ingredients')

// Colours: meat, darker meat, fat
const BEEF = ['#b8323a', '#8e2229', '#f6e3d0']
const PORK = ['#ea8f8c', '#c9605f', '#fbefe6']
const LAMB = ['#c84f58', '#9c3540', '#f5e6d6']
const VEAL = ['#e7a3a0', '#c77976', '#fbefe6']
const GAME = ['#7e2a2c', '#5c1b1e', '#efdcc8']
const POULTRY = ['#f3c3a6', '#e19f7c', '#f8dcc6']
const DUCK = ['#c25a4c', '#9a4034', '#f6dcc4']
const LIVER = ['#7a2230', '#561421', '#a4404e']
const BONE = '#f4ead8'
const BONE_DARK = '#d8c7a8'

const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${body}</svg>\n`
const shadow = (cx = 32, cy = 56, rx = 22) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="3" fill="#000" opacity=".12"/>`

const SHAPES = {
  // A slab of meat with a fat edge and marbling
  steak: ([m, d, f], { marble = true } = {}) =>
    shadow() +
    `<path d="M10 30c0-12 12-20 26-19 13 1 20 9 19 20-1 12-11 21-25 21C18 52 10 43 10 30z" fill="${f}"/>` +
    `<path d="M14 30c0-10 10-16 22-15 10 1 16 7 15 16-1 10-9 17-21 17-10 0-16-8-16-18z" fill="${m}"/>` +
    `<path d="M18 26c4-5 10-7 16-6" stroke="#fff" stroke-opacity=".25" stroke-width="2.5" fill="none" stroke-linecap="round"/>` +
    (marble ? `<path d="M22 36c4-2 6 1 10-1M30 28c3 0 5-2 8-1M36 40c3-1 5 1 8-1" stroke="${f}" stroke-opacity=".8" stroke-width="1.4" fill="none" stroke-linecap="round"/>` : '') +
    `<path d="M14 34c2 8 8 13 16 14" stroke="${d}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".5"/>`,
  // Steak with a T-shaped bone
  tbone: (c) => SHAPES.steak(c) + `<path d="M31 16v31M20 22c6 3 16 3 22 0" stroke="${BONE}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  // A chop: round meat with a bone handle
  chop: ([m, d, f]) =>
    shadow(28) +
    `<rect x="40" y="12" width="7" height="24" rx="3.5" transform="rotate(35 43 24)" fill="${BONE}"/>` +
    `<circle cx="51" cy="12" r="3.6" fill="${BONE}"/><circle cx="55" cy="15" r="3.6" fill="${BONE}"/>` +
    `<path d="M8 38c0-10 9-16 20-16 10 0 17 6 17 15s-8 16-19 16S8 47 8 38z" fill="${f}"/>` +
    `<path d="M12 38c0-8 7-13 16-13 8 0 13 5 13 12s-6 12-15 12-14-4-14-11z" fill="${m}"/>` +
    `<path d="M16 34c3-4 8-5 12-5" stroke="#fff" stroke-opacity=".25" stroke-width="2.5" fill="none" stroke-linecap="round"/>` +
    `<path d="M14 42c2 4 6 6 11 7" stroke="${d}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".5"/>`,
  // A rack: a row of bones above a block of meat
  rack: ([m, d, f]) =>
    shadow() +
    [16, 25, 34, 43].map((x) => `<rect x="${x}" y="8" width="5" height="26" rx="2.5" fill="${BONE}"/><rect x="${x}" y="8" width="5" height="4" rx="2" fill="${BONE_DARK}"/>`).join('') +
    `<path d="M10 32c0-3 3-5 6-5h32c3 0 6 2 6 5v12c0 5-4 9-9 9H19c-5 0-9-4-9-9z" fill="${f}"/>` +
    `<path d="M10 36c0-2 2-4 5-4h34c3 0 5 2 5 4v8c0 5-4 9-9 9H19c-5 0-9-4-9-9z" fill="${m}"/>` +
    `<path d="M14 46h36" stroke="${d}" stroke-width="2" opacity=".4" stroke-linecap="round"/>`,
  // Ribs: a flat slab with bone lines across
  ribs: ([m, d, f]) =>
    shadow() +
    `<path d="M8 22c10-6 38-6 48 0v18c-10 8-38 8-48 0z" fill="${m}"/>` +
    `<path d="M8 22c10-6 38-6 48 0" stroke="${f}" stroke-width="3" fill="none"/>` +
    [16, 25, 34, 43].map((x) => `<path d="M${x} 20v23" stroke="${BONE}" stroke-width="3.5" stroke-linecap="round"/>`).join('') +
    `<path d="M10 38c10 6 34 6 44 0" stroke="${d}" stroke-width="2" fill="none" opacity=".5"/>`,
  // A drumstick or a leg
  drumstick: ([m, d, f], { big = false } = {}) => {
    const r = big ? 16 : 14
    return (
      shadow() +
      `<rect x="34" y="8" width="7" height="24" rx="3.5" transform="rotate(40 37 20)" fill="${BONE}"/>` +
      `<circle cx="47" cy="10" r="4" fill="${BONE}"/><circle cx="51" cy="14" r="4" fill="${BONE}"/>` +
      `<path d="M38 26c4 4 2 14-6 20-8 7-${r + 6} 8-${r + 8} 0s0-18 8-22c7-4 16-5 20 2z" fill="${m}"/>` +
      `<path d="M16 34c2-5 7-8 12-8" stroke="#fff" stroke-opacity=".35" stroke-width="2.5" fill="none" stroke-linecap="round"/>` +
      `<path d="M14 46c4 4 10 4 16 0" stroke="${d}" stroke-width="2" fill="none" opacity=".45" stroke-linecap="round"/>`
    )
  },
  // A chicken wing
  wing: ([m, d]) =>
    shadow() +
    `<path d="M10 40c0-8 6-12 12-12 4 0 6 2 8 4l8-12c3-4 9-5 13-1s4 10 0 13L36 46c-3 4-8 6-13 6-8 0-13-5-13-12z" fill="${m}"/>` +
    `<path d="M30 32l-4 10" stroke="${d}" stroke-width="2" opacity=".45" stroke-linecap="round"/>` +
    `<path d="M40 22c3-2 7-2 9 1" stroke="#fff" stroke-opacity=".35" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
  // A breast fillet (teardrop), with skin lines for duck
  breast: ([m, d, f], { skin = false } = {}) =>
    shadow() +
    `<path d="M8 36c0-12 14-22 30-22 10 0 18 6 18 14 0 12-16 22-30 22-11 0-18-6-18-14z" fill="${skin ? f : m}"/>` +
    (skin ? `<path d="M12 36c0-10 12-18 26-18 8 0 14 5 14 11" fill="none" stroke="${m}" stroke-width="0"/>` + [20, 28, 36, 44].map((x) => `<path d="M${x} 18l-8 26M${x + 6} 18l-8 26" stroke="${d}" stroke-width="1.2" opacity=".35"/>`).join('') : '') +
    `<path d="M16 30c5-7 14-10 22-10" stroke="#fff" stroke-opacity=".3" stroke-width="2.5" fill="none" stroke-linecap="round"/>` +
    `<path d="M14 42c6 4 14 4 22 1" stroke="${d}" stroke-width="2" fill="none" opacity=".4" stroke-linecap="round"/>`,
  // A whole plucked bird
  bird: ([m, d], { small = false } = {}) => {
    const s = small ? 0.75 : 1
    return (
      shadow(32, 56, 22 * s) +
      `<g transform="translate(32 34) scale(${s}) translate(-32 -34)">` +
      `<rect x="40" y="12" width="6" height="16" rx="3" transform="rotate(30 43 20)" fill="${BONE}"/><rect x="18" y="12" width="6" height="16" rx="3" transform="rotate(-30 21 20)" fill="${BONE}"/>` +
      `<path d="M8 38c0-12 11-20 24-20s24 8 24 20-11 16-24 16S8 50 8 38z" fill="${m}"/>` +
      `<path d="M40 22c-3 6-3 12 0 18M24 22c3 6 3 12 0 18" stroke="${d}" stroke-width="2" fill="none" opacity=".4" stroke-linecap="round"/>` +
      `<path d="M16 30c4-5 10-8 16-8" stroke="#fff" stroke-opacity=".35" stroke-width="3" fill="none" stroke-linecap="round"/>` +
      `</g>`
    )
  },
  // A tied roast or joint
  roast: ([m, d, f], { crust = null } = {}) =>
    shadow() +
    `<rect x="8" y="18" width="48" height="32" rx="16" fill="${crust ?? f}"/>` +
    `<ellipse cx="44" cy="34" rx="11" ry="15" fill="${m}"/><ellipse cx="44" cy="34" rx="7" ry="10" fill="${d}" opacity=".35"/>` +
    [18, 26, 34].map((x) => `<path d="M${x} 18v32" stroke="#efe2c4" stroke-width="2"/>`).join('') +
    `<path d="M14 24c4-3 10-4 16-4" stroke="#fff" stroke-opacity=".3" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
  // A shank: a cone of meat on a bone
  shank: ([m, d, f]) =>
    shadow() +
    `<rect x="28" y="6" width="8" height="20" rx="4" fill="${BONE}"/><ellipse cx="32" cy="8" rx="7" ry="4" fill="${BONE}"/>` +
    `<path d="M22 22h20c6 8 10 16 10 22 0 6-9 10-20 10s-20-4-20-10c0-6 4-14 10-22z" fill="${m}"/>` +
    `<path d="M22 22h20" stroke="${f}" stroke-width="3" stroke-linecap="round"/>` +
    `<path d="M20 34c-2 4-3 8-2 12M44 34c2 4 3 8 2 12" stroke="${d}" stroke-width="2" fill="none" opacity=".45" stroke-linecap="round"/>`,
  // Liver: two glossy lobes
  liver: ([m, d, f]) =>
    shadow() +
    `<path d="M8 32c0-9 9-14 19-12 4 1 6 3 8 3 6-3 21-3 21 8 0 12-14 19-28 19S8 42 8 32z" fill="${m}"/>` +
    `<path d="M35 23c-2 8-2 16 2 26" stroke="${d}" stroke-width="2" fill="none" opacity=".6"/>` +
    `<path d="M14 28c3-3 7-4 11-3M41 27c3-1 7 0 9 2" stroke="${f}" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".8"/>`,
  // Small hearts or gizzards in a cluster
  hearts: ([m, d, f]) =>
    shadow() +
    [[20, 38], [36, 42], [30, 26], [44, 30]].map(([x, y]) => `<path d="M${x} ${y - 8}c-5 0-7 4-7 7 0 5 7 9 7 9s7-4 7-9c0-3-2-7-7-7z" fill="${m}"/><path d="M${x - 4} ${y - 7}h8" stroke="${f}" stroke-width="2.5" stroke-linecap="round"/><path d="M${x - 3} ${y - 2}c1-2 3-3 4-3" stroke="#fff" stroke-opacity=".3" stroke-width="1.6" fill="none"/>`).join(''),
  // A heart
  heart: ([m, d, f]) =>
    shadow() +
    `<path d="M32 14c-12 0-20 8-20 18 0 12 20 22 20 22s20-10 20-22c0-10-8-18-20-18z" fill="${m}"/>` +
    `<path d="M16 22c6-4 26-4 32 0" stroke="${f}" stroke-width="5" stroke-linecap="round"/>` +
    `<path d="M30 26c-2 8 0 16 4 22" stroke="${d}" stroke-width="2" fill="none" opacity=".5"/>`,
  // A tongue
  tongue: ([m, d]) =>
    shadow() +
    `<path d="M8 30c0-6 6-10 14-10h24c6 0 10 5 10 11s-4 13-12 13H22C14 44 8 38 8 30z" fill="${m}"/>` +
    `<path d="M14 32h34" stroke="${d}" stroke-width="2" opacity=".4" stroke-linecap="round"/>` +
    `<path d="M14 26c4-3 10-3 14-3" stroke="#fff" stroke-opacity=".3" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
  // Honeycomb tripe
  tripe: () =>
    shadow() +
    `<rect x="10" y="14" width="44" height="38" rx="10" fill="#efe3cf"/>` +
    [0, 1, 2].flatMap((r) => [0, 1, 2, 3].map((c) => `<path d="M${17 + c * 10 + (r % 2) * 5} ${22 + r * 10}l4-3 4 3v5l-4 3-4-3z" fill="none" stroke="#d2bf9e" stroke-width="1.6"/>`)).join(''),
  // Cubes of meat (stew, lardons)
  cubes: ([m, d, f]) =>
    shadow() +
    [[12, 30], [30, 34], [22, 16], [40, 18]].map(([x, y]) => `<rect x="${x}" y="${y}" width="15" height="15" rx="3" fill="${m}"/><path d="M${x} ${y + 4}h15" stroke="${f}" stroke-width="2.5"/><path d="M${x + 3} ${y + 9}h6" stroke="${d}" stroke-width="1.5" opacity=".5" stroke-linecap="round"/>`).join(''),
  // A salami-like log with a cut slice
  salami: ([m, d, f], { casing = '#8a5a44', dots = 7, flat = false } = {}) => {
    const ry = flat ? 9 : 12
    return (
      shadow() +
      `<rect x="6" y="${34 - ry}" width="34" height="${ry * 2}" rx="${ry}" fill="${casing}"/>` +
      `<ellipse cx="40" cy="34" rx="${ry * 0.55}" ry="${ry}" fill="${m}"/>` +
      `<circle cx="46" cy="30" r="12" fill="${casing}"/><circle cx="46" cy="30" r="10.5" fill="${m}"/>` +
      Array.from({ length: dots }, (_, i) => {
        const a = (i / dots) * Math.PI * 2 + 0.4
        const r = i % 2 ? 6 : 3.5
        return `<circle cx="${(46 + Math.cos(a) * r).toFixed(1)}" cy="${(30 + Math.sin(a) * r).toFixed(1)}" r="1.4" fill="${f}"/>`
      }).join('') +
      `<path d="M12 ${36 - ry}h16" stroke="#fff" stroke-opacity=".25" stroke-width="2" stroke-linecap="round"/>` +
      `<path d="M12 ${30 + ry}h20" stroke="${d}" stroke-width="2" opacity=".3" stroke-linecap="round"/>`
    )
  },
  // Two sausage links
  sausages: (_, { color = '#c8745a', dark = '#9a523d', thin = false, cuts = false } = {}) => {
    const h = thin ? 8 : 12
    return (
      shadow() +
      [[8, 22], [14, 36]].map(([x, y]) => `<rect x="${x}" y="${y}" width="42" height="${h}" rx="${h / 2}" fill="${color}"/><path d="M${x + 5} ${y + 3}h26" stroke="#fff" stroke-opacity=".3" stroke-width="2" stroke-linecap="round"/>` + (cuts ? `<path d="M${x + 4} ${y + 2}l-2 ${h - 4}M${x + 38} ${y + 2}l2 ${h - 4}" stroke="${dark}" stroke-width="1.6"/>` : '')).join('') +
      `<path d="M50 ${22 + h / 2}l4 2M56 ${36 + h / 2}l4 2" stroke="${dark}" stroke-width="2" stroke-linecap="round"/>`
    )
  },
  // A sausage ring (kielbasa)
  ring: (_, { color = '#a4553f', dark = '#7a3b2a' } = {}) =>
    shadow() +
    `<path d="M14 22c0 18 8 28 18 28s18-10 18-28" fill="none" stroke="${color}" stroke-width="12" stroke-linecap="round"/>` +
    `<path d="M14 22c0 18 8 28 18 28s18-10 18-28" fill="none" stroke="#fff" stroke-opacity=".2" stroke-width="3" stroke-linecap="round" transform="translate(-2 -2)"/>` +
    `<path d="M14 16v-3M50 16v-3" stroke="${dark}" stroke-width="2.5" stroke-linecap="round"/>`,
  // Strips of bacon
  bacon: (_, { meat = '#d2645c', fat = '#fbe6d6', smoked = false } = {}) =>
    shadow() +
    [[14, 0], [26, 6]].map(([y, dx]) => `<path d="M${6 + dx} ${y}c6-4 10 4 16 0s10 4 16 0 10 4 14 0v12c-4 4-8-4-14 0s-10-4-16 0-10-4-16 0z" transform="translate(0 ${y})" fill="${smoked ? '#a64a3c' : meat}"/><path d="M${6 + dx} ${y + 4}c6-4 10 4 16 0s10 4 16 0 10 4 14 0" transform="translate(0 ${y})" stroke="${fat}" stroke-width="2.5" fill="none"/>`).join(''),
  // Folded thin slices of cured ham
  ham: (_, { meat = '#c9545a', fat = '#fbeee4', dark = '#9c3540' } = {}) =>
    shadow() +
    [[10, 30, -12], [22, 22, 8], [30, 32, -4]].map(([x, y, r]) => `<path d="M${x} ${y}c6-10 22-12 28-2 3 6-2 12-8 12H${x + 6}c-6 0-8-5-6-10z" transform="rotate(${r} ${x + 14} ${y})" fill="${meat}" stroke="${fat}" stroke-width="2.5"/><path d="M${x + 6} ${y + 2}c6-4 14-4 18 0" transform="rotate(${r} ${x + 14} ${y})" stroke="${dark}" stroke-width="1.4" fill="none" opacity=".4"/>`).join(''),
  // Round slices fanned out (bresaola, roast beef, pastrami)
  slices: (_, { meat = '#8e2a33', edge = '#5e1a20', inner = null } = {}) =>
    shadow() +
    [[20, 34], [32, 30], [44, 34]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="14" fill="${edge}"/><circle cx="${x}" cy="${y}" r="12" fill="${meat}"/>` + (inner ? `<circle cx="${x}" cy="${y}" r="6" fill="${inner}" opacity=".6"/>` : '')).join(''),
  // A big round slice with pistachios (mortadella)
  mortadella: () =>
    shadow() +
    `<circle cx="32" cy="32" r="22" fill="#e9a3a3"/><circle cx="32" cy="32" r="20" fill="#f4bcbc"/>` +
    [[24, 24], [38, 22], [28, 38], [42, 36], [34, 30], [20, 34]].map(([x, y], i) => (i % 2 ? `<circle cx="${x}" cy="${y}" r="2.6" fill="#8fbf5a"/>` : `<circle cx="${x}" cy="${y}" r="2.2" fill="#fbeee4"/>`)).join(''),
  // Meatballs, three balls
  balls: (_, { color = '#8a4a32', light = '#b0694b' } = {}) =>
    shadow() + [[20, 38], [44, 38], [32, 24]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="11" fill="${color}"/><circle cx="${x - 3}" cy="${y - 3}" r="4" fill="${light}" opacity=".7"/>`).join(''),
  // Grilled minced-meat rolls (kebapche)
  kebab: () =>
    shadow() +
    [[8, 20], [12, 34]].map(([x, y]) => `<rect x="${x}" y="${y}" width="44" height="12" rx="6" fill="#8a4a32"/>` + [12, 22, 32, 42].map((dx) => `<path d="M${x + dx} ${y + 2}l-3 8" stroke="#4a2516" stroke-width="2" stroke-linecap="round"/>`).join('')).join(''),
  // A block of layered pork belly
  belly: () =>
    shadow() +
    `<rect x="8" y="16" width="48" height="34" rx="6" fill="#fbefe6"/>` +
    `<rect x="8" y="16" width="48" height="6" rx="3" fill="#e7c9a8"/>` +
    `<path d="M8 28h48M8 40h48" stroke="#ea8f8c" stroke-width="6"/>`,
  // Golden cracklings
  cracklings: () =>
    shadow() +
    [[14, 34, 0], [28, 40, 20], [40, 30, -15], [24, 24, 30], [44, 44, 10]].map(([x, y, r]) => `<path d="M${x - 6} ${y - 3}l9-4 6 6-3 7-10 1z" transform="rotate(${r} ${x} ${y})" fill="#d9a050" stroke="#a8702c" stroke-width="1.2"/>`).join(''),
  // A slice of head cheese in jelly
  headcheese: () =>
    shadow() +
    `<rect x="10" y="14" width="44" height="38" rx="8" fill="#e8c9a8" opacity=".9"/>` +
    [[18, 24, '#d36f6c'], [34, 22, '#f2e2cf'], [26, 36, '#b9504f'], [42, 38, '#d36f6c'], [20, 44, '#f2e2cf']].map(([x, y, c]) => `<rect x="${x}" y="${y}" width="9" height="7" rx="2" fill="${c}"/>`).join(''),
  // A smoked joint: brown crust, pink cut face
  smoked: () =>
    shadow() +
    `<rect x="8" y="16" width="48" height="34" rx="10" fill="#7a3f22"/>` +
    `<path d="M40 16h6c6 0 10 4 10 10v14c0 6-4 10-10 10h-6z" fill="#e5928c"/>` +
    `<path d="M14 22c6-3 14-3 20-2" stroke="#b06a3c" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
  // Glazed char siu slices
  charsiu: () =>
    shadow() +
    [[10, 26], [22, 30], [34, 34]].map(([x, y]) => `<rect x="${x}" y="${y}" width="20" height="16" rx="3" transform="rotate(-12 ${x + 10} ${y + 8})" fill="#f2d2c4" stroke="#b5302a" stroke-width="3"/>`).join(''),
  // A marrow bone cut across
  marrow: () =>
    shadow() +
    `<rect x="8" y="22" width="40" height="24" rx="6" fill="${BONE}"/><ellipse cx="48" cy="34" rx="8" ry="12" fill="${BONE_DARK}"/><ellipse cx="48" cy="34" rx="5" ry="8" fill="#e7b88a"/>`,
  // A skinned rabbit or hare leg
  leg: ([m, d, f]) =>
    shadow() +
    `<path d="M14 18c8-4 18 0 22 8l14 18c3 4 0 9-5 8L20 44c-8-2-12-10-10-18 1-4 2-7 4-8z" fill="${m}"/>` +
    `<path d="M48 48l6 4" stroke="${BONE}" stroke-width="4" stroke-linecap="round"/>` +
    `<path d="M18 24c4-3 10-3 14 1" stroke="#fff" stroke-opacity=".3" stroke-width="2.5" fill="none" stroke-linecap="round"/>` +
    `<path d="M18 38c6 3 14 4 22 4" stroke="${d}" stroke-width="2" fill="none" opacity=".45" stroke-linecap="round"/>`,
}

// File name → [shape, colours, options]
export const MEAT_ICONS = {
  'ribeye-steak': ['steak', BEEF],
  'rump-steak': ['steak', BEEF, { marble: false }],
  'flank-steak': ['ribs', ['#b8323a', '#8e2229', '#b8323a']],
  'skirt-steak': ['bacon', null, { meat: '#a8303a', fat: '#c9545a' }],
  't-bone-steak': ['tbone', BEEF],
  'steak': ['steak', BEEF],
  'beef-sirloin': ['roast', BEEF],
  'beef-chuck': ['roast', BEEF, { crust: '#c9545a' }],
  'beef-round': ['roast', BEEF, { crust: '#b8323a' }],
  'beef-short-ribs': ['ribs', BEEF],
  'beef-cheeks': ['liver', ['#9e2a33', '#741c24', '#c9545a']],
  'stewing-beef': ['cubes', BEEF],
  'roast-beef': ['slices', null, { meat: '#d77a7a', edge: '#7a4030' }],
  'corned-beef': ['slices', null, { meat: '#e07e84', edge: '#c06068' }],
  'beef-liver': ['liver', LIVER],
  'calf-liver': ['liver', ['#8e3040', '#661d2c', '#b45666']],
  'pork-liver': ['liver', ['#6c2232', '#4c1522', '#94404e']],
  'beef-tongue': ['tongue', ['#c98a8a', '#a86868']],
  'tripe': ['tripe'],
  'bone-marrow': ['marrow'],
  'veal-shank': ['shank', VEAL],
  'pork-chops': ['chop', PORK],
  'pork-loin': ['roast', PORK],
  'pork-leg': ['shank', PORK],
  'pork-cheeks': ['liver', ['#d9716f', '#b5504f', '#f2b0ae']],
  'pork-neck': ['steak', PORK],
  'pork-shoulder': ['roast', PORK, { crust: '#f3d3c4' }],
  'pork-tenderloin': ['tongue', ['#ea8f8c', '#c9605f']],
  'pork-ribs': ['ribs', PORK],
  'pork-knuckle': ['shank', ['#e9a083', '#c07055', '#f6dcc4']],
  'pork-belly': ['belly'],
  'pig-trotters': ['shank', ['#f2c8b4', '#d9a48c', '#fbe6d6']],
  'gammon': ['steak', ['#e47a7e', '#c05a60', '#fbefe6']],
  'chicken-wings': ['wing', POULTRY],
  'chicken-drumsticks': ['drumstick', POULTRY],
  'chicken-hearts': ['hearts', ['#9e3040', '#741c2c', '#f6e3d0']],
  'chicken-gizzards': ['hearts', ['#a0443e', '#7a2e2a', '#c9a090']],
  'chicken-liver': ['liver', ['#8a2f3a', '#621f2a', '#b05866']],
  'turkey-breast': ['breast', POULTRY],
  'turkey-legs': ['drumstick', ['#e9b096', '#cc8c70', '#f6d6c0'], { big: true }],
  'turkey': ['bird', POULTRY],
  'duck-breast': ['breast', DUCK, { skin: true }],
  'rack-of-lamb': ['rack', LAMB],
  'lamb-shanks': ['shank', LAMB],
  'pheasant': ['bird', ['#e7b190', '#c98e6c']],
  'quail': ['bird', POULTRY, { small: true }],
  'goose': ['bird', ['#f0c8a8', '#d4a684']],
  'rabbit': ['leg', ['#e8b0a8', '#c78a82', '#f6dcd2']],
  'hare': ['leg', GAME],
  'venison': ['steak', GAME, { marble: false }],
  'wild-boar': ['roast', GAME, { crust: '#5c3a2a' }],
  'pancetta': ['cubes', PORK],
  'lardons': ['cubes', ['#e07b74', '#b85a55', '#fbe6d6']],
  'smoked-bacon': ['bacon', null, { smoked: true }],
  'salami': ['salami', ['#b8434a', '#8e2a33', '#f8dcd0']],
  'pepperoni': ['salami', ['#c43a30', '#962a22', '#f3c3a6'], { casing: '#9a3022', dots: 5 }],
  'sujuk': ['salami', ['#8a2a2a', '#5e1a1a', '#e8c0a0'], { casing: '#5a2e1e', flat: true }],
  'lukanka': ['salami', ['#a83a3a', '#7a2626', '#f0d0c0'], { casing: '#6e3a28', flat: true }],
  'chinese-sausage': ['sausages', null, { color: '#b5302a', dark: '#7a1e1a', thin: true }],
  'speck': ['ham', null, { meat: '#a8434a', dark: '#6e2a30' }],
  'serrano-ham': ['ham', null, { meat: '#b8424c' }],
  'elenski-but': ['ham', null, { meat: '#9c3540', dark: '#6e2028' }],
  'bresaola': ['slices', null],
  'pastarma': ['slices', null, { meat: '#9c3540', edge: '#7a3a1c' }],
  'mortadella': ['mortadella'],
  'kielbasa': ['ring'],
  'merguez': ['sausages', null, { color: '#b5482e', dark: '#7a2e1c', thin: true }],
  'spekacky': ['sausages', null, { color: '#c06a50', dark: '#8a4630', cuts: true }],
  'parky': ['sausages', null, { color: '#e9a58a', dark: '#c47a60', thin: true }],
  'klobasa': ['sausages', null, { color: '#9a4a32', dark: '#6a2e1e' }],
  'jitrnice': ['sausages', null, { color: '#cdb8a8', dark: '#9a8270' }],
  'smoked-meat': ['smoked'],
  'head-cheese': ['headcheese'],
  'meatballs': ['balls'],
  'kebapche': ['kebab'],
  'char-siu': ['charsiu'],
  'lard-cracklings': ['cracklings'],
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  mkdirSync(out, { recursive: true })
  for (const [file, [shape, colors, options]] of Object.entries(MEAT_ICONS)) writeFileSync(join(out, `${file}.svg`), svg(SHAPES[shape](colors, options)))
  console.log(`${Object.keys(MEAT_ICONS).length} pictures in public/ingredients`)
}
