import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react()],
  define: {
    __BUILD__: JSON.stringify(process.env.GITHUB_SHA?.slice(0, 7) ?? 'dev'),
  },
  worker: { format: 'es' },
  // transformers.js ships its own wasm loader; pre-bundling it breaks the worker
  optimizeDeps: { exclude: ['@huggingface/transformers'] },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{js,jsx}'],
  },
})
