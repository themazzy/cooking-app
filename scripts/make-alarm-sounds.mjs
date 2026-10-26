// Renders the timer alarm sounds (src/lib/alarm.js) to small OGG files for
// the Android app, which rings them from a notification. Needs ffmpeg; run it
// again after changing ALARM_NOTES:  node scripts/make-alarm-sounds.mjs
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ALARM_NOTES } from '../src/lib/alarm.js'

const RATE = 32000
const ROUND = 2.5 // seconds; Android repeats the file until the alarm is stopped
const OUT = 'android/app/src/main/res/raw'

// Waves made of their harmonics below half the sample rate, so they sound like Web Audio's
const wave = (type, freq, t) => {
  if (type === 'sine') return Math.sin(2 * Math.PI * freq * t)
  let v = 0
  for (let k = 1; k * freq < RATE / 2; k += 2) {
    if (type === 'square') v += Math.sin(2 * Math.PI * k * freq * t) / k
    else v += ((k % 4 === 1 ? 1 : -1) * Math.sin(2 * Math.PI * k * freq * t)) / (k * k) // triangle
  }
  return type === 'square' ? (4 / Math.PI) * v : (8 / Math.PI ** 2) * v
}

function render(notes) {
  const out = new Float32Array(Math.round(ROUND * RATE))
  for (const { at, freq, length, type = 'sine', volume = 0.25, attack = 0.005 } of notes) {
    const from = Math.round(at * RATE)
    for (let i = 0; i < length * RATE && from + i < out.length; i++) {
      const t = i / RATE
      // Rises over `attack`, then falls exponentially to 0.0001 at `length`, as in Web Audio
      const env = t < attack ? (volume * t) / attack : volume * Math.pow(0.0001 / volume, (t - attack) / (length - attack))
      out[from + i] += env * wave(type, freq, t)
    }
  }
  // Louder than in the browser: an alarm has to be heard across the kitchen
  const peak = Math.max(...out.map(Math.abs)) || 1
  return out.map((v) => (v / peak) * 0.9)
}

function wav(samples) {
  const buf = Buffer.alloc(44 + samples.length * 2)
  buf.write('RIFF', 0)
  buf.writeUInt32LE(36 + samples.length * 2, 4)
  buf.write('WAVEfmt ', 8)
  buf.writeUInt32LE(16, 16)
  buf.writeUInt16LE(1, 20)
  buf.writeUInt16LE(1, 22)
  buf.writeUInt32LE(RATE, 24)
  buf.writeUInt32LE(RATE * 2, 28)
  buf.writeUInt16LE(2, 32)
  buf.writeUInt16LE(16, 34)
  buf.write('data', 36)
  buf.writeUInt32LE(samples.length * 2, 40)
  samples.forEach((v, i) => buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), 44 + i * 2))
  return buf
}

const dir = mkdtempSync(join(tmpdir(), 'alarm-'))
for (const [name, notes] of Object.entries(ALARM_NOTES)) {
  const tmp = join(dir, `${name}.wav`)
  writeFileSync(tmp, wav(render(notes)))
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp, '-c:a', 'libvorbis', '-q:a', '4', join(OUT, `alarm_${name}.ogg`)])
  console.log(`alarm_${name}.ogg`)
}
