import { useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { fileName, pictureData, shareFile, shareText } from './lib/share.js'
import { recipePdf } from './lib/recipePdf.js'
import { toast } from './lib/toast.js'
import Icon from './Icon.jsx'

// A browser that can't hand a file to another app downloads the PDF instead
const canShareFiles = () => {
  if (Capacitor.isNativePlatform()) return true
  try {
    return !!navigator.canShare?.({ files: [new File([''], 'a.pdf', { type: 'application/pdf' })] })
  } catch {
    return false
  }
}

/**
 * Sending a recipe as it is shown (the chosen portions and units): as text,
 * or as a PDF with the photo, ingredients and steps.
 */
export default function ShareSheet({ title, meta, nutrition = null, text, pictures, ingredients, steps, note, footer, onClose }) {
  // The picture for the PDF is fetched as soon as the sheet opens (a website
  // photo has to be downloaded), so it is usually ready when PDF is tapped
  const [picture] = useState(async () => {
    // The best picture that can be drawn: the photo, else the video's frame
    for (const src of pictures) {
      const data = await pictureData(src)
      if (data) return data
    }
    return null
  })
  const [busy, setBusy] = useState(null) // 'pdf' | 'text'
  const [error, setError] = useState(null)
  const files = canShareFiles()

  const run = async (kind, fn) => {
    setBusy(kind)
    setError(null)
    try {
      const result = await fn()
      if (result === 'copied') toast('Recipe copied. Paste it where you want to send it.')
      if (result === 'downloaded') toast('PDF saved to your downloads')
      if (result !== 'cancelled') onClose()
    } catch (e) {
      setError(e?.message ?? String(e))
    } finally {
      setBusy(null)
    }
  }

  const sendText = () => run('text', () => shareText(text, title))
  const copy = () =>
    run('text', async () => {
      await navigator.clipboard.writeText(text)
      return 'copied'
    })
  const sendPdf = () =>
    run('pdf', async () => {
      const pdf = await recipePdf({ title, meta, nutrition, picture: await picture, ingredients, steps, note, footer })
      return shareFile(pdf, fileName(title, 'pdf'), title)
    })

  return (
    <div className="sheet-backdrop" onClick={busy ? undefined : onClose}>
      <div className="sheet" role="dialog" aria-label="Share recipe" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" aria-hidden="true" />
        <h2>Share recipe</h2>
        {meta && <p className="hint top">{meta}. Change the portions or units on the recipe first if you want them different.</p>}
        <div className="share-options">
          <button className="share-option" disabled={!!busy} onClick={sendPdf}>
            <Icon name="file" />
            <span>
              <strong>{busy === 'pdf' ? 'Making the PDF…' : files ? 'Send as PDF' : 'Download PDF'}</strong>
              <span className="note">Photo, ingredients and steps on A4 pages</span>
            </span>
          </button>
          <button className="share-option" disabled={!!busy} onClick={sendText}>
            <Icon name="share" />
            <span>
              <strong>Send as text</strong>
              <span className="note">For a message: Viber, Messenger, WhatsApp, e-mail</span>
            </span>
          </button>
          <button className="share-option" disabled={!!busy} onClick={copy}>
            <Icon name="copy" />
            <span>
              <strong>Copy text</strong>
              <span className="note">To paste anywhere</span>
            </span>
          </button>
        </div>
        {error && <p className="hint error">{error}</p>}
        <div className="sheet-actions">
          <button className="secondary" disabled={!!busy} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
