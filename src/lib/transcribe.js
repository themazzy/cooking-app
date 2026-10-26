export const MODELS = {
  base: { id: 'onnx-community/whisper-base', label: 'Base (faster, ~80 MB)' },
  small: { id: 'onnx-community/whisper-small', label: 'Small (better Czech and Bulgarian, ~250 MB)' },
}

let worker
let nextId = 0
const pending = new Map()

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('./whisper.worker.js', import.meta.url), { type: 'module' })
    worker.onmessage = ({ data }) => {
      const job = pending.get(data.id)
      if (!job) return
      if (data.type === 'progress') job.onProgress?.(data.progress)
      else if (data.type === 'status') job.onStatus?.(data.status)
      else {
        pending.delete(data.id)
        data.type === 'done' ? job.resolve(data.text) : job.reject(new Error(data.error))
      }
    }
  }
  return worker
}

/**
 * Transcribes 16 kHz mono samples on the device.
 * onProgress receives Transformers.js download events ({ status, file, progress }).
 */
export function transcribe(audio, { model = 'base', language = 'auto', onProgress, onStatus } = {}) {
  const id = nextId++
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject, onProgress, onStatus })
    // Copy so the buffer can be transferred; AudioBuffer channel data can't be
    const samples = new Float32Array(audio)
    getWorker().postMessage({ id, audio: samples, model: MODELS[model].id, language }, [samples.buffer])
  })
}
