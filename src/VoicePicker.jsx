import { useEffect, useState } from 'react'
import { listVoices, pickVoice, pickedVoices, speak } from './lib/voice.js'
import Icon from './Icon.jsx'
import Select from './Select.jsx'

// The languages read-aloud tells apart (speechLanguage), the first three always shown
const LANGS = [
  ['en', 'English', 'Chop the onion and fry it until golden.'],
  ['cs', 'Czech', 'Nakrájejte cibuli a osmahněte ji dozlatova.'],
  ['bg', 'Bulgarian', 'Нарежете лука и го запържете до златисто.'],
  ['sk', 'Slovak', 'Nakrájajte cibuľu a opražte ju dozlata.'],
  ['de', 'German', 'Die Zwiebel hacken und goldbraun braten.'],
  ['pl', 'Polish', 'Pokrój cebulę i podsmaż ją na złoto.'],
  ['ru', 'Russian', 'Нарежьте лук и обжарьте до золотистого цвета.'],
  ['ja', 'Japanese', '玉ねぎを切って、きつね色になるまで炒めます。'],
  ['zh', 'Chinese', '把洋葱切碎，炒至金黄。'],
  ['ko', 'Korean', '양파를 썰어 노릇해질 때까지 볶으세요.'],
]
const MAIN = 3

let regions = null
const regionName = (code) => {
  try {
    regions ??= new Intl.DisplayNames(['en'], { type: 'region' })
    return regions.of(code)
  } catch {
    return code
  }
}

/** Android names voices like "cs-cz-x-jfs-local"; those get a plain label, browser voices keep their own name. */
export function voiceLabels(voices) {
  const count = {}
  return voices.map((v) => {
    const region = v.language.split('-')[1]?.toUpperCase()
    let label
    if (/^[a-z]{2,3}[-_][a-z]{2,3}[-_]x[-_]|-language$/i.test(v.name)) {
      const where = region ? regionName(region) : ''
      count[where] = (count[where] ?? 0) + 1
      label = [where, `voice ${count[where]}`].filter(Boolean).join(', ')
    } else label = v.name
    if (v.online) label += ' · online'
    if (!v.installed) label += ' · needs download'
    return { ...v, label }
  })
}

/** Settings: which of the phone's voices reads steps aloud, per language. Saved on this phone only. */
export default function VoicePicker() {
  const [voices, setVoices] = useState(null) // null while loading
  const [picked, setPicked] = useState(pickedVoices)
  const [more, setMore] = useState(false)

  useEffect(() => {
    let on = true
    listVoices()
      .then((v) => on && setVoices(v))
      .catch(() => on && setVoices([]))
    return () => void (on = false)
  }, [])

  if (voices == null) return <p className="hint">Looking for the phone's voices…</p>
  if (!voices.length) return <p className="hint">This phone has no text-to-speech voices. Install one (e.g. Speech Recognition &amp; Synthesis from Google) in the phone's settings.</p>

  const rows = LANGS.map(([code, name, sample]) => {
    const mine = voices
      .filter((v) => v.language.toLowerCase().startsWith(code))
      .sort((a, b) => b.installed - a.installed || a.online - b.online || a.language.localeCompare(b.language) || a.name.localeCompare(b.name))
    return { code, name, sample, voices: voiceLabels(mine) }
  }).filter((r) => r.voices.length)
  const shown = more ? rows : rows.filter((r) => LANGS.findIndex(([c]) => c === r.code) < MAIN)

  return (
    <div className="settings">
      {shown.map((r) => (
        <div key={r.code} className="voice-row">
          <label>
            {r.name}{' '}
            <Select aria-label={`${r.name} voice`} value={picked[r.code] ?? ''} onChange={(e) => setPicked(pickVoice(r.code, e.target.value))}>
              <option value="">Phone's default</option>
              {r.voices.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.label}
                </option>
              ))}
            </Select>
          </label>
          <button className="secondary" aria-label={`Try the ${r.name} voice`} onClick={() => speak(r.sample, undefined, { voice: picked[r.code], language: r.voices[0].language })}>
            <Icon name="speak" /> Try
          </button>
        </div>
      ))}
      {rows.length > shown.length && (
        <button className="link" onClick={() => setMore(true)}>
          More languages ({rows.length - shown.length})
        </button>
      )}
    </div>
  )
}
