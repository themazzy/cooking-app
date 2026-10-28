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
  down: ['scroll down', 'down', 'scroll', 'go down', 'more', 'dolů', 'níž', 'posuň dolů', 'надолу', 'долу'],
  up: ['scroll up', 'up', 'go up', 'nahoru', 'výš', 'posuň nahoru', 'нагоре', 'горе'],
  read: ['read', 'read it', 'read step', 'read the step', 'read aloud', 'read out', 'repeat', 'say it again', 'přečti', 'čti', 'přečíst', 'zopakuj', 'прочети', 'чети', 'повтори'],
  quiet: ['stop reading', 'quiet', 'be quiet', 'silence', 'ticho', 'dost', 'тихо', 'спри'],
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

// Numbers said as words, for "timer ten minutes" when the recognizer writes them out
const NUMBER_WORDS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
  thirty: 30, forty: 40, fifty: 50, sixty: 60, ninety: 90,
}
const ASK = /^(?:how much|how many|what amount of|kolik|колко)\s+(.+)$/u
const TIMER_WORD = /(?:^|\s)(?:timer|časovač|minutk[au]|таймер)(?:\s|$)/u
const TIMER_LEAD = /^(?:set|start|put|add|nastav|spusť|пусни|сложи)?\s*(?:a|the)?\s*(?:timer|časovač|minutk[au]|таймер)?\s*(?:for|na|за)?\s*/u

/**
 * A question or a timer said in cooking mode: "how much garlic?" → { ask: 'garlic' },
 * "set a timer for 10 minutes" / "ten minute timer" → { timer: '10 minutes' }, or null.
 * The timer text is read by cook.js findTimers.
 */
export function voiceQuestion(text) {
  const heard = String(text ?? '').toLowerCase().normalize('NFC').replace(/[^\p{L}\d\s]+/gu, ' ').split(/\s+/).filter(Boolean)
  if (!heard.length || heard.length > 8) return null
  const said = heard.map((w) => NUMBER_WORDS[w] ?? w).join(' ')
  const ask = said.match(ASK)
  if (ask) {
    const what = ask[1].replace(/^(?:of|the|do i need|is|are|we need)\s+/u, '').replace(/\s+(?:do i need|do we need|is it|please)$/u, '').trim()
    return what ? { ask: what } : null
  }
  if (TIMER_WORD.test(said) && /\d/.test(said)) {
    return { timer: said.replace(TIMER_LEAD, '').replace(TIMER_WORD, ' ').replace(/(\d+)\s+(?:minute|min)(?=\s|$)/u, '$1 minutes').trim() }
  }
  return null
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

/** The language to read a text in, from its letters (the phone's voice for it is used). */
export function speechLanguage(text) {
  const s = String(text ?? '')
  if (/[\u0400-\u04ff]/.test(s)) return /[ыэё]/i.test(s) ? 'ru-RU' : 'bg-BG'
  if (/[\u3040-\u30ff]/.test(s)) return 'ja-JP'
  if (/[\uac00-\ud7af]/.test(s)) return 'ko-KR'
  if (/[\u4e00-\u9fff]/.test(s)) return 'zh-CN'
  if (/[ěřůťďň]/i.test(s)) return 'cs-CZ'
  if (/[ľĺŕô]/i.test(s)) return 'sk-SK'
  if (/[ąęłńśźż]/i.test(s)) return 'pl-PL'
  if (/[äöüß]/i.test(s)) return 'de-DE'
  return 'en-US'
}

const browserVoice = typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function'

/** True when this phone or browser can read text aloud. */
export const canSpeak = nativeVoice || browserVoice

// The voice picked for each language ('cs' → voice name), on this phone only
const VOICES_KEY = 'cooking-app:voices'
export function pickedVoices() {
  try {
    return JSON.parse(localStorage.getItem(VOICES_KEY) ?? '{}') ?? {}
  } catch {
    return {}
  }
}
export function pickVoice(lang, name) {
  const all = { ...pickedVoices() }
  if (name) all[lang] = name
  else delete all[lang]
  try {
    localStorage.setItem(VOICES_KEY, JSON.stringify(all))
  } catch {
    // not remembered; the phone's default voice reads
  }
  return all
}

const browserVoices = () =>
  new Promise((resolve) => {
    const synth = window.speechSynthesis
    const now = synth.getVoices()
    if (now.length) return resolve(now)
    // Chrome fills the list a moment later
    const t = setTimeout(() => resolve(synth.getVoices()), 1500)
    synth.addEventListener('voiceschanged', () => (clearTimeout(t), resolve(synth.getVoices())), { once: true })
  })

/** The voices this phone or browser can read with: { name, language ('cs-CZ'), online, installed }. */
export async function listVoices() {
  if (nativeVoice) {
    const { voices } = await Native.voices()
    return voices ?? []
  }
  if (!browserVoice) return []
  return (await browserVoices()).map((v) => ({ name: v.name, language: v.lang.replace('_', '-'), online: !v.localService, installed: true }))
}

/**
 * Reads `text` aloud, replacing whatever was being read. `onDone` is called
 * when it ends or is stopped. Returns stop(). On Android, listening for
 * commands pauses while it reads.
 */
let readCount = 0
let reading = null // the text being read now: { drop } forgets it without calling its onDone

export function speak(text, onDone = () => {}, { voice, language: lang } = {}) {
  reading?.drop()
  const language = lang ?? speechLanguage(text)
  const name = voice ?? pickedVoices()[language.slice(0, 2)]
  let over = false
  let sub = null
  const me = {
    drop: () => {
      over = true
      sub?.remove()
    },
  }
  reading = me
  const end = () => {
    if (over) return
    over = true
    sub?.remove()
    if (reading === me) reading = null
    onDone()
  }
  if (nativeVoice) {
    const id = String(++readCount)
    Native.addListener('spoken', (e) => e?.id === id && end()).then((s) => (over ? s.remove() : (sub = s)))
    Native.speak({ text, language, voice: name, id }).catch(end)
    return () => {
      if (over) return
      Native.stopSpeaking().catch(() => {})
      end()
    }
  }
  if (!browserVoice) {
    end()
    return () => {}
  }
  const synth = window.speechSynthesis
  synth.cancel()
  const u = new window.SpeechSynthesisUtterance(text)
  u.lang = language
  const v = name && synth.getVoices().find((x) => x.name === name)
  if (v) u.voice = v
  u.onend = end
  u.onerror = end
  synth.speak(u)
  return () => {
    if (over) return
    synth.cancel()
    end()
  }
}
