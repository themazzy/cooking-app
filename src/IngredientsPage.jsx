import { Fragment, useState } from 'react'
import { AISLES } from './data/ingredients.js'
import { IngredientIcon, photoToIcon, useCatalog } from './catalog.jsx'
import { toast } from './lib/toast.js'
import Select from './Select.jsx'

const EMPTY = { name: '', base: '', aisle: 'Other', aliases: '', image: '', image_data: null }

/** The ingredient catalog: the shared list plus your own (local brands etc.), with search. */
export default function IngredientsPage() {
  const { entries, add, update, remove } = useCatalog()
  const [query, setQuery] = useState('')
  const [form, setForm] = useState(EMPTY)
  const [editingId, setEditingId] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [message, setMessage] = useState(null)
  const q = query.trim().toLowerCase()
  const matches = (e) => !q || e.name.toLowerCase().includes(q) || e.base?.toLowerCase().includes(q) || e.aliases?.some((a) => a.includes(q))
  const sharedNames = entries.filter((e) => !e.household_id)
  // An everyday ingredient with the household's own picture is a household entry of the same name
  const sharedKeys = new Set(sharedNames.map((e) => e.name.toLowerCase()))
  const overrides = new Map(entries.filter((e) => e.household_id && sharedKeys.has(e.name.toLowerCase())).map((e) => [e.name.toLowerCase(), e]))
  const own = entries.filter((e) => e.household_id && !overrides.has(e.name.toLowerCase()) && matches(e)).sort((a, b) => a.name.localeCompare(b.name))
  const shared = sharedNames.filter(matches).sort((a, b) => AISLES.indexOf(a.aisle) - AISLES.indexOf(b.aisle) || a.name.localeCompare(b.name))
  // { entry, override } while changing an everyday ingredient's picture
  const [picture, setPicture] = useState(null)
  const [savingPicture, setSavingPicture] = useState(false)

  const savePicture = async (image_data) => {
    const { entry, override } = picture
    setSavingPicture(true)
    try {
      if (override && !image_data) await remove(override.id)
      else if (override) await update(override.id, { image_data })
      else
        await add({
          name: entry.name,
          base: entry.base ?? entry.name,
          aisle: entry.aisle,
          aliases: entry.aliases ?? [],
          image: entry.image ?? null,
          image_data,
        })
      toast(image_data ? `New picture for ${entry.name}` : `${entry.name} has its usual picture again`)
      setPicture(null)
    } catch (e) {
      toast(e?.message ?? String(e), { kind: 'error' })
    } finally {
      setSavingPicture(false)
    }
  }

  const setBase = (base) => {
    const b = sharedNames.find((e) => e.name.toLowerCase() === base.trim().toLowerCase())
    setForm((f) => ({ ...f, base, aisle: b?.aisle ?? f.aisle }))
  }

  const startEdit = (e) => {
    setEditingId(e.id)
    setForm({
      name: e.name,
      base: e.base ?? '',
      aisle: e.aisle,
      aliases: (e.aliases ?? []).join(', '),
      image: e.household_id ? (e.image ?? '') : '',
      image_data: e.image_data ?? null,
    })
    setMessage(null)
    setFormOpen(true)
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
      setMessage(null)
      toast(`${editingId ? 'Saved' : 'Added'} ${entry.name}`)
      setForm(EMPTY)
      setEditingId(null)
      setFormOpen(false)
    } catch (e) {
      setMessage(e?.code === '23505' || e?.message?.includes('duplicate') ? 'You already have an ingredient with this name.' : (e?.message ?? String(e)))
    }
  }

  const row = (e) => {
    const override = !e.household_id ? overrides.get(e.name.toLowerCase()) : null
    return (
      <li key={e.id ?? e.name} onClick={() => (e.household_id ? startEdit(e) : setPicture({ entry: e, override }))} className="editable">
        <IngredientIcon entry={override ?? e} size={36} />
        <span className="grow">
          {e.name}
          {e.base && <span className="from">counts as {e.base}</span>}
          {!e.base && e.aliases?.length > 0 && <span className="from">{e.aliases.join(', ')}</span>}
        </span>
        {override && <span className="badge muted">own picture</span>}
      </li>
    )
  }

  return (
    <>
      <header className="main-header">
        <h1>Ingredients</h1>
        <button className="small" onClick={() => (setEditingId(null), setForm(EMPTY), setMessage(null), setFormOpen(true))}>
          + Add your own
        </button>
      </header>
      {message && !formOpen && <p className="hint">{message}</p>}
      <section className="card">
        <input className="search" type="search" placeholder="Search ingredients" value={query} onChange={(e) => setQuery(e.target.value)} />
        <h3>Your own ({own.length})</h3>
        {own.length ? (
          <ul className="catalog">{own.map(row)}</ul>
        ) : (
          <p className="hint">Local brands and anything missing from the list. Tap + Add your own. Tap one of yours to change it.</p>
        )}
        <p className="hint">Tap an everyday ingredient to give it your own picture, e.g. the local product you buy.</p>
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

      {picture && (
        <div className="sheet-backdrop" onClick={() => !savingPicture && setPicture(null)}>
          <div className="sheet" role="dialog" aria-label={`Picture for ${picture.entry.name}`} onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" aria-hidden="true" />
            <div className="item-head">
              <IngredientIcon entry={picture.override ?? picture.entry} size={64} />
              <div>
                <h2>{picture.entry.name}</h2>
                <p className="note">{picture.override ? 'Your own picture, shared with your household' : 'The usual picture'}</p>
              </div>
            </div>
            <div className="row">
              <label className={`button${savingPicture ? ' secondary' : ''}`}>
                📷 Take photo
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  hidden
                  disabled={savingPicture}
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    e.target.value = ''
                    if (file) savePicture(await photoToIcon(file))
                  }}
                />
              </label>
              <label className="button secondary">
                🖼 Choose photo
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  disabled={savingPicture}
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    e.target.value = ''
                    if (file) savePicture(await photoToIcon(file))
                  }}
                />
              </label>
            </div>
            {picture.override && (
              <button className="link more" disabled={savingPicture} onClick={() => savePicture(null)}>
                Use the usual picture again
              </button>
            )}
            {savingPicture && <div className="busy-bar" />}
          </div>
        </div>
      )}

      {formOpen && (
        <div className="sheet-backdrop" onClick={() => setFormOpen(false)}>
          <div className="sheet" role="dialog" aria-label="Your ingredient" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" aria-hidden="true" />
            <h2>{editingId ? `Edit ${form.name}` : 'Add your own ingredient'}</h2>
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
                <Select aria-label="Aisle" value={form.aisle} onChange={(e) => setForm({ ...form, aisle: e.target.value })}>
                  {AISLES.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </Select>
              </label>
              <input placeholder="Other names recipes use, comma separated" value={form.aliases} onChange={(e) => setForm({ ...form, aliases: e.target.value })} />
              <div className="row" style={{ alignItems: 'center' }}>
                <IngredientIcon
                  entry={{
                    name: form.name,
                    aisle: form.aisle,
                    image_data: form.image_data,
                    image: form.image.trim() || sharedNames.find((e) => e.name === form.base)?.image || null,
                  }}
                  size={48}
                />
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
                <button className="secondary" onClick={() => setFormOpen(false)}>
                  Cancel
                </button>
                {editingId && (
                  <>
                    <button
                      className="danger"
                      onClick={async () => {
                        await remove(editingId)
                        toast(`Deleted ${form.name.trim() || 'the ingredient'}`)
                        setEditingId(null)
                        setForm(EMPTY)
                        setFormOpen(false)
                      }}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
              {message && <p className="hint">{message}</p>}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
