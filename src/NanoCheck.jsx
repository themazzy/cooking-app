import { useEffect, useState } from 'react'
import { nanoStatus, nanoUnavailableReason, tryNano } from './lib/translate.js'

const LABELS = {
  available: 'ready on this phone',
  downloading: 'downloading its model (check again later)',
  downloadable: 'model download started (check again later)',
  unavailable: 'not on this phone, Google Translate is used',
}

/** Settings line: whether this phone translates with Gemini Nano, and a quick test of it. */
export default function NanoCheck() {
  const [status, setStatus] = useState(null)
  const [test, setTest] = useState(null) // null, 'busy', { text, ms } or { error }

  useEffect(() => {
    let live = true
    nanoStatus().then((s) => live && setStatus(s))
    return () => {
      live = false
    }
  }, [])

  const run = async () => {
    setTest('busy')
    try {
      setTest(await tryNano())
    } catch (err) {
      setTest({ error: err?.message ?? String(err) })
    }
  }

  const reason = status === 'unavailable' ? nanoUnavailableReason() : null
  return (
    <div className="hint">
      Gemini Nano: {status ? LABELS[status] ?? status : 'checking…'}
      {reason && <> ({reason})</>}
      {status === 'available' && (
        <>
          {' · '}
          <button className="link" disabled={test === 'busy'} onClick={run}>
            {test === 'busy' ? 'Translating…' : 'Try it'}
          </button>
        </>
      )}
      {test?.text && (
        <div>
          “Hladká mouka, 2 lžíce másla” → “{test.text}” in {(test.ms / 1000).toFixed(1)} s
        </div>
      )}
      {test?.error && <div>Gemini Nano failed: {test.error}</div>}
    </div>
  )
}
