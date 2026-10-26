// Timer alarm sounds, made with Web Audio so the app carries no sound files.

export const ALARM_SOUNDS = {
  beep: 'Beep',
  chime: 'Chime',
  bell: 'Kitchen bell',
  digital: 'Digital watch',
  marimba: 'Marimba',
  none: 'No sound',
}

let ctx = null

/** The shared audio context. Call it from a tap first, so the phone lets it play later. */
export function audio() {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  } catch {
    ctx = null
  }
  return ctx
}

// One note: a wave at a pitch that fades out over `length` seconds
function note(ac, { at, freq, length, type = 'sine', volume = 0.25, attack = 0.005 }) {
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0, at)
  gain.gain.linearRampToValueAtTime(volume, at + attack)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length)
  osc.connect(gain).connect(ac.destination)
  osc.start(at)
  osc.stop(at + length + 0.05)
}

const PATTERNS = {
  beep: (ac, t) => {
    for (let n = 0; n < 3; n++) note(ac, { at: t + n * 0.4, freq: 880, length: 0.25, type: 'square', volume: 0.12 })
  },
  chime: (ac, t) => {
    note(ac, { at: t, freq: 1319, length: 1.2 })
    note(ac, { at: t + 0.35, freq: 1047, length: 1.6 })
  },
  bell: (ac, t) => {
    // A bell's overtones are not whole multiples, which is what makes it ring
    for (const [ratio, volume] of [[1, 0.22], [2.76, 0.1], [5.4, 0.06], [8.93, 0.03]]) note(ac, { at: t, freq: 620 * ratio, length: 2.2, volume, attack: 0.002 })
  },
  digital: (ac, t) => {
    for (let n = 0; n < 4; n++) note(ac, { at: t + n * 0.12 + (n > 1 ? 0.2 : 0), freq: 2093, length: 0.07, type: 'square', volume: 0.08, attack: 0.001 })
  },
  marimba: (ac, t) => {
    ;[523, 659, 784, 1047].forEach((freq, n) => note(ac, { at: t + n * 0.14, freq, length: 0.5, type: 'triangle', volume: 0.3 }))
  },
}

/** Plays one round of an alarm sound and buzzes the phone if asked. */
export function ring({ sound = 'beep', vibrate = true } = {}) {
  const play = PATTERNS[sound]
  if (play) {
    const ac = audio()
    if (ac) play(ac, ac.currentTime + 0.02)
  }
  if (vibrate) navigator.vibrate?.([400, 150, 400, 150, 400])
}
