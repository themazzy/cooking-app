// Copies Tesseract's worker, reader (SIMD and plain builds) and the English and
// Bulgarian data into public/tesseract, so receipts are read offline from
// the app itself instead of downloading them on first use. Runs before build.
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'

const out = new URL('../public/tesseract/', import.meta.url)
mkdirSync(new URL('lang/', out), { recursive: true })
const nm = (p) => new URL(`../node_modules/${p}`, import.meta.url)
copyFileSync(nm('tesseract.js/dist/worker.min.js'), new URL('worker.min.js', out))
// The SIMD build is faster; phones whose WebView lacks SIMD get the plain one
for (const core of ['tesseract-core-simd-lstm.wasm.js', 'tesseract-core-lstm.wasm.js']) copyFileSync(nm(`tesseract.js-core/${core}`), new URL(core, out))
// Unpacked: Android leaves .gz files out of the app's assets (they 404 in the WebView),
// and the APK is zipped anyway
for (const lang of ['eng', 'bul']) {
  rmSync(new URL(`lang/${lang}.traineddata.gz`, out), { force: true })
  writeFileSync(new URL(`lang/${lang}.traineddata`, out), gunzipSync(readFileSync(nm(`@tesseract.js-data/${lang}/4.0.0_best_int/${lang}.traineddata.gz`))))
}
console.log('Tesseract copied to public/tesseract')
