import { useRef, useState } from 'react'
import { emptyIngredient, joinSteps } from './lib/recipeEdit.js'
import { splitSteps } from './lib/cook.js'
import { IngredientIcon, useCatalog } from './catalog.jsx'
import Icon from './Icon.jsx'
import { UnitSheet } from './UnitPicker.jsx'
import { edgeIn, useDragSort } from './useDragSort.js'
import { groupSlots, moveItem, moveRow, moveRun, rowSlots, rowStep, sections } from './lib/reorder.js'

/** Ingredients as editable rows and each step in its own box, in order. */
export default function RecipeEditor({ recipe, source, onChange, onReset }) {
  const { match } = useCatalog()
  const { ingredients, steps } = recipe

  const setIngredients = (next) => onChange({ ...recipe, ingredients: next })
  // A name typed by hand is no longer a swap for the one before
  const update = (n, field, value) =>
    setIngredients(ingredients.map((i, k) => (k === n ? { ...i, [field]: value, ...(field === 'name' ? { swappedFrom: undefined } : {}) } : i)))
  const remove = (n) => setIngredients(ingredients.filter((_, k) => k !== n))
  const insertAfter = (n) => {
    const next = [...ingredients]
    next.splice(n + 1, 0, emptyIngredient(ingredients[n]?.group ?? ''))
    setIngredients(next)
  }
  // The steps are kept as a list here and saved back as numbered text ("1. …\n2. …")
  const [unitFor, setUnitFor] = useState(null) // the ingredient row whose unit is being picked
  const [list, setList] = useState(() => withBlank(splitSteps(steps)))
  const saved = useRef(steps)
  if (steps !== saved.current) {
    // Changed from outside (re-read from source)
    saved.current = steps
    setList(withBlank(splitSteps(steps)))
  }
  const setSteps = (next) => {
    setList(next)
    saved.current = joinSteps(next)
    onChange({ ...recipe, steps: saved.current })
  }
  const setStep = (n, text) => setSteps(list.map((s, k) => (k === n ? text : s)))
  const move = (n, to) => setSteps(moveItem(list, n, to))
  const removeStep = (n) => setSteps(withBlank(list.filter((_, k) => k !== n)))

  // Groups ("For the sauce") are a heading above a run of rows that share the same `group`
  const secs = sections(ingredients)
  const setSectionGroup = (k, group) => {
    const { start, end } = secs[k]
    setIngredients(ingredients.map((i, n) => (n >= start && n <= end ? { ...i, group } : i)))
  }
  const removeHeading = (k) => setSectionGroup(k, secs[k - 1]?.group ?? '')

  // Drag handles: rows (also into another group), whole groups, and steps
  const [drag, beginDrag] = useDragSort()
  const listBox = useRef(null)
  const rowEls = useRef([])
  const secEls = useRef([])
  const stepBox = useRef(null)
  const stepEls = useRef([])
  const place = (container, slot) => {
    const [kind, n, edge] = slot.at
    const el = (kind === 'row' ? rowEls : kind === 'section' ? secEls : stepEls).current[n]
    return { ...slot, y: edgeIn(container, el, edge) + (edge === 'top' ? -3 : 3) }
  }
  const dragRow = (e, n) =>
    beginDrag(e, {
      id: `row${n}`,
      container: listBox.current,
      slots: rowSlots(secs).map((s) => place(listBox.current, s)),
      onDrop: (s) => setIngredients(moveRow(ingredients, n, s.to, s.group)),
    })
  const stepRow = (n, by) => {
    const s = rowStep(ingredients, n, by)
    if (s) setIngredients(moveRow(ingredients, n, s.to, s.group))
  }
  const dragGroup = (e, k) =>
    beginDrag(e, {
      id: `sec${k}`,
      container: listBox.current,
      slots: groupSlots(secs).map((s) => place(listBox.current, s)),
      onDrop: (s) => setIngredients(moveRun(ingredients, secs[k].start, secs[k].end, s.to)),
    })
  const stepGroup = (k, by) => {
    const slots = groupSlots(secs)
    const here = slots.findIndex((s) => s.to === (by < 0 ? secs[k].start : secs[k].end + 1))
    const s = slots[here + by]
    if (here >= 0 && s) setIngredients(moveRun(ingredients, secs[k].start, secs[k].end, s.to))
  }
  const dragStep = (e, n) =>
    beginDrag(e, {
      id: `step${n}`,
      container: stepBox.current,
      slots: [...list.map((_, k) => ({ to: k, at: ['step', k, 'top'] })), { to: list.length, at: ['step', list.length - 1, 'bottom'] }].map((s) =>
        place(stepBox.current, s),
      ),
      onDrop: (s) => move(n, s.to),
    })
  const lifted = (id) => (drag?.id === id ? { className: ' dragging', style: { transform: `translateY(${drag.dy}px)` } } : { className: '', style: undefined })

  const [focusGroup, setFocusGroup] = useState(null)
  const addGroup = () => {
    const taken = new Set(ingredients.map((i) => i.group))
    let n = taken.size + (taken.has('') ? 0 : 1)
    while (taken.has(`Group ${n}`)) n++
    setFocusGroup(secs.length)
    setIngredients([...ingredients, emptyIngredient(`Group ${n}`)])
  }

  return (
    <div className="editor">
      <h3>Ingredients {source ? <span className="note">(from the {source})</span> : null}</h3>
      <>
        <div className={`ingredients${drag ? ' sorting' : ''}`} ref={listBox}>
          {ingredients.length > 0 && (
            <div className="ing-row ing-head" aria-hidden="true">
              <span className="grip" />
              <span className="pic" />
              <span className="qty">Qty</span>
              <span className="unit">Unit</span>
              <span className="name">Ingredient</span>
              <span className="del" />
            </div>
          )}
          {secs.map((sec, k) => (
            <div key={k} ref={(el) => (secEls.current[k] = el)} className={`ing-section${lifted(`sec${k}`).className}`} style={lifted(`sec${k}`).style}>
              {sec.group && (
                <GroupHeading
                  name={sec.group}
                  autoFocus={focusGroup === k}
                  onFocused={() => setFocusGroup(null)}
                  onRename={(to) => setSectionGroup(k, to)}
                  onAdd={() => insertAfter(sec.end)}
                  onDrag={(e) => dragGroup(e, k)}
                  onStep={(by) => stepGroup(k, by)}
                  onRemove={() => removeHeading(k)}
                />
              )}
              {ingredients.slice(sec.start, sec.end + 1).map((i, r) => {
                const n = sec.start + r
                const lift = lifted(`row${n}`)
                return (
                  <div key={n} ref={(el) => (rowEls.current[n] = el)} className={`ing-row${lift.className}`} style={lift.style}>
                    <Grip label={`Drag ${i.name.trim() || 'ingredient'}`} onDrag={(e) => dragRow(e, n)} onStep={(by) => stepRow(n, by)} />
                    <span className="pic">
                      <IngredientIcon entry={match(i.name)} size={22} />
                    </span>
                    <input className="qty" aria-label="Amount" inputMode="decimal" value={i.qty} onChange={(e) => update(n, 'qty', e.target.value)} />
                    <button type="button" className={`unit unit-btn${i.unit ? '' : ' no-unit'}`} aria-label={`Unit: ${i.unit || 'none'}`} onClick={() => setUnitFor(n)}>
                      {i.unit || (i.qty.trim() ? 'pcs' : '–')}
                    </button>
                    <input className="name" aria-label="Ingredient" value={i.name} onChange={(e) => update(n, 'name', e.target.value)} />
                    <button className="icon del" aria-label="Remove ingredient" onClick={() => remove(n)}>
                      <Icon name="close" />
                    </button>
                  </div>
                )
              })}
            </div>
          ))}
          {drag && !drag.id.startsWith('step') && <div className="drop-line" style={{ top: drag.line }} />}
        </div>
        <div className="row">
          <button className="secondary" onClick={() => insertAfter(ingredients.length - 1)}>
            Add ingredient
          </button>
          <button className="secondary" onClick={addGroup}>
            <Icon name="plus" /> Add group
          </button>
        </div>
        {ingredients.length > 1 && !ingredients.some((i) => i.group) && <p className="hint">Groups split the list, e.g. “For the meat” and “For the sauce”.</p>}
      </>

      {unitFor != null && ingredients[unitFor] && (
        <UnitSheet
          recipe
          title={ingredients[unitFor].name.trim() ? `Unit for ${ingredients[unitFor].name.trim()}` : 'Unit'}
          value={ingredients[unitFor].unit}
          onPick={(u) => {
            update(unitFor, 'unit', u)
            setUnitFor(null)
          }}
          onClose={() => setUnitFor(null)}
        />
      )}

      <h3>Steps</h3>
      <ol className={`step-edit${drag?.id.startsWith('step') ? ' sorting' : ''}`} ref={stepBox}>
        {list.map((text, n) => (
          <li key={n} ref={(el) => (stepEls.current[n] = el)} className={lifted(`step${n}`).className.trim() || undefined} style={lifted(`step${n}`).style}>
            <div className="step-edit-head">
              {list.length > 1 && <Grip label={`Drag step ${n + 1}`} onDrag={(e) => dragStep(e, n)} onStep={(by) => n + by >= 0 && n + by < list.length && move(n, by < 0 ? n - 1 : n + 2)} />}
              <span className="step-no">{n + 1}</span>
              <span className="grow" />
              <button className="icon" aria-label="Remove step" onClick={() => removeStep(n)}>
                <Icon name="close" />
              </button>
            </div>
            <textarea rows={2} aria-label={`Step ${n + 1}`} placeholder={n === 0 ? 'What to do first' : 'Then…'} value={text} onChange={(e) => setStep(n, e.target.value)} />
          </li>
        ))}
        {drag?.id.startsWith('step') && <div className="drop-line" style={{ top: drag.line }} />}
      </ol>
      <div className="row">
        <button className="secondary" onClick={() => setSteps([...list, ''])}>
          <Icon name="plus" /> Add step
        </button>
      </div>
      <div className="row">
        <button className="secondary" onClick={onReset}>
          Re-read from source
        </button>
      </div>
    </div>
  )
}

/**
 * A group's name above its rows, with a handle to drag the whole group and
 * buttons to add a row or remove the heading (its rows join the group above).
 */
function GroupHeading({ name, autoFocus, onFocused, onRename, onAdd, onDrag, onStep, onRemove }) {
  // Kept here while the box is emptied to type a new name; a blank name on leaving removes the heading
  const [text, setText] = useState(name)
  const [was, setWas] = useState(name)
  if (name !== was) {
    // Changed from outside (the heading moved)
    setWas(name)
    setText(name)
  }
  return (
    <div className="group-edit">
      <Grip label={`Drag group ${name}`} onDrag={onDrag} onStep={onStep} />
      <input
        className="group"
        aria-label="Group name"
        placeholder="Group, e.g. For the sauce"
        value={text}
        autoFocus={autoFocus}
        onFocus={
          autoFocus
            ? (e) => {
                e.target.select()
                onFocused()
              }
            : undefined
        }
        onChange={(e) => {
          setText(e.target.value)
          if (e.target.value.trim()) {
            setWas(e.target.value)
            onRename(e.target.value)
          }
        }}
        onBlur={() => {
          if (!text.trim()) onRemove()
        }}
      />
      <button className="icon" aria-label={`Add ingredient to ${name}`} onClick={onAdd}>
        <Icon name="plus" />
      </button>
      <button className="icon" aria-label={`Remove group ${name}`} onClick={onRemove}>
        <Icon name="close" />
      </button>
    </div>
  )
}

/** A drag handle; with the keyboard, the up and down arrows move the item one place. */
function Grip({ label, onDrag, onStep }) {
  return (
    <button
      type="button"
      className="icon grip"
      aria-label={label}
      title="Drag to move"
      onPointerDown={onDrag}
      onKeyDown={(e) => {
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
        e.preventDefault()
        onStep(e.key === 'ArrowUp' ? -1 : 1)
      }}
    >
      <Icon name="grip" size={16} />
    </button>
  )
}

/** At least one (empty) box to type the first step in. */
const withBlank = (list) => (list.length ? list : [''])
