// Re-encodes a downloaded video to a small copy for keeping with a recipe:
// the short side scaled to 480 px, ~450 kbit/s video and 64 kbit/s audio,
// about 4 MB per minute. It plays the video once in a hidden element and
// records it, so it takes as long as the video itself.

const TYPES = ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']

export const canShrinkVideo = () =>
  typeof MediaRecorder !== 'undefined' && !!HTMLCanvasElement.prototype.captureStream && TYPES.some((t) => MediaRecorder.isTypeSupported(t))

export async function shrinkVideo(blob, { shortSide = 480, videoBps = 450_000, audioBps = 64_000, onProgress } = {}) {
  const mimeType = TYPES.find((t) => MediaRecorder.isTypeSupported(t))
  const url = URL.createObjectURL(blob)
  const video = document.createElement('video')
  video.playsInline = true
  video.preload = 'auto'
  video.src = url
  let audioCtx = null
  try {
    await new Promise((resolve, reject) => {
      video.onloadedmetadata = resolve
      video.onerror = () => reject(new Error('This video could not be opened for shrinking.'))
    })
    const scale = Math.min(1, shortSide / Math.min(video.videoWidth, video.videoHeight))
    const even = (n) => Math.max(2, Math.round(n / 2) * 2)
    const canvas = document.createElement('canvas')
    canvas.width = even(video.videoWidth * scale)
    canvas.height = even(video.videoHeight * scale)
    const ctx = canvas.getContext('2d')

    // The sound goes into the recording only, not out of the speaker
    audioCtx = new AudioContext()
    const dest = audioCtx.createMediaStreamDestination()
    audioCtx.createMediaElementSource(video).connect(dest)
    await audioCtx.resume()

    const stream = new MediaStream([...canvas.captureStream(30).getVideoTracks(), ...dest.stream.getAudioTracks()])
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: videoBps, audioBitsPerSecond: audioBps })
    const chunks = []
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data)
    const stopped = new Promise((resolve) => (recorder.onstop = resolve))

    let done = false
    const draw = () => {
      if (done) return
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      onProgress?.(video.duration ? Math.min(1, video.currentTime / video.duration) : 0)
      if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(draw)
      else requestAnimationFrame(draw)
    }

    recorder.start(1000)
    await video.play()
    draw()
    await new Promise((resolve, reject) => {
      video.onended = resolve
      video.onerror = () => reject(new Error('Playback failed while shrinking the video.'))
    })
    done = true
    recorder.stop()
    await stopped
    const small = new Blob(chunks, { type: mimeType.split(';')[0] })
    // Keep the original if re-encoding did not help (very short or already tiny videos)
    return small.size > 0 && small.size < blob.size ? small : blob
  } finally {
    video.pause()
    video.removeAttribute('src')
    video.load()
    URL.revokeObjectURL(url)
    audioCtx?.close()
  }
}
