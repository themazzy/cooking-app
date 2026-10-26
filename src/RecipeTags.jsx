import { useState } from 'react'
import { totalMinutes } from './lib/recipeMeta.js'
import Select from './Select.jsx'
import Icon from './Icon.jsx'
import NumberField from './NumberField.jsx'

const minutesOrNull = (v) => (v === '' ? null : Math.max(0, Math.round(Number(v))) || null)

/** Prep/cook/total minutes, cuisine and categories in the recipe form. */
export default function RecipeTags({ recipe, categories, cuisines, onChange }) {
  const [adding, setAdding] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [otherCuisine, setOtherCuisine] = useState(false)
  const picked = recipe.categories ?? []
  const has = (c) => picked.some((p) => p.toLowerCase() === c.toLowerCase())
  const toggle = (c) => onChange({ categories: has(c) ? picked.filter((p) => p.toLowerCase() !== c.toLowerCase()) : [...picked, c] })
  const add = () => {
    const name = newCategory.trim().replace(/\s+/g, ' ')
    if (name && !has(name)) onChange({ categories: [...picked, name.charAt(0).toLocaleUpperCase() + name.slice(1)] })
    setNewCategory('')
    setAdding(false)
  }
  // Categories picked on this recipe that no other recipe uses yet still show
  const shown = [...categories, ...picked.filter((p) => !categories.some((c) => c.toLowerCase() === p.toLowerCase()))]
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
      <div className="chip-wrap">
        {shown.map((c) => (
          <button key={c} className={`chip-btn${has(c) ? ' on' : ''}`} aria-pressed={has(c)} onClick={() => toggle(c)}>
            {c}
          </button>
        ))}
        {adding ? (
          <input
            className="chip-input"
            autoFocus
            aria-label="New category"
            placeholder="New category"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            onBlur={add}
          />
        ) : (
          <button className="chip-btn add" onClick={() => setAdding(true)}>
            <Icon name="plus" size={16} strokeWidth={2.5} /> New
          </button>
        )}
      </div>
    </div>
  )
}
