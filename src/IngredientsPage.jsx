import { Fragment, useState } from 'react'
import { AISLES } from './data/ingredients.js'
import { IngredientIcon, photoToIcon, useCatalog } from './catalog.jsx'

const EMPTY = { name: '', base: '', aisle: 'Other', aliases: '', image: '', image_data: null }

/** The ingredient catalog: the shared list plus your own (local brands etc.), with search. */
export default function IngredientsPage() {
  const { entries, add, update, remove } = useCatalog()
  const [query, setQuery] = useState('')
  const [form, setForm] = useState(EMPTY)
  const [editingId, setEditingId] = useState(null)
  const [message, setMessage] = useState(null)
  const q = query.trim().toLowerCase()
  const matches = (e) => !q || e.name.toLowerCase().includes(q) || e.base?.toLowerCase().includes(q) || e.aliases?.some((a) => a.includes(q))
  const own = entries.filter((e) => e.household_id && matches(e)).sort((a, b) => a.name.localeCompare(b.name))
  const shared = entries
    .filter((e) => !e.household_id && matches(e))
    .sort((a, b) => AISLES.indexOf(a.aisle) - AISLES.indexOf(b.aisle) || a.name.localeCompare(b.name))
  const sharedNames = entries.filter((e) => !e.household_id)

  const setBase = (base) => {
    const b = sharedNames.find((e) => e.name.toLowerCase() === base.trim().toLowerCase())
    setForm((f) => ({ ...f, base, aisle: b?.aisle ?? f.aisle }))
  }

  const startEdit = (e) => {
    setEditingId(e.id)
    setForm({ name: e.name, base: e.base ?? '', aisle: e.aisle, aliases: (e.aliases ?? []).join(', '), image: e.household_id ? (e.image ?? '') : '', image_data: e.image_data ?? null })
    setMessage(null)
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
  }

  const submit = async () => {
    setMessage(null)
    const entry = {
      name: form.name.trim(),
      base: form.base.trim() || null,
      aisle: form.aisle,
      image: form.image.trim() || null,
      image_data: form.image_data,
      aliases: form.aliases
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    }
    try {
      if (editingId) await update(editingId, entry)
      else await add(entry)
      setMessage(`${editingId ? 'Saved' : 'Added'} ${entry.name}.`)
      setForm(EMPTY)
      setEditingId(null)
    } catch (e) {
      setMessage(e?.code === '23505' || e?.message?.includes('duplicate') ? 'You already have an ingredient with this name.' : (e?.message ?? String(e)))
    }
  }

  const row = (e) => (
    <li key={e.id ?? e.name} onClick={e.household_id ? () => startEdit(e) : undefined} className={e.household_id ? 'editable' : ''}>
      <IngredientIcon entry={e} size={36} />
      <span className="grow">
        {e.name}
        {e.base && <span className="from">counts as {e.base}</span>}
        {!e.base && e.aliases?.length > 0 && <span className="from">{e.aliases.join(', ')}</span>}
      </span>
    </li>
  )

  return (
    <>
      <section className="card">
        <h2>Ingredients</h2>
        <input className="search" type="search" placeholder="Search ingredients" value={query} onChange={(e) => setQuery(e.target.value)} />
        <h3>Your own ({own.length})</h3>
        {own.length ? <ul className="catalog">{own.map(row)}</ul> : <p className="hint">Local brands and anything missing from the list. Add them below.</p>}
        <h3>Everyday ingredients ({shared.length})</h3>
        <ul className="catalog">
          {shared.map((e, n) => (
            <Fragment key={e.id ?? e.name}>
              {e.aisle !== shared[n - 1]?.aisle && <li className="aisle">{e.aisle}</li>}
              {row(e)}
            </Fragment>
          ))}
        </ul>
      </section>

      <section className="card">
        <h3>{editingId ? `Edit ${form.name}` : 'Add your own ingredient'}</h3>
        <div className="account">
          <input placeholder="Name, e.g. Madeta butter" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input list="shared-names" placeholder="Counts as (optional), e.g. Butter" value={form.base} onChange={(e) => setBase(e.target.value)} />
          <datalist id="shared-names">
            {sharedNames.map((e) => (
              <option key={e.name} value={e.name} />
            ))}
          </datalist>
          <label>
            Aisle{' '}
            <select value={form.aisle} onChange={(e) => setForm({ ...form, aisle: e.target.value })}>
              {AISLES.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </label>
          <input placeholder="Other names recipes use, comma separated" value={form.aliases} onChange={(e) => setForm({ ...form, aliases: e.target.value })} />
          <div className="row" style={{ alignItems: 'center' }}>
            <IngredientIcon entry={{ name: form.name, aisle: form.aisle, image_data: form.image_data, image: form.image.trim() || sharedNames.find((e) => e.name === form.base)?.image || null }} size={48} />
            <label className="button secondary small">
              {form.image_data ? 'Change photo' : 'Take or pick a photo'}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  if (file) setForm({ ...form, image_data: await photoToIcon(file) })
                }}
              />
            </label>
            {form.image_data && (
              <button className="link" onClick={() => setForm({ ...form, image_data: null })}>
                Remove photo
              </button>
            )}
          </div>
          <div className="row">
            <button disabled={!form.name.trim()} onClick={submit}>
              {editingId ? 'Save' : 'Add'}
            </button>
            {editingId && (
              <>
                <button className="secondary" onClick={() => (setEditingId(null), setForm(EMPTY))}>
                  Cancel
                </button>
                <button
                  className="danger"
                  onClick={async () => {
                    await remove(editingId)
                    setEditingId(null)
                    setForm(EMPTY)
                  }}
                >
                  Delete
                </button>
              </>
            )}
          </div>
          {message && <p className="hint">{message}</p>}
        </div>
      </section>
    </>
  )
}
