// Timer alarm sounds. In the browser they are played with Web Audio; the
// Android app rings with the same sounds, rendered to small WAV files by
// scripts/make-alarm-sounds.mjs, from a notification that works with the
// phone locked or another app open (TimerAlarmPlugin.java).
import { Capacitor, registerPlugin } from '@capacitor/core'

export const ALARM_SOUNDS = {
  beep: 'Beep',
  chime: 'Chime',
  bell: 'Kitchen bell',
  digital: 'Digital watch',
  marimba: 'Marimba',
  none: 'No sound',
}

/** Each sound as notes: { at, freq, length (s), type, volume, attack }. One round lasts about two seconds. */
export const ALARM_NOTES = {
  beep: [0, 0.4, 0.8].map((at) => ({ at, freq: 880, length: 0.25, type: 'square', volume: 0.12 })),
  chime: [
    { at: 0, freq: 1319, length: 1.2 },
    { at: 0.35, freq: 1047, length: 1.6 },
  ],
  // A bell's overtones are not whole multiples, which is what makes it ring
  bell: [
    [1, 0.22],
    [2.76, 0.1],
    [5.4, 0.06],
    [8.93, 0.03],
  ].map(([ratio, volume]) => ({ at: 0, freq: 620 * ratio, length: 2.2, volume, attack: 0.002 })),
  digital: [0, 0.12, 0.44, 0.56].map((at) => ({ at, freq: 2093, length: 0.07, type: 'square', volume: 0.08, attack: 0.001 })),
  marimba: [523, 659, 784, 1047].map((freq, n) => ({ at: n * 0.14, freq, length: 0.5, type: 'triangle', volume: 0.3 })),
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

function play(ac, notes, start) {
  for (const { at, freq, length, type = 'sine', volume = 0.25, attack = 0.005 } of notes) {
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = type
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0, start + at)
    gain.gain.linearRampToValueAtTime(volume, start + at + attack)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + at + length)
    osc.connect(gain).connect(ac.destination)
    osc.start(start + at)
    osc.stop(start + at + length + 0.05)
  }
}

/** Plays one round of an alarm sound and buzzes the phone if asked. */
export function ring({ sound = 'beep', vibrate = true } = {}) {
  const notes = ALARM_NOTES[sound]
  if (notes) {
    const ac = audio()
    if (ac) play(ac, notes, ac.currentTime + 0.02)
  }
  if (vibrate) navigator.vibrate?.([400, 150, 400, 150, 400])
}

// The Android app's alarms

const TimerAlarm = registerPlugin('TimerAlarm')

/** True in the Android app, where Android rings timers itself, even with the app closed. */
export const nativeAlarms = Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('TimerAlarm')

// Android wants a whole number for each alarm
const alarmId = (id) => {
  let h = 0
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) | 0
  return Math.abs(h) || 1
}

/** Asks once for permission to show notifications (Android 13 and newer). */
export async function allowAlarms() {
  if (!nativeAlarms) return true
  try {
    const { notifications } = await TimerAlarm.requestPermissions()
    return notifications === 'granted'
  } catch {
    return false
  }
}

/** Has Android ring at `at` (ms), replacing an earlier alarm for the same timer. */
export function scheduleAlarm(id, at, { title, text, sound = 'beep', vibrate = true }) {
  if (!nativeAlarms) return
  TimerAlarm.schedule({ id: alarmId(id), at: Math.round(at), title, text, sound, vibrate }).catch((e) => console.warn('Alarm not set', e))
}

/** Stops a timer's alarm, whether it is still waiting or already ringing. */
export function cancelAlarm(id) {
  if (!nativeAlarms) return
  TimerAlarm.cancel({ id: alarmId(id) }).catch(() => {})
}
