import { Fragment, useEffect, useState } from 'react'
import RecipeEditor from './RecipeEditor.jsx'
import RecipeTags from './RecipeTags.jsx'
import Stars from './Stars.jsx'
import CookedLog from './CookedLog.jsx'
import { addCooked, cookedAgo, lastCooked } from './lib/history.js'
import CookMode from './CookMode.jsx'
import ShopSheet from './ShopSheet.jsx'
import VideoPlayer from './VideoPlayer.jsx'
import { IngredientIcon, useCatalog } from './catalog.jsx'
import { parseRecipeText } from './lib/ingredients.js'
import { pickRecipe } from './lib/recipeSource.js'
import { recipeToText, toEditable } from './lib/recipeEdit.js'
import { openExternal } from './lib/pageReader.js'
import { scaleIngredients, scaleSteps } from './lib/scale.js'
import { seekableBlob } from './lib/webmFix.js'
import { recipePhoto } from './lib/thumb.js'
import { splitSteps } from './lib/cook.js'
import { isOut, planCooking } from './lib/stock.js'
import { convertIngredients, convertTemperatures, hasUnits } from './lib/units.js'
import { formatMinutes, totalMinutes } from './lib/recipeMeta.js'
import { languageName, swapOriginal, translateRecipe } from './lib/translate.js'

const mb = (bytes) => `${(bytes / 1e6).toFixed(1)} MB`
const amount = (i) => [i.qty, i.unit].filter((x) => String(x ?? '').trim()).join(' ')
const PLATFORM = { instagram: 'Instagram', tiktok: 'TikTok', facebook: 'Facebook', youtube: 'YouTube', web: 'Website', photo: 'Photo', pasted: 'Pasted text', file: 'Video file' }
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
export default function RecipePage({ recipe, videoBlob, shrink, dirty, report, pantry = [], onChange, onSave, onSavePatch, onDelete, onDiscard, onBack, onAddToList, onUseStock, units = 'original', onUnits, translateTo = null, categories = [], cuisines = [] }) {
  const { match, canonical } = useCatalog()
  const [edit, setEdit] = useState(!recipe.id)
  const [copied, setCopied] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [cooking, setCooking] = useState(false)
  const [shopping, setShopping] = useState(false)
  const [added, setAdded] = useState(false)
  const [photoNote, setPhotoNote] = useState(null)
  const [imageBroken, setImageBroken] = useState(false)
  useEffect(() => setImageBroken(false), [recipe.image])
  // Portions to cook; without a known recipe size it is a multiplier (×2)
  const [cookFor, setCookFor] = useState(recipe.servings ?? 1)
  useEffect(() => {
    setCookFor(recipe.servings ?? 1)
  }, [recipe.id, recipe.servings])
  useEffect(() => {
    if (!recipe.id) setEdit(true)
  }, [recipe.id])
  const factor = recipe.servings ? cookFor / recipe.servings : cookFor
  const scaled = factor !== 1 ? scaleIngredients(recipe.ingredients, factor) : recipe.ingredients
  // Metric or US amounts for reading and cooking; stock maths uses `scaled`
  const shown = convertIngredients(scaled, units)
  const stepsText = convertTemperatures(scaleSteps(recipe.steps, factor, recipe.ingredients), units)
  const convertible = hasUnits(recipe.ingredients, 'metric') || hasUnits(recipe.ingredients, 'imperial') || /\d\s*°/.test(recipe.steps)
  // Copies saved before the seek fix get their length and seek index added on the fly
  const [videoSrc, setVideoSrc] = useState(null)
  useEffect(() => {
    if (!videoBlob) return setVideoSrc(null)
    let url = null
    let live = true
    seekableBlob(videoBlob).then((blob) => {
      if (!live) return
      url = URL.createObjectURL(blob)
      setVideoSrc(url)
    })
    return () => {
      live = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [videoBlob])

  const set = (patch) => onChange({ ...recipe, ...patch })
  const raw = recipe.raw ?? {}
  const comments = raw.comments ?? []
  const steps = splitSteps(stepsText)
  const atHome = new Set(pantry.filter((p) => !isOut(p)).map((p) => canonical(p.name)))
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

  // A photo the cook added wins; then the video (with the photo as its cover); then the website's picture
  // Translation: switch to the original text and back, or translate an older recipe
  const [translating, setTranslating] = useState(null) // null, 'busy' or a message
  const changeText = (r) => {
    const patch = { title: r.title, ingredients: r.ingredients, steps: r.steps, lang: r.lang, original: r.original }
    return edit || !recipe.id ? set(patch) : onSavePatch(patch)
  }
  const translate = async () => {
    setTranslating('busy')
    try {
      const t = await translateRecipe(recipe, translateTo, { onStep: () => {} })
      if (t) changeText(t)
      setTranslating(t ? null : `This recipe already looks like ${languageName(translateTo)}.`)
    } catch (err) {
      setTranslating(err?.message ?? String(err))
    }
  }
  const languageBar = recipe.original ? (
    <div className="language-bar">
      🌐 In {languageName(recipe.lang)} ·{' '}
      <button className="link" onClick={() => changeText(swapOriginal(recipe))}>
        Show in {languageName(recipe.original.lang)}
      </button>
    </div>
  ) : translateTo ? (
    <div className="language-bar">
      <button className="link" disabled={translating === 'busy'} onClick={translate}>
        🌐 {translating === 'busy' ? 'Translating…' : `Translate to ${languageName(translateTo)}`}
      </button>
      {translating && translating !== 'busy' && <span className="note"> {translating}</span>}
    </div>
  ) : null

  const setPhoto = (photo) => (edit || !recipe.id ? set({ photo }) : onSavePatch({ photo }))
  const pickPhoto = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setPhotoNote('Preparing the photo…')
    try {
      setPhoto(await recipePhoto(file))
      setPhotoNote(null)
    } catch {
      setPhotoNote('This picture could not be opened. Try a JPEG or PNG.')
    }
  }
  const photoButtons = (
    <div className="row photo-actions">
      <label className="button secondary small">
        📷 Take photo
        <input type="file" accept="image/*" capture="environment" hidden onChange={pickPhoto} />
      </label>
      <label className="button secondary small">
        🖼 Choose photo
        <input type="file" accept="image/*" hidden onChange={pickPhoto} />
      </label>
      {recipe.photo && (
        <button className="link" onClick={() => setPhoto(null)}>
          Remove photo
        </button>
      )}
      {photoNote && <span className="note">{photoNote}</span>}
    </div>
  )
  const picture = recipe.photo ?? (imageBroken ? null : recipe.image) ?? recipe.thumb ?? null

  const video = videoSrc ? (
    <div className="video">
      <VideoPlayer src={videoSrc} poster={recipe.photo ?? recipe.thumb ?? undefined} />
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
  ) : picture || recipe.video ? (
    <>
      {picture && <img className="hero" src={picture} alt="" onError={() => picture === recipe.image && setImageBroken(true)} />}
      {/* Videos are kept on the phone that saved them */}
      {recipe.video && <p className="hint video-elsewhere">🎬 The video is saved on the other phone{recipe.sourceUrl ? '; the source link opens the original.' : '.'}</p>}
    </>
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
          {languageBar}
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
          <RecipeTags recipe={recipe} categories={categories} cuisines={cuisines} onChange={set} />
          <div className="rating-row">
            <span className="note">Rating</span>
            <Stars value={recipe.rating} onChange={(rating) => set({ rating })} />
          </div>
          <label className="recipe-note">
            Note
            <textarea rows="3" placeholder="What worked, what to change next time…" value={recipe.note ?? ''} onChange={(e) => set({ note: e.target.value })} />
          </label>
          {video}
          {photoButtons}
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

      {video ?? <section className="card photo-empty">{photoButtons}</section>}

      <header className="recipe-head">
        <h1>{recipe.title || 'Untitled recipe'}</h1>
        {languageBar}
        <Stars value={recipe.rating} onChange={(rating) => onSavePatch({ rating })} />
        {recipe.note?.trim() && (
          <div className="recipe-note-view">
            <strong>📝 Note</strong>
            <p>{recipe.note.trim()}</p>
          </div>
        )}
        <div className="meta">
          {recipe.sourceUrl ? (
            <button className="meta-chip" onClick={() => openExternal(recipe.sourceUrl)}>
              {sourceLabel || 'Source'} ↗
            </button>
          ) : (
            PLATFORM[recipe.platform] && <span className="meta-chip plain">{PLATFORM[recipe.platform]}</span>
          )}
          {recipe.cuisine && <span className="meta-chip">{recipe.cuisine}</span>}
          {(recipe.categories ?? []).map((c) => (
            <span key={c} className="meta-chip">
              {c}
            </span>
          ))}
        </div>
        {totalMinutes(recipe) && (
          <div className="times">
            {recipe.prepMin ? (
              <span>
                <strong>{formatMinutes(recipe.prepMin)}</strong> prep
              </span>
            ) : null}
            {recipe.cookMin ? (
              <span>
                <strong>
                  {recipe.timesEstimated ? '~' : ''}
                  {formatMinutes(recipe.cookMin)}
                </strong>{' '}
                cook
              </span>
            ) : null}
            <span>
              <strong>
                {recipe.timesEstimated ? '~' : ''}
                {formatMinutes(totalMinutes(recipe))}
              </strong>{' '}
              total
            </span>
          </div>
        )}
        <div className="meta">
          {recipe.servings && <span className="meta-chip plain">{recipe.servings} portions</span>}
          <span className="meta-chip plain">{ingredientCount} ingredients</span>
          {steps.length > 0 && <span className="meta-chip plain">{steps.length} steps</span>}
          {lastCooked(recipe) && <span className="meta-chip plain">Cooked {cookedAgo(lastCooked(recipe))}</span>}
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
        {convertible && onUnits && (
          <div className="segmented" role="group" aria-label="Units">
            {[
              ['original', 'As written'],
              ['metric', 'Metric'],
              ['imperial', 'US'],
            ].map(([k, label]) => (
              <button key={k} className={units === k ? 'on' : ''} aria-pressed={units === k} onClick={() => onUnits(k)}>
                {label}
              </button>
            ))}
          </div>
        )}
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
          <button className="secondary" onClick={() => copyText(recipeToText({ ingredients: shown, steps: stepsText }, recipe.title))}>
            {copied ? 'Copied' : 'Copy recipe'}
          </button>
        </div>
      </section>

      {recipe.id && <CookedLog cooked={recipe.cooked} onChange={(cooked) => onSavePatch({ cooked })} />}

      {sources}

      {cooking && (
        <CookMode
          title={recipe.title}
          ingredients={shown}
          steps={stepsText}
          stockPlan={planCooking(scaled, pantry, canonical)}
          onUseStock={onUseStock}
          onCooked={recipe.id ? (note) => onSavePatch({ cooked: addCooked(recipe, Date.now(), note) }) : null}
          onClose={() => setCooking(false)}
        />
      )}
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
