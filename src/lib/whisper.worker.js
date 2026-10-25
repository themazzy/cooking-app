import { env, pipeline } from '@huggingface/transformers'

// Models are downloaded from Hugging Face on first use, then served from the
// browser cache, so later transcriptions work offline.
env.allowLocalModels = false
// The Android WebView isn't cross-origin isolated, so wasm runs single-threaded
env.backends.onnx.wasm.numThreads = 1

let current = { key: null, asr: null }

async function load(model, onProgress) {
  const hasWebGpu = typeof navigator !== 'undefined' && 'gpu' in navigator && (await navigator.gpu.requestAdapter().catch(() => null))
  const attempts = hasWebGpu
    ? [{ device: 'webgpu', dtype: { encoder_model: 'fp32', decoder_model_merged: 'q4' } }, { device: 'wasm', dtype: 'q8' }]
    : [{ device: 'wasm', dtype: 'q8' }]

  let lastError
  for (const opts of attempts) {
    const key = `${model}|${opts.device}`
    if (current.key === key) return current.asr
    try {
      const asr = await pipeline('automatic-speech-recognition', model, { ...opts, progress_callback: onProgress })
      current = { key, asr }
      return asr
    } catch (err) {
      lastError = err
    }
  }
  throw lastError
}

self.onmessage = async ({ data }) => {
  const { id, audio, model, language } = data
  try {
    let asr
    try {
      asr = await load(model, (p) => self.postMessage({ id, type: 'progress', progress: p }))
    } catch (err) {
      throw new Error(`Could not load the speech model. The first use needs internet to download it. (${err?.message ?? err})`)
    }
    self.postMessage({ id, type: 'status', status: 'transcribing' })
    const out = await asr(audio, {
      chunk_length_s: 30,
      stride_length_s: 5,
      task: 'transcribe',
      ...(language && language !== 'auto' ? { language } : {}),
    })
    self.postMessage({ id, type: 'done', text: (out.text ?? '').trim() })
  } catch (err) {
    self.postMessage({ id, type: 'error', error: String(err?.message ?? err) })
  }
}
