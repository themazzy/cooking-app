import { Fragment, useEffect, useMemo, useState } from 'react'
import RecipeEditor from './RecipeEditor.jsx'
import CookMode from './CookMode.jsx'
import ShopSheet from './ShopSheet.jsx'
import { IngredientIcon, useCatalog } from './catalog.jsx'
import { parseRecipeText } from './lib/ingredients.js'
import { pickRecipe } from './lib/recipeSource.js'
import { recipeToText, toEditable } from './lib/recipeEdit.js'
import { openExternal } from './lib/pageReader.js'
import { scaleIngredients } from './lib/scale.js'
import { splitSteps } from './lib/cook.js'

const mb = (bytes) => `${(bytes / 1e6).toFixed(1)} MB`
const amount = (i) => [i.qty, i.unit].filter((x) => String(x ?? '').trim()).join(' ')
const PLATFORM = { instagram: 'Instagram', tiktok: 'TikTok', facebook: 'Facebook', youtube: 'YouTube', web: 'Website', pasted: 'Pasted text', file: 'Video file' }
const hostOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

/**
 * One recipe. Saved recipes open for reading and cooking; Edit (or a new
 * import) shows the editable form with Save.
 */
export default function RecipePage({ recipe, videoBlob, shrink, dirty, report, pantry = [], onChange, onSave, onDelete, onDiscard, onBack, onAddToList }) {
  const { match, canonical } = useCatalog()
  const [edit, setEdit] = useState(!recipe.id)
  const [copied, setCopied] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [cooking, setCooking] = useState(false)
  const [shopping, setShopping] = useState(false)
  const [added, setAdded] = useState(false)
  // Portions to cook; without a known recipe size it is a multiplier (×2)
  const [cookFor, setCookFor] = useState(recipe.servings ?? 1)
  useEffect(() => {
    setCookFor(recipe.servings ?? 1)
  }, [recipe.id, recipe.servings])
  useEffect(() => {
    if (!recipe.id) setEdit(true)
  }, [recipe.id])
  const factor = recipe.servings ? cookFor / recipe.servings : cookFor
  const shown = factor !== 1 ? scaleIngredients(recipe.ingredients, factor) : recipe.ingredients
  const videoSrc = useMemo(() => (videoBlob ? URL.createObjectURL(videoBlob) : null), [videoBlob])
  useEffect(() => () => videoSrc && URL.revokeObjectURL(videoSrc), [videoSrc])

  const set = (patch) => onChange({ ...recipe, ...patch })
  const raw = recipe.raw ?? {}
  const comments = raw.comments ?? []
  const steps = splitSteps(recipe.steps)
  const atHome = new Set(pantry.map((p) => canonical(p.name)))
  const ingredientCount = recipe.ingredients.filter((i) => i.name?.trim()).length
  const sourceLabel = [PLATFORM[recipe.platform] && recipe.platform !== 'web' ? PLATFORM[recipe.platform] : hostOf(recipe.sourceUrl), recipe.author]
    .filter(Boolean)
    .join(' · ')

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const video = videoSrc ? (
    <div className="video">
      <video src={videoSrc} controls playsInline preload="metadata" poster={recipe.thumb ?? undefined} />
      {(shrink || edit) && (
        <div className="note">
          {shrink?.state === 'running'
            ? `Shrinking the video for saving… ${Math.round((shrink.pct ?? 0) * 100)} %`
            : recipe.video
              ? `${mb(recipe.video.size)}${recipe.video.shrunk ? ` (shrunk from ${mb(recipe.video.originalSize)})` : ''}`
              : ''}
          {shrink?.state === 'failed' ? ` · could not shrink: ${shrink.error}` : ''}
        </div>
      )}
    </div>
  ) : recipe.thumb ? (
    <img className="hero" src={recipe.thumb} alt="" />
  ) : null

  const sources = (raw.description || raw.transcript || comments.length > 0) && (
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
                  <button
                    className="link"
                    onClick={() => {
                      set({ ...toEditable(parseRecipeText(c.text)), source: 'comment' })
                      setEdit(true)
                    }}
                  >
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
            <button className="secondary" onClick={() => copyText(report)}>
              {copied ? 'Copied, paste it to Claude' : 'Copy debug report'}
            </button>
          </div>
        )}
      </details>
    </section>
  )

  if (edit) {
    return (
      <>
        <div className="topbar">
          <button className="link" onClick={onBack}>
            ← Back
          </button>
          <span className="note">{recipe.id ? (dirty ? 'Unsaved changes' : 'Saved') : 'Not saved yet'}</span>
        </div>

        <section className="card recipe">
          <input className="title" aria-label="Recipe name" placeholder="Recipe name" value={recipe.title} onChange={(e) => set({ title: e.target.value })} />
          {recipe.sourceUrl && (
            <button className="link source" onClick={() => openExternal(recipe.sourceUrl)}>
              {sourceLabel || 'Source'} ↗
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
          {video}
          <RecipeEditor
            recipe={{ ingredients: recipe.ingredients, steps: recipe.steps }}
            source={recipe.source}
            onChange={(next) => set({ ...next, source: null })}
            onReset={() => {
              const picked = pickRecipe(raw)
              set({ ...toEditable(picked), source: picked?.source ?? null })
            }}
          />
        </section>

        {sources}

        <div className="save-bar">
          {recipe.id ? (
            confirmDelete ? (
              <button className="danger" onClick={onDelete}>
                Really delete?
              </button>
            ) : (
              <button className="secondary" onClick={() => setConfirmDelete(true)}>
                Delete
              </button>
            )
          ) : (
            <button className="secondary" onClick={onDiscard}>
              Discard
            </button>
          )}
          {recipe.id && (
            <button
              className="secondary"
              onClick={() => {
                if (dirty) onDiscard()
                setEdit(false)
              }}
            >
              {dirty ? 'Cancel' : 'Done'}
            </button>
          )}
          <button
            disabled={recipe.id && !dirty}
            onClick={async () => {
              await onSave()
              setEdit(false)
            }}
          >
            {recipe.id ? 'Save changes' : 'Save recipe'}
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="topbar">
        <button className="link" onClick={onBack}>
          ← Recipes
        </button>
        <button className="small secondary" onClick={() => setEdit(true)}>
          Edit
        </button>
      </div>

      {video}

      <header className="recipe-head">
        <h1>{recipe.title || 'Untitled recipe'}</h1>
        <div className="meta">
          {recipe.sourceUrl ? (
            <button className="meta-chip" onClick={() => openExternal(recipe.sourceUrl)}>
              {sourceLabel || 'Source'} ↗
            </button>
          ) : (
            PLATFORM[recipe.platform] && <span className="meta-chip plain">{PLATFORM[recipe.platform]}</span>
          )}
          {recipe.servings && <span className="meta-chip plain">{recipe.servings} portions</span>}
          <span className="meta-chip plain">{ingredientCount} ingredients</span>
          {steps.length > 0 && <span className="meta-chip plain">{steps.length} steps</span>}
        </div>
        <div className="recipe-actions">
          <button className="big" disabled={!steps.length} onClick={() => setCooking(true)}>
            ▶ Start cooking
          </button>
          <button className="big secondary" disabled={!ingredientCount} onClick={() => setShopping(true)}>
            {added ? '✓ On the list' : '🛒 Add to list'}
          </button>
        </div>
      </header>

      <section className="card">
        <div className="section-head">
          <h2>Ingredients</h2>
          <div className="stepper">
            <button className="secondary round" aria-label="Fewer portions" disabled={cookFor <= 1} onClick={() => setCookFor((n) => Math.max(1, n - 1))}>
              −
            </button>
            <span className="count">
              {recipe.servings ? cookFor : `×${cookFor}`}
              <span className="count-label">{recipe.servings ? (cookFor === 1 ? 'portion' : 'portions') : 'recipe'}</span>
            </span>
            <button className="secondary round" aria-label="More portions" onClick={() => setCookFor((n) => Math.min(99, n + 1))}>
              +
            </button>
          </div>
        </div>
        {ingredientCount === 0 ? (
          <p className="hint">No ingredients yet. Add them with Edit.</p>
        ) : (
          <ul className="ingredient-list">
            {shown.map((i, n) =>
              i.name?.trim() ? (
                <Fragment key={n}>
                  {i.group && i.group !== shown[n - 1]?.group && <li className="group-title">{i.group}</li>}
                  <li>
                    <IngredientIcon entry={match(i.name)} size={36} />
                    <span className="ing-name">
                      {i.name}
                      {atHome.has(canonical(i.name)) && <span className="badge">at home</span>}
                    </span>
                    <span className="ing-qty">{amount(i)}</span>
                  </li>
                </Fragment>
              ) : null,
            )}
          </ul>
        )}
      </section>

      <section className="card">
        <h2>Steps</h2>
        {steps.length === 0 ? (
          <p className="hint">No steps yet. Add them with Edit.</p>
        ) : (
          <ol className="steps">
            {steps.map((s, n) => (
              <li key={n}>
                <span className="step-num" aria-hidden="true">
                  {n + 1}
                </span>
                <p>{s}</p>
              </li>
            ))}
          </ol>
        )}
        <div className="row">
          <button className="secondary" onClick={() => copyText(recipeToText({ ingredients: shown, steps: recipe.steps }, recipe.title))}>
            {copied ? 'Copied' : 'Copy recipe'}
          </button>
        </div>
      </section>

      {sources}

      {cooking && <CookMode title={recipe.title} ingredients={shown} steps={recipe.steps} onClose={() => setCooking(false)} />}
      {shopping && (
        <ShopSheet
          recipe={recipe}
          portions={cookFor}
          pantry={pantry}
          onClose={() => setShopping(false)}
          onAdd={(entry) => {
            onAddToList(entry)
            setShopping(false)
            setAdded(true)
          }}
        />
      )}
    </>
  )
}
