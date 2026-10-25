import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react()],
  worker: { format: 'es' },
  // transformers.js ships its own wasm loader; pre-bundling it breaks the worker
  optimizeDeps: { exclude: ['@huggingface/transformers'] },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{js,jsx}'],
  },
})
