import { seekableBlob } from './webmFix.js'

// Re-encodes a downloaded video to a small copy for keeping with a recipe.
// It plays the video once in a hidden element and records it, so it takes
// as long as the video itself.

// The phone encodes in real time, which needs far more bits than an offline
// encoder for the same detail; below about 1 Mbit/s at 480p hands, knife
// work and text in the video turn to mush.
/** With VP9: 480p about 8 MB a minute, 720p about 15 MB, 1080p about 28 MB. */
export const VIDEO_QUALITY = {
  small: { shortSide: 480, videoBps: 1_000_000, audioBps: 64_000, fps: 30 },
  hd: { shortSide: 720, videoBps: 1_900_000, audioBps: 96_000, fps: 30 },
  full: { shortSide: 1080, videoBps: 3_600_000, audioBps: 96_000, fps: 30 },
}

// WebM with VP9 and Opus gives the same picture as H.264/AAC in roughly a
// third less space; Opus at 64 kbit/s and up keeps voices and sizzling clear. MP4 is the
// fallback for WebViews that cannot record WebM.
const TYPES = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4']
const isVp9 = (t) => t.includes('vp9')

export const canShrinkVideo = () =>
  typeof MediaRecorder !== 'undefined' && !!HTMLCanvasElement.prototype.captureStream && TYPES.some((t) => MediaRecorder.isTypeSupported(t))

export async function shrinkVideo(blob, { shortSide = 480, videoBps = 450_000, audioBps = 64_000, fps = 30, mono = false, onProgress } = {}) {
  const mimeType = TYPES.find((t) => MediaRecorder.isTypeSupported(t))
  // VP8 and H.264 need about half again as much for the same picture
  if (!isVp9(mimeType)) videoBps = Math.round(videoBps * 1.5)
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
    // A source smaller than the target needs fewer bits for the same quality
    videoBps = Math.round(videoBps * Math.min(1, (canvas.width * canvas.height) / (shortSide * shortSide * (16 / 9))))
    const ctx = canvas.getContext('2d')
    ctx.imageSmoothingQuality = 'high'

    // The sound goes into the recording only, not out of the speaker
    audioCtx = new AudioContext()
    const dest = audioCtx.createMediaStreamDestination()
    if (mono) {
      dest.channelCount = 1
      dest.channelCountMode = 'explicit'
    }
    audioCtx.createMediaElementSource(video).connect(dest)
    await audioCtx.resume()

    const stream = new MediaStream([...canvas.captureStream(fps).getVideoTracks(), ...dest.stream.getAudioTracks()])
    // A keyframe every second lets the player jump anywhere without decoding
    // from the start; WebViews that do not know the option ignore it
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: videoBps, audioBitsPerSecond: audioBps, videoKeyFrameIntervalDuration: 1000 })
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
    // Recorded WebM has no length or seek index until it is rewritten
    const small = await seekableBlob(new Blob(chunks, { type: mimeType.split(';')[0] }))
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
