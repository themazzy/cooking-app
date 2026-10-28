import { Fragment, useEffect, useRef, useState } from 'react'
import RecipeEditor from './RecipeEditor.jsx'
import RecipeTags from './RecipeTags.jsx'
import Stars from './Stars.jsx'
import CookedLog from './CookedLog.jsx'
import { addCooked, cookedAgo, lastCooked } from './lib/history.js'
import { myRating, otherRatings, ratePatch } from './lib/ratings.js'
import CookMode from './CookMode.jsx'
import ShopSheet from './ShopSheet.jsx'
import VideoPlayer from './VideoPlayer.jsx'
import { IngredientIcon, useCatalog } from './catalog.jsx'
import { parseRecipeText } from './lib/ingredients.js'
import { addFromTranscript, addRaw, pickRecipe } from './lib/recipeSource.js'
import { recipeToText, toEditable } from './lib/recipeEdit.js'
import { openExternal } from './lib/pageReader.js'
import { scaleIngredients, scaleSteps } from './lib/scale.js'
import { swapIngredient, swapsFor } from './lib/swaps.js'
import SwapSheet from './SwapSheet.jsx'
import ShareSheet from './ShareSheet.jsx'
import CollectionSheet from './CollectionSheet.jsx'
import { toast } from './lib/toast.js'
import { seekableBlob } from './lib/webmFix.js'
import { recipePhoto } from './lib/thumb.js'
import { splitSteps } from './lib/cook.js'
import { isOut, stockReview } from './lib/stock.js'
import { convertIngredients, convertTemperatures, hasUnits } from './lib/units.js'
import { formatMinutes, totalMinutes } from './lib/recipeMeta.js'
import { formatGrams, formatKcal, recipeCalories, recipeMacros } from './lib/calories.js'
import { languageName, swapOriginal, translateAgain, translateRecipe } from './lib/translate.js'
import Icon from './Icon.jsx'
import NumberField from './NumberField.jsx'

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
/** What the others in the household gave the recipe, next to your own stars. */
function OtherRatings({ recipe, me }) {
  const others = otherRatings(recipe, me)
  if (!others.length) return null
  return (
    <span className="other-ratings note">
      {others.map((o) => (
        <span key={o.who}>
          {o.name ?? (others.length > 1 ? 'Other' : 'Other person')} {o.stars}<Icon name="star" size={13} fill />
        </span>
      ))}
    </span>
  )
}

/** Notes to see before cooking: the recipe's own note and the last note from the cooking history. */
function cookNotes(recipe) {
  const out = []
  if (recipe.note?.trim()) out.push({ label: 'Recipe note', text: recipe.note.trim() })
  const last = [...(recipe.cooked ?? [])].filter((c) => c.note?.trim()).sort((a, b) => b.at - a.at)[0]
  if (last) out.push({ label: `Last time · ${cookedAgo(last.at)}`, text: last.note.trim() })
  return out
}

export default function RecipePage({ me = 'me', recipe, videoBlob, shrink, dirty, report, pantry = [], onChange, onSave, onSavePatch, onDelete, onDiscard, onBack, onAddToList, onUseStock, onReread, onTranscribe, onAddSource, units = 'original', alarm, onUnits, translateTo = null, categories = [], cuisines = [], collections = [], tags = [] }) {
  const { match, canonical } = useCatalog()
  const [edit, setEdit] = useState(!recipe.id)
  const [copied, setCopied] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [cooking, setCooking] = useState(false)
  const [shopping, setShopping] = useState(false)
  const [added, setAdded] = useState(false)
  const [photoNote, setPhotoNote] = useState(null)
  const [swapFor, setSwapFor] = useState(null) // index of the ingredient showing its swaps
  const [filing, setFiling] = useState(false) // the collections sheet is open
  const [sharing, setSharing] = useState(false)
  const [imageBroken, setImageBroken] = useState(false)
  // Reading more source on request (see moreCard), and the open paste / link box
  const [more, setMore] = useState(null)
  const [moreInput, setMoreInput] = useState(null)
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
  const shown = convertIngredients(scaled, units, match)
  const stepsText = convertTemperatures(scaleSteps(recipe.steps, factor, recipe.ingredients), units)
  const convertible = hasUnits(recipe.ingredients, 'metric', match) || hasUnits(recipe.ingredients, 'imperial') || /\d\s*°/.test(recipe.steps)
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
  // Saved recipes change at once; a recipe being edited or not saved yet changes in the form
  const patchRecipe = (patch) => (edit || !recipe.id ? set(patch) : onSavePatch(patch))
  const canSwap = (i) => !!i.swappedFrom || swapsFor(match(i.name)).length > 0
  const anySwap = shown.some((i) => i.name?.trim() && canSwap(i))
  const useSwap = (n, swap) => {
    const was = recipe.ingredients[n]
    const next = { ...swapIngredient(was, swap), swappedFrom: was.swappedFrom ?? { qty: was.qty, unit: was.unit, name: was.name } }
    patchRecipe({ ingredients: recipe.ingredients.map((i, k) => (k === n ? next : i)) })
    setSwapFor(null)
    toast(`Using ${swap.name} instead of ${next.swappedFrom.name}`)
  }
  const restoreSwap = (n) => {
    const { swappedFrom, ...rest } = recipe.ingredients[n]
    patchRecipe({ ingredients: recipe.ingredients.map((i, k) => (k === n ? { ...rest, ...swappedFrom } : i)) })
    setSwapFor(null)
  }
  const raw = recipe.raw ?? {}
  const comments = raw.comments ?? []
  const steps = splitSteps(stepsText)
  const atHome = new Set(pantry.filter((p) => !isOut(p)).map((p) => canonical(p.name)))
  const ingredientCount = recipe.ingredients.filter((i) => i.name?.trim()).length
  // Estimated calories of one portion (of the whole recipe when it has no portion count)
  const calories = recipeCalories(recipe.ingredients, match)
  const hasCalories = calories.rows.some((r) => r.kcal > 0)
  const perPortion = hasCalories && recipe.servings ? calories.total / recipe.servings : null
  // Protein, carbs and fat of one portion (or of what is being cooked, without a recipe size)
  const macros = recipeMacros(recipe.servings ? recipe.ingredients : scaled, match)
  const macroShare = recipe.servings ? 1 / recipe.servings : 1
  const sourceLabel = [PLATFORM[recipe.platform] && recipe.platform !== 'web' ? PLATFORM[recipe.platform] : hostOf(recipe.sourceUrl), recipe.author]
    .filter(Boolean)
    .join(' · ')
  // What the shared copy is for: the portions and time as now on screen
  const shareMeta = [
    recipe.servings ? `${cookFor} ${cookFor === 1 ? 'portion' : 'portions'}` : factor !== 1 ? `×${cookFor} recipe` : null,
    totalMinutes(recipe) ? `${recipe.timesEstimated ? 'about ' : ''}${formatMinutes(totalMinutes(recipe))}` : null,
    sourceLabel || null,
  ]
    .filter(Boolean)
    .join(' · ')
  // Calories and macros as on screen, for the PDF
  const approx = macros.missing.length ? '~' : ''
  const shareNutrition = hasCalories
    ? {
        per: recipe.servings ? 'per portion' : 'in total',
        values: [
          [formatKcal(perPortion ?? calories.total * factor), 'kcal'],
          [`${approx}${formatGrams(macros.protein * macroShare)} g`, 'protein'],
          [`${approx}${formatGrams(macros.carbs * macroShare)} g`, 'carbs'],
          [`${approx}${formatGrams(macros.fat * macroShare)} g`, 'fat'],
        ],
      }
    : null

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
  // Translation (in the edit screen): switch to the original text and back, or translate an older recipe
  const [translating, setTranslating] = useState(null) // null, 'busy' or a message
  const changeText = (r) => {
    const patch = { title: r.title, ingredients: r.ingredients, steps: r.steps, lang: r.lang, original: r.original, translatedBy: r.translatedBy ?? null, translatedFrom: r.translatedFrom ?? null }
    return edit || !recipe.id ? set(patch) : onSavePatch(patch)
  }
  const translate = async () => {
    setTranslating('busy')
    try {
      // Translating again starts from the original text but keeps what was edited in the translation;
      // shown in the original's language, that (edited) text is what gets translated
      const t =
        recipe.original && recipe.lang === translateTo
          ? await translateAgain(recipe, translateTo)
          : await translateRecipe({ ...recipe, original: null }, translateTo, { from: recipe.original ? recipe.lang : null })
      if (t) changeText(t)
      setTranslating(t ? null : `This recipe already looks like ${languageName(translateTo)}.`)
    } catch (err) {
      setTranslating(err?.message ?? String(err))
    }
  }
  const languageBar = recipe.original ? (
    <div className="language-bar">
      <Icon name="globe" size={15} /> In {languageName(recipe.lang)} ·{' '}
      <button className="link" onClick={() => changeText(swapOriginal(recipe))}>
        Show in {languageName(recipe.original.lang)}
      </button>
      {translateTo && (recipe.lang === translateTo || recipe.original.lang === translateTo) && (
        <>
          {' · '}
          <button className="link" disabled={translating === 'busy'} onClick={translate}>
            {translating === 'busy' ? 'Translating…' : 'Translate again'}
          </button>
        </>
      )}
      {recipe.translatedBy && <span className="note"> · translated by {recipe.translatedBy}</span>}
      {translating && translating !== 'busy' && <span className="note"> {translating}</span>}
    </div>
  ) : translateTo ? (
    <div className="language-bar">
      <button className="link" disabled={translating === 'busy'} onClick={translate}>
        <Icon name="globe" size={15} /> {translating === 'busy' ? 'Translating…' : `Translate to ${languageName(translateTo)}`}
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
        <Icon name="camera" /> Take photo
        <input type="file" accept="image/*" capture="environment" hidden onChange={pickPhoto} />
      </label>
      <label className="button secondary small">
        <Icon name="image" /> Choose photo
        <input type="file" accept="image/*" hidden onChange={pickPhoto} />
      </label>
      {(recipe.photo || recipe.photoKey) && (
        <button className="link" onClick={() => setPhoto(null)}>
          Remove photo
        </button>
      )}
      {photoNote && <span className="note">{photoNote}</span>}
    </div>
  )
  // Offline, a photo saved on the other phone shows as its small copy
  const picture = recipe.photo ?? recipe.photoThumb ?? (imageBroken ? null : recipe.image) ?? recipe.thumb ?? null

  const video = videoSrc ? (
    <div className="video">
      <VideoPlayer src={videoSrc} poster={recipe.photo ?? recipe.photoThumb ?? recipe.thumb ?? undefined} />
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
      {recipe.video && <p className="hint video-elsewhere">The video is saved on the other phone{recipe.sourceUrl ? '; the source link opens the original.' : '.'}</p>}
    </>
  ) : null

  // More source for the recipe: the video heard (imports skip it when the caption or a comment
  // holds the recipe), a comment screenshot, pasted text or a reel link. `more` is
  // { status } while reading, { found } when there is something to add, or { error }.
  const applyPatch = (p) => (edit || !recipe.id ? set(p) : onSavePatch(p))
  const canTranscribe = !!onTranscribe && raw.transcript == null && !!recipe.platform && recipe.platform !== 'web' && (!!videoBlob || !!recipe.sourceUrl)
  // Saved with the user's choice (not when it arrives), so edits made meanwhile stay
  const keepSource = useRef(null)
  const sourcePatch = (found) => ({
    raw: addRaw(raw, found.raw),
    ...Object.fromEntries(Object.entries(found.recipe ?? {}).filter(([k, v]) => v != null && !recipe[k])),
  })
  useEffect(() => {
    if (!keepSource.current) return
    const found = keepSource.current
    keepSource.current = null
    applyPatch(sourcePatch(found))
  })
  const readMore = async (read) => {
    setMore({ status: 'Starting…' })
    try {
      const found = await read((status) => setMore({ status }))
      if (found.ingredients.some((i) => i.name?.trim()) || found.steps.trim()) setMore({ found })
      else {
        // Nothing to cook from, but the text is kept with the recipe's sources
        keepSource.current = found
        setMore({ error: found.raw?.transcript === '' ? 'No speech found in the video.' : 'No recipe the app could read in it.' })
      }
    } catch (err) {
      setMore({ error: err?.message ?? String(err) })
    }
  }
  const pickScreenshots = (e) => {
    const photos = [...(e.target.files ?? [])]
    e.target.value = ''
    if (photos.length) readMore((say) => onAddSource(recipe, { photos }, say))
  }
  const found = more?.found
  const merged = found ? addFromTranscript({ ingredients: recipe.ingredients, steps: recipe.steps ?? '' }, found, canonical) : null
  const hasRecipe = recipe.ingredients.some((i) => i.name?.trim())
  const finish = (p) => {
    applyPatch({ ...p, ...sourcePatch(found) })
    setMore(null)
  }
  const moreCard = (canTranscribe || more || (onAddSource && edit)) && (
    <section className="card add-source">
      {found ? (
        <>
          <h3>{found.label}</h3>
          <p className="note">
            {found.ingredients.filter((i) => i.name?.trim()).length} ingredients and {splitSteps(found.steps).length} steps.
            {hasRecipe ? (merged.added ? ` ${merged.added} of the ingredients are not in this recipe yet.` : ' Every ingredient is already in this recipe.') : ''}
          </p>
          {merged.added > 0 && (
            <ul className="heard">
              {merged.ingredients.slice(-merged.added).map((i, n) => (
                <li key={n}>{[i.qty, i.unit, i.name].filter(Boolean).join(' ')}</li>
              ))}
            </ul>
          )}
          <div className="row">
            {hasRecipe && (merged.added > 0 || merged.addedSteps) && (
              <button onClick={() => finish({ ingredients: merged.ingredients, steps: merged.steps })}>{merged.added > 0 ? `Add ${merged.added} missing` : 'Add the steps'}</button>
            )}
            <button className={hasRecipe ? 'secondary' : ''} onClick={() => finish({ ingredients: found.ingredients, steps: found.steps, source: found.label.replace(/^From the /, '') })}>
              {hasRecipe ? 'Use this instead' : 'Use this recipe'}
            </button>
            <button className="link" onClick={() => finish({})}>
              {hasRecipe ? 'Keep as it is' : 'Keep only as a source'}
            </button>
          </div>
        </>
      ) : more?.status ? (
        <p className="note">{more.status}</p>
      ) : (
        <>
          {more?.error && <p className="note">{more.error}</p>}
          {canTranscribe && (
            <div className="row">
              <button className="secondary small" onClick={() => readMore((say) => onTranscribe(recipe, say))}>
                <Icon name="mic" /> Transcribe video
              </button>
              <span className="note">The recipe came from the {recipe.source ?? 'text'}. The video can add what it says.</span>
            </div>
          )}
          {onAddSource && edit && (
            <>
              <h3>Add a source</h3>
              <p className="note">A screenshot of a comment (no Instagram sign-in needed), pasted text, or a reel or recipe link.</p>
              <div className="row">
                <label className="button secondary small">
                  <Icon name="image" /> Screenshot
                  <input type="file" accept="image/*" multiple hidden onChange={pickScreenshots} />
                </label>
                <button className={`secondary small${moreInput?.kind === 'text' ? ' on' : ''}`} onClick={() => setMoreInput(moreInput?.kind === 'text' ? null : { kind: 'text', value: '' })}>
                  Paste text
                </button>
                <button className={`secondary small${moreInput?.kind === 'link' ? ' on' : ''}`} onClick={() => setMoreInput(moreInput?.kind === 'link' ? null : { kind: 'link', value: '' })}>
                  <Icon name="external" /> Reel or link
                </button>
              </div>
              {moreInput && (
                <div className="row">
                  {moreInput.kind === 'text' ? (
                    <textarea rows="5" placeholder="Paste the comment or recipe text" value={moreInput.value} onChange={(e) => setMoreInput({ ...moreInput, value: e.target.value })} />
                  ) : (
                    <input className="grow" type="url" placeholder="https://www.instagram.com/reel/…" value={moreInput.value} onChange={(e) => setMoreInput({ ...moreInput, value: e.target.value })} />
                  )}
                  <button
                    className="small"
                    disabled={!moreInput.value.trim()}
                    onClick={() => {
                      const { kind, value } = moreInput
                      setMoreInput(null)
                      readMore((say) => onAddSource(recipe, kind === 'text' ? { text: value } : { link: value }, say))
                    }}
                  >
                    Read
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </section>
  )

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
            <Icon name="back" /> Back
          </button>
          <span className="note">{recipe.id ? (dirty ? 'Unsaved changes' : 'Saved') : 'Not saved yet'}</span>
        </div>

        <section className="card recipe">
          <input className="title" aria-label="Recipe name" placeholder="Recipe name" value={recipe.title} onChange={(e) => set({ title: e.target.value })} />
          {languageBar}
          {recipe.sourceUrl && (
            <button className="link source" onClick={() => openExternal(recipe.sourceUrl)}>
              {sourceLabel || 'Source'} <Icon name="external" size={14} />
            </button>
          )}
          <div className="servings">
            <label>
              Recipe makes
              <NumberField
                inputMode="numeric"
                min={1}
                max={99}
                label="portions"
                value={recipe.servings ?? ''}
                placeholder="?"
                onChange={(v) => set({ servings: v ? Math.max(1, Number(v) || 1) : null })}
              />
              portions
            </label>
          </div>
          <RecipeTags recipe={recipe} categories={categories} cuisines={cuisines} tags={tags} onChange={set} />
          <div className="rating-row">
            <span className="note">Rating</span>
            <Stars value={myRating(recipe, me)} onChange={(stars) => set(ratePatch(recipe, me, stars))} />
            <OtherRatings recipe={recipe} me={me} />
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
            onReset={async () => {
              // Read and translated the same way as a new import, when the app can
              if (onReread) return set(await onReread(recipe))
              const picked = pickRecipe(raw)
              set({ ...toEditable(picked), source: picked?.source ?? null })
            }}
          />
        </section>

        {moreCard}
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
          <Icon name="back" /> Recipes
        </button>
        <span className="topbar-actions">
          <button className="small secondary" onClick={() => setSharing(true)}>
            <Icon name="share" /> Share
          </button>
          <button className="small secondary" onClick={() => setEdit(true)}>
            Edit
          </button>
        </span>
      </div>

      {video ?? <section className="card photo-empty">{photoButtons}</section>}

      <header className="recipe-head">
        <h1>{recipe.title || 'Untitled recipe'}</h1>
        <div className="head-line">
          <span className="my-rating">
            <Stars value={myRating(recipe, me)} onChange={(stars) => onSavePatch(ratePatch(recipe, me, stars))} />
            <OtherRatings recipe={recipe} me={me} />
          </span>
        </div>
        <div className="tag-scroll">
          {(recipe.collections ?? []).map((c) => (
            <button key={c} className="meta-chip folder" onClick={() => setFiling(true)}>
              <Icon name="folder" size={14} /> {c}
            </button>
          ))}
          {recipe.cuisine && <span className="meta-chip">{recipe.cuisine}</span>}
          {(recipe.categories ?? []).map((c) => (
            <span key={c} className="meta-chip plain">
              {c}
            </span>
          ))}
          {(recipe.tags ?? []).map((t) => (
            <span key={`t-${t}`} className="meta-chip plain">
              {t}
            </span>
          ))}
          {recipe.id && !recipe.collections?.length && (
            <button className="meta-chip add" onClick={() => setFiling(true)}>
              <Icon name="plus" size={14} /> Collection
            </button>
          )}
        </div>
        <div className="stats">
          {totalMinutes(recipe) ? (
            <div className="stat">
              <strong>
                {recipe.timesEstimated ? '~' : ''}
                {formatMinutes(totalMinutes(recipe))}
              </strong>
              {/* Prep and cook time fit under it only while both are under an hour */}
              <span>{recipe.prepMin && recipe.cookMin && recipe.prepMin < 60 && recipe.cookMin < 60 ? `${recipe.prepMin} + ${recipe.cookMin} min` : 'total'}</span>
            </div>
          ) : null}
          {recipe.servings ? (
            <div className="stat">
              <strong>{recipe.servings}</strong>
              <span>{recipe.servings === 1 ? 'portion' : 'portions'}</span>
            </div>
          ) : null}
          <div className="stat">
            <strong>{ingredientCount}</strong>
            <span>ingredients</span>
          </div>
          {hasCalories ? (
            <div className="stat">
              <strong>
                {calories.missing.length ? '~' : ''}
                {formatKcal(perPortion ?? calories.total)}
              </strong>
              <span>{perPortion != null ? 'kcal/portion' : 'kcal total'}</span>
            </div>
          ) : (
            <div className="stat">
              <strong>{steps.length}</strong>
              <span>{steps.length === 1 ? 'step' : 'steps'}</span>
            </div>
          )}
        </div>
        <p className="source-line">
          {recipe.sourceUrl ? (
            <button className="link" onClick={() => openExternal(recipe.sourceUrl)}>
              {sourceLabel || 'Source'} <Icon name="external" size={14} />
            </button>
          ) : (
            PLATFORM[recipe.platform] && <span>{PLATFORM[recipe.platform]}</span>
          )}
          {lastCooked(recipe) && (
            <span>
              {recipe.sourceUrl || PLATFORM[recipe.platform] ? '· ' : ''}Cooked {cookedAgo(lastCooked(recipe))}
            </span>
          )}
        </p>
        {recipe.note?.trim() && (
          <div className="recipe-note-view">
            <strong>Note</strong>
            <p>{recipe.note.trim()}</p>
          </div>
        )}
        <div className="recipe-actions">
          <button className="big" disabled={!steps.length} onClick={() => setCooking(true)}>
            <Icon name="play" fill /> Start cooking
          </button>
          <button className="big secondary" disabled={!ingredientCount} onClick={() => setShopping(true)}>
            {added ? <><Icon name="check" /> On the list</> : <><Icon name="cart" /> Add to list</>}
          </button>
        </div>
      </header>

      <section className="card">
        <div className="section-head">
          <h2>Ingredients</h2>
          <div className="stepper">
            <button className="secondary round" aria-label="Fewer portions" disabled={cookFor <= 1} onClick={() => setCookFor((n) => Math.max(1, n - 1))}>
              <Icon name="minus" />
            </button>
            <span className="count">
              {recipe.servings ? cookFor : `×${cookFor}`}
              <span className="count-label">{recipe.servings ? (cookFor === 1 ? 'portion' : 'portions') : 'recipe'}</span>
            </span>
            <button className="secondary round" aria-label="More portions" onClick={() => setCookFor((n) => Math.min(99, n + 1))}>
              <Icon name="plus" />
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
                  <li className={canSwap(i) ? 'swappable' : ''} onClick={canSwap(i) ? () => setSwapFor(n) : undefined}>
                    <IngredientIcon entry={match(i.name)} size={36} />
                    <span className="ing-name">
                      {i.name}
                      {atHome.has(canonical(i.name)) && <span className="badge">at home</span>}
                      {i.swappedFrom && <span className="from">instead of {i.swappedFrom.name}</span>}
                    </span>
                    <span className="ing-qty">{amount(i)}</span>
                    {canSwap(i) ? (
                      <button className="icon swap-btn" aria-label={`Swaps for ${i.name}`}>
                        <Icon name="swap" size={16} />
                      </button>
                    ) : (
                      // keeps the amounts in one column when other rows have a swap button
                      anySwap && <span className="swap-gap" aria-hidden="true" />
                    )}
                  </li>
                </Fragment>
              ) : null,
            )}
          </ul>
        )}
        {hasCalories && (
          <details className="kcal-sum">
            <summary>
              <Icon name="flame" size={15} /> About {formatKcal(perPortion ?? calories.total * factor)} kcal {perPortion != null ? 'per portion' : 'in total'}
            </summary>
            <ul>
              {calories.rows
                .filter((r) => r.kcal > 0)
                .sort((a, b) => b.kcal - a.kcal)
                .map((r, n) => (
                  <li key={n}>
                    <span>{r.name}</span>
                    <span>{formatKcal(perPortion != null ? r.kcal / recipe.servings : r.kcal * factor)} kcal</span>
                  </li>
                ))}
            </ul>
            {calories.missing.length > 0 && (
              <p className="note">Not counted (no amount or calories known): {calories.missing.join(', ')}. Calories of your own ingredients can be set on the Ingredients tab.</p>
            )}
            <p className="note">An estimate from typical values for raw ingredients.</p>
          </details>
        )}
        {hasCalories && (
          <div className="macros" aria-label={recipe.servings ? 'Per portion' : 'In total'}>
            {[
              ['protein', 'Protein'],
              ['carbs', 'Carbs'],
              ['fat', 'Fat'],
            ].map(([k, label]) => (
              <div key={k} className={`macro ${k}`}>
                <strong>
                  {macros.missing.length ? '~' : ''}
                  {formatGrams(macros[k] * macroShare)} g
                </strong>
                <span>{label}</span>
              </div>
            ))}
            <span className="note">{recipe.servings ? 'per portion' : 'in total'}</span>
          </div>
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

      {sharing && (
        <ShareSheet
          title={recipe.title || 'Recipe'}
          meta={shareMeta}
          nutrition={shareNutrition}
          text={[recipeToText({ ingredients: shown, steps: stepsText }, [recipe.title, shareMeta].filter(Boolean).join('\n')), recipe.note?.trim() ? `Note: ${recipe.note.trim()}` : '', recipe.sourceUrl ?? ''].filter(Boolean).join('\n\n')}
          pictures={[recipe.photo, recipe.image, recipe.photoThumb, recipe.thumb].filter(Boolean)}
          ingredients={shown}
          steps={steps}
          note={recipe.note}
          footer={recipe.sourceUrl ?? ''}
          onClose={() => setSharing(false)}
        />
      )}

      {recipe.id && <CookedLog cooked={recipe.cooked} by={me} onChange={(cooked) => onSavePatch({ cooked })} />}

      {moreCard}
      {sources}

      {cooking && (
        <CookMode
          title={recipe.title}
          ingredients={shown}
          steps={stepsText}
          portions={cookFor}
          servings={recipe.servings}
          onPortions={setCookFor}
          notes={cookNotes(recipe)}
          rating={recipe.id ? myRating(recipe, me) : null}
          onRate={recipe.id ? (stars) => onSavePatch(ratePatch(recipe, me, stars)) : null}
          alarm={alarm}
          stockPlan={stockReview(scaled, pantry, canonical)}
          onUseStock={onUseStock}
          onCooked={recipe.id ? (note) => onSavePatch({ cooked: addCooked(recipe, Date.now(), note, me) }) : null}
          onClose={() => setCooking(false)}
        />
      )}
      {filing && (
        <CollectionSheet picked={recipe.collections ?? []} all={collections} onChange={(next) => patchRecipe({ collections: next })} onClose={() => setFiling(false)} />
      )}
      {swapFor != null && shown[swapFor] && (
        <SwapSheet
          ingredient={shown[swapFor]}
          onUse={(swap) => useSwap(swapFor, swap)}
          onRestore={() => restoreSwap(swapFor)}
          onClose={() => setSwapFor(null)}
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
