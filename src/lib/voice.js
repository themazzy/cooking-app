// Voice commands in cooking mode. The Android app listens with Android's own
// speech recognizer (VoiceCommandsPlugin.java); a browser that has speech
// recognition (Chrome) uses that. Both are free and need no account.
import { Capacitor, registerPlugin } from '@capacitor/core'

// What can be said: English first; Czech and Bulgarian words still count if heard
const COMMANDS = {
  next: ['next', 'next step', 'forward', 'continue', 'go on', 'další', 'dál', 'dále', 'pokračuj', 'pokračovat', 'следваща', 'следващ', 'напред', 'нататък', 'продължи', 'продължавай'],
  back: ['back', 'go back', 'previous', 'last step', 'zpět', 'zpátky', 'předchozí', 'назад', 'предишна', 'предишен', 'обратно', 'върни'],
  timer: ['timer', 'start timer', 'start the timer', 'časovač', 'minutka', 'minutku', 'stopky', 'таймер', 'пусни таймер'],
  ingredients: ['ingredients', 'ingredience', 'suroviny', 'продукти', 'съставки'],
  steps: ['steps', 'show steps', 'postup', 'kroky', 'стъпки'],
}

const words = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFC')
    .replace(/[^\p{L}\s]+/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)

/**
 * The command in a phrase that was heard ("next please" → 'next'), or null.
 * The phrase must be short, so talking about the "next day" in the kitchen
 * does not turn the page; the last command word said wins.
 */
export function voiceCommand(text) {
  const heard = words(text)
  if (!heard.length || heard.length > 4) return null
  let best = null
  for (const [command, phrases] of Object.entries(COMMANDS)) {
    for (const phrase of phrases) {
      const p = words(phrase)
      for (let i = 0; i + p.length <= heard.length; i++) {
        if (p.every((w, k) => heard[i + k] === w) && (!best || i + p.length > best.end)) best = { command, end: i + p.length }
      }
    }
  }
  return best?.command ?? null
}

const Native = registerPlugin('VoiceCommands')
const nativeVoice = Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('VoiceCommands')
const BrowserRecognition = typeof window !== 'undefined' ? (window.SpeechRecognition ?? window.webkitSpeechRecognition) : null

// Commands are said in English, whatever language the phone is set to
const LANGUAGE = 'en-US'

/** True when this phone or browser can listen for commands. */
export const canListen = nativeVoice || !!BrowserRecognition

/**
 * Listens until the returned stop() is called. `onPhrase(text)` gets each
 * phrase heard; `onStopped(message)` is called if listening stops by itself.
 * Rejects when the microphone is not allowed.
 */
export async function listen(onPhrase, onStopped = () => {}) {
  if (nativeVoice) {
    const heard = await Native.addListener('heard', ({ text, alternatives }) => {
      // The recognizer's second guess is often the short command
      const pick = (alternatives ?? []).find((a) => voiceCommand(a)) ?? text
      onPhrase(pick)
    })
    const stopped = await Native.addListener('stopped', ({ error }) => onStopped(error))
    try {
      await Native.start({ language: LANGUAGE })
    } catch (e) {
      heard.remove()
      stopped.remove()
      throw e
    }
    return () => {
      heard.remove()
      stopped.remove()
      Native.stop().catch(() => {})
    }
  }
  if (!BrowserRecognition) throw new Error('Voice commands are not available here')
  const rec = new BrowserRecognition()
  let on = true
  rec.continuous = true
  rec.lang = LANGUAGE
  rec.interimResults = false
  rec.maxAlternatives = 3
  rec.onresult = (e) => {
    const result = e.results[e.results.length - 1]
    const alts = [...result].map((r) => r.transcript)
    onPhrase(alts.find((a) => voiceCommand(a)) ?? alts[0])
  }
  rec.onerror = (e) => {
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
      on = false
      onStopped('The microphone is not allowed')
    }
  }
  // The browser stops after a while of silence; keep going until stopped
  rec.onend = () => on && rec.start()
  rec.start()
  return () => {
    on = false
    rec.stop()
  }
}
