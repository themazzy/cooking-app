const SAMPLE_RATE = 16000 // what Whisper expects

/** Decodes a video or audio file (ArrayBuffer) into 16 kHz mono samples. */
export async function decodeToMono16k(buffer) {
  // An OfflineAudioContext at 16 kHz resamples while decoding
  const ctx = new OfflineAudioContext(1, 1, SAMPLE_RATE)
  let decoded
  try {
    decoded = await ctx.decodeAudioData(buffer)
  } catch {
    throw new Error('Could not read the audio track of this video.')
  }
  if (decoded.numberOfChannels === 1) return decoded.getChannelData(0)

  const mono = new Float32Array(decoded.length)
  for (let c = 0; c < decoded.numberOfChannels; c++) {
    const data = decoded.getChannelData(c)
    for (let i = 0; i < data.length; i++) mono[i] += data[i] / decoded.numberOfChannels
  }
  return mono
}
