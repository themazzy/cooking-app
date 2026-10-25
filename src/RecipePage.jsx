import { useEffect, useMemo, useState } from 'react'
import RecipeEditor from './RecipeEditor.jsx'
import { parseRecipeText } from './lib/ingredients.js'
import { pickRecipe } from './lib/recipeSource.js'
import { toEditable } from './lib/recipeEdit.js'
import { openExternal } from './lib/pageReader.js'
import { scaleIngredients } from './lib/scale.js'

const mb = (bytes) => `${(bytes / 1e6).toFixed(1)} MB`

/** One recipe: title, source link, portions, video, ingredients and steps, all editable. */
export default function RecipePage({ recipe, videoBlob, shrink, dirty, report, onChange, onSave, onDelete, onBack }) {
  const [copied, setCopied] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  // Portions to cook; without a known recipe size it is a multiplier (×2)
  const [cookFor, setCookFor] = useState(recipe.servings ?? 1)
  useEffect(() => {
    setCookFor(recipe.servings ?? 1)
  }, [recipe.id, recipe.servings])
  const factor = recipe.servings ? cookFor / recipe.servings : cookFor
  const scaled = factor !== 1 ? scaleIngredients(recipe.ingredients, factor) : null
  const videoSrc = useMemo(() => (videoBlob ? URL.createObjectURL(videoBlob) : null), [videoBlob])
  useEffect(() => () => videoSrc && URL.revokeObjectURL(videoSrc), [videoSrc])

  const set = (patch) => onChange({ ...recipe, ...patch })
  const raw = recipe.raw ?? {}
  const comments = raw.comments ?? []

  return (
    <>
      <div className="topbar">
        <button className="link" onClick={onBack}>
          ← Back
        </button>
        <span className="note">{recipe.id ? (dirty ? 'Unsaved changes' : 'Saved') : 'Not saved yet'}</span>
      </div>

      <section className="card recipe">
        <input className="title" aria-label="Recipe name" value={recipe.title} onChange={(e) => set({ title: e.target.value })} />
        {recipe.sourceUrl && (
          <button className="link source" onClick={() => openExternal(recipe.sourceUrl)}>
            {recipe.platform && recipe.platform !== 'web' ? `${recipe.platform} · ` : ''}
            {recipe.author ? `${recipe.author} · ` : ''}open source ↗
          </button>
        )}

        <div className="servings">
          <label>
            Recipe makes
            <input
              type="number"
              inputMode="numeric"
              min="1"
              max="99"
              value={recipe.servings ?? ''}
              placeholder="?"
              onChange={(e) => set({ servings: e.target.value ? Math.max(1, Number(e.target.value)) : null })}
            />
            portions
          </label>
        </div>
        <div className="servings">
          <span>Cook for</span>
          <div className="stepper">
            <button className="secondary" aria-label="Fewer portions" disabled={cookFor <= 1} onClick={() => setCookFor((n) => Math.max(1, n - 1))}>
              −
            </button>
            <span className="count">{recipe.servings ? cookFor : `×${cookFor}`}</span>
            <button className="secondary" aria-label="More portions" onClick={() => setCookFor((n) => Math.min(99, n + 1))}>
              +
            </button>
          </div>
          {factor !== 1 && (
            <button className="link" onClick={() => setCookFor(recipe.servings ?? 1)}>
              Reset
            </button>
          )}
        </div>
        {scaled && <p className="hint">Amounts scaled ×{String(Math.round(factor * 100) / 100).replace('.', ',')}. Go back to the recipe's own portions to edit ingredients.</p>}

        {videoSrc && (
          <div className="video">
            <video src={videoSrc} controls playsInline preload="metadata" />
            <div className="note">
              {shrink?.state === 'running'
                ? `Shrinking the video for saving… ${Math.round((shrink.pct ?? 0) * 100)} %`
                : recipe.video
                  ? `${mb(recipe.video.size)}${recipe.video.shrunk ? ` (shrunk from ${mb(recipe.video.originalSize)})` : ''}`
                  : ''}
              {shrink?.state === 'failed' ? ` · could not shrink: ${shrink.error}` : ''}
            </div>
          </div>
        )}

        <RecipeEditor
          recipe={{ ingredients: recipe.ingredients, steps: recipe.steps }}
          title={recipe.title}
          source={recipe.source}
          scaled={scaled}
          onChange={(next) => set({ ...next, source: null })}
          onReset={() => {
            const picked = pickRecipe(raw)
            set({ ...toEditable(picked), source: picked?.source ?? null })
          }}
        />

        <div className="row save-row">
          <button onClick={onSave} disabled={recipe.id && !dirty}>
            {recipe.id ? (dirty ? 'Save changes' : 'Saved') : 'Save recipe'}
          </button>
          {recipe.id &&
            (confirmDelete ? (
              <button className="danger" onClick={onDelete}>
                Really delete?
              </button>
            ) : (
              <button className="secondary" onClick={() => setConfirmDelete(true)}>
                Delete
              </button>
            ))}
        </div>
      </section>

      {(raw.description || raw.transcript || comments.length > 0) && (
        <section className="card">
          <details>
            <summary>Where the recipe came from</summary>
            {comments.length > 0 && (
              <>
                <h3>Comments ({comments.length})</h3>
                <ul className="comments">
                  {comments.map((c, n) => (
                    <li key={n}>
                      <div className="note">
                        {c.author ?? 'someone'}
                        {c.author && c.author === recipe.author ? ' · author' : ''}
                        {c.pinned ? ' · pinned' : ''}
                      </div>
                      <pre>{c.text}</pre>
                      <button className="link" onClick={() => set({ ...toEditable(parseRecipeText(c.text)), source: 'comment' })}>
                        Use as recipe
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {raw.description && (
              <>
                <h3>Description</h3>
                <pre>{raw.description}</pre>
              </>
            )}
            {raw.transcript != null && (
              <>
                <h3>Transcript</h3>
                <pre>{raw.transcript || '(no speech found)'}</pre>
              </>
            )}
            {report && (
              <div className="row">
                <button
                  className="secondary"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(report)
                      setCopied(true)
                    } catch {
                      setCopied(false)
                    }
                  }}
                >
                  {copied ? 'Copied, paste it to Claude' : 'Copy debug report'}
                </button>
              </div>
            )}
          </details>
        </section>
      )}
    </>
  )
}
