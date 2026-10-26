import { useMemo, useState } from 'react'
import { totalMinutes } from './lib/recipeMeta.js'
import Select from './Select.jsx'
import Icon from './Icon.jsx'
import NumberField from './NumberField.jsx'
import { useCatalog } from './catalog.jsx'
import { DEFAULT_TAGS, hasTag, suggestTags } from './lib/recipeTags.js'

const minutesOrNull = (v) => (v === '' ? null : Math.max(0, Math.round(Number(v))) || null)

/** Chips to tick, plus a "New" one to type a name that isn't there yet. */
function ChipPicker({ all, picked, suggested = [], label, onChange }) {
  const [adding, setAdding] = useState(false)
  const [typed, setTyped] = useState('')
  const has = (c) => picked.some((p) => p.toLowerCase() === c.toLowerCase())
  const toggle = (c) => onChange(has(c) ? picked.filter((p) => p.toLowerCase() !== c.toLowerCase()) : [...picked, c])
  const add = () => {
    const name = typed.trim().replace(/\s+/g, ' ')
    if (name && !has(name)) onChange([...picked, name.charAt(0).toLocaleUpperCase() + name.slice(1)])
    setTyped('')
    setAdding(false)
  }
  // Picked ones that no other recipe uses yet still show
  const shown = [...all, ...picked.filter((p) => !all.some((c) => c.toLowerCase() === p.toLowerCase()))]
  const hinted = (c) => !has(c) && suggested.some((s) => s.toLowerCase() === c.toLowerCase())
  return (
    <div className="chip-wrap">
      {shown.map((c) => (
        <button key={c} className={`chip-btn${has(c) ? ' on' : ''}${hinted(c) ? ' suggest' : ''}`} aria-pressed={has(c)} onClick={() => toggle(c)}>
          {c}
        </button>
      ))}
      {adding ? (
        <input
          className="chip-input"
          autoFocus
          aria-label={`New ${label}`}
          placeholder={`New ${label}`}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          onBlur={add}
        />
      ) : (
        <button className="chip-btn add" onClick={() => setAdding(true)}>
          <Icon name="plus" size={16} strokeWidth={2.5} /> New
        </button>
      )}
    </div>
  )
}

/** Prep/cook/total minutes, cuisine, categories and diet/style tags in the recipe form. */
export default function RecipeTags({ recipe, categories, cuisines, tags = DEFAULT_TAGS, onChange }) {
  const { match } = useCatalog()
  const [otherCuisine, setOtherCuisine] = useState(false)
  // Tags the ingredients, steps and calories point to
  const suggested = useMemo(() => suggestTags(recipe, match).tags, [recipe, match])
  const time = (field, label) => (
    <label className="field">
      {label}
      <NumberField
        inputMode="numeric"
        step={5}
        min={0}
        max={9999}
        label={`${label} minutes`}
        placeholder={field === 'totalMin' && totalMinutes({ ...recipe, totalMin: null }) ? String(totalMinutes({ ...recipe, totalMin: null })) : 'min'}
        value={recipe[field] ?? ''}
        onChange={(v) => onChange({ [field]: minutesOrNull(v), timesEstimated: false })}
      />
    </label>
  )
  const cuisineKnown = !recipe.cuisine || cuisines.includes(recipe.cuisine)

  return (
    <div className="tags-edit">
      <h3>
        Time <span className="note">(minutes{recipe.timesEstimated ? ', estimated from the steps' : ''})</span>
      </h3>
      <div className="time-fields">
        {time('prepMin', 'Prep')}
        {time('cookMin', 'Cook')}
        {time('totalMin', 'Total')}
      </div>

      <h3>Cuisine</h3>
      {otherCuisine || !cuisineKnown ? (
        <div className="row tight">
          <input autoFocus={otherCuisine} aria-label="Cuisine" placeholder="e.g. Georgian" value={recipe.cuisine ?? ''} onChange={(e) => onChange({ cuisine: e.target.value || null })} />
          <button
            className="link"
            onClick={() => {
              setOtherCuisine(false)
              if (!cuisineKnown) onChange({ cuisine: null })
            }}
          >
            List
          </button>
        </div>
      ) : (
        <Select
          aria-label="Cuisine"
          value={recipe.cuisine ?? ''}
          onChange={(e) => (e.target.value === '\u0000other' ? (setOtherCuisine(true), onChange({ cuisine: null })) : onChange({ cuisine: e.target.value || null }))}
        >
          <option value="">No cuisine</option>
          {cuisines.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
          <option value={'\u0000other'}>Other…</option>
        </Select>
      )}

      <h3>Categories</h3>
      <ChipPicker all={categories} picked={recipe.categories ?? []} label="category" onChange={(next) => onChange({ categories: next })} />

      <h3>Diet and style</h3>
      <ChipPicker all={tags} picked={recipe.tags ?? []} suggested={suggested} label="tag" onChange={(next) => onChange({ tags: next })} />
      {suggested.some((t) => !hasTag(recipe, t)) && <p className="note">Outlined ones look right for this recipe: tap to add.</p>}
    </div>
  )
}
