import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Transformers.js loads the speech runtime (onnxruntime-web's wasm, 27 MB)
// from jsDelivr on first use and keeps it in the browser cache, as it does
// the Whisper model. The copy Vite would bundle is only a fallback that is
// never used, so it is left out of the app (about 7 MB off the APK).
const dropBundledOrtWasm = {
  name: 'drop-bundled-ort-wasm',
  apply: 'build',
  generateBundle(_, bundle) {
    for (const name of Object.keys(bundle)) if (/ort-wasm[^/]*\.wasm$/.test(name)) delete bundle[name]
  },
}

export default defineConfig({
  base: './',
  plugins: [react(), dropBundledOrtWasm],
  define: {
    __BUILD__: JSON.stringify(process.env.GITHUB_SHA?.slice(0, 7) ?? 'dev'),
  },
  worker: { format: 'es', plugins: () => [dropBundledOrtWasm] },
  // transformers.js ships its own wasm loader; pre-bundling it breaks the worker
  optimizeDeps: { exclude: ['@huggingface/transformers'] },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{js,jsx}'],
  },
})
