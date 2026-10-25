import { Fragment, useState } from 'react'
import { AISLES } from './data/ingredients.js'
import { IngredientIcon, useCatalog } from './catalog.jsx'

/** The shared ingredient catalog: browse by aisle, search, add new ones. */
export default function IngredientsPage({ signedIn }) {
  const { entries, add } = useCatalog()
  const [query, setQuery] = useState('')
  const [form, setForm] = useState({ name: '', aisle: 'Vegetables', aliases: '', image: '' })
  const [message, setMessage] = useState(null)
  const q = query.trim().toLowerCase()
  const shown = entries
    .filter((e) => !q || e.name.toLowerCase().includes(q) || e.aliases?.some((a) => a.includes(q)))
    .sort((a, b) => AISLES.indexOf(a.aisle) - AISLES.indexOf(b.aisle) || a.name.localeCompare(b.name))

  const submit = async () => {
    setMessage(null)
    try {
      await add({
        name: form.name.trim(),
        aisle: form.aisle,
        image: form.image.trim() || null,
        aliases: form.aliases
          .split(',')
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean),
      })
      setMessage(`Added ${form.name.trim()}.`)
      setForm({ ...form, name: '', aliases: '', image: '' })
    } catch (e) {
      setMessage(e?.message?.includes('duplicate') ? 'That ingredient is already in the list.' : (e?.message ?? String(e)))
    }
  }

  return (
    <>
      <section className="card">
        <h2>Ingredients ({entries.length})</h2>
        <input className="search" type="search" placeholder="Search ingredients" value={query} onChange={(e) => setQuery(e.target.value)} />
        <ul className="catalog">
          {shown.map((e, n) => (
            <Fragment key={e.name}>
              {e.aisle !== shown[n - 1]?.aisle && <li className="aisle">{e.aisle}</li>}
              <li>
                <IngredientIcon entry={e} size={36} />
                <span>
                  {e.name}
                  {e.aliases?.length > 0 && <span className="from">{e.aliases.join(', ')}</span>}
                </span>
              </li>
            </Fragment>
          ))}
        </ul>
        {shown.length === 0 && <p className="hint">Nothing matches "{query}".</p>}
      </section>

      <section className="card">
        <h3>Add an ingredient</h3>
        {signedIn ? (
          <div className="account">
            <input placeholder="Name, e.g. Smoked tofu" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
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
              <input className="grow" placeholder="Picture: TheMealDB ingredient name (optional)" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} />
              <IngredientIcon entry={{ name: form.name, aisle: form.aisle, image: form.image.trim() || null }} size={36} />
            </div>
            <div className="row">
              <button disabled={!form.name.trim()} onClick={submit}>
                Add
              </button>
            </div>
            {message && <p className="hint">{message}</p>}
          </div>
        ) : (
          <p className="hint">Sign in under Settings to add ingredients to the shared list.</p>
        )}
      </section>
    </>
  )
}
