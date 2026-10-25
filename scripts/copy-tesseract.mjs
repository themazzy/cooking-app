// Copies Tesseract's worker, reader (SIMD build) and the English and
// Bulgarian data into public/tesseract, so receipts are read offline from
// the app itself instead of downloading them on first use. Runs before build.
import { copyFileSync, mkdirSync } from 'node:fs'

const out = new URL('../public/tesseract/', import.meta.url)
mkdirSync(new URL('lang/', out), { recursive: true })
const nm = (p) => new URL(`../node_modules/${p}`, import.meta.url)
copyFileSync(nm('tesseract.js/dist/worker.min.js'), new URL('worker.min.js', out))
copyFileSync(nm('tesseract.js-core/tesseract-core-simd-lstm.wasm.js'), new URL('tesseract-core-simd-lstm.wasm.js', out))
for (const lang of ['eng', 'bul']) copyFileSync(nm(`@tesseract.js-data/${lang}/4.0.0_best_int/${lang}.traineddata.gz`), new URL(`lang/${lang}.traineddata.gz`, out))
console.log('Tesseract copied to public/tesseract')
