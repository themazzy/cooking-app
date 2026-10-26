import { IngredientIcon, useCatalog } from './catalog.jsx'
import { swapIngredient, swapsFor } from './lib/swaps.js'
import Icon from './Icon.jsx'

const amountText = (i) => [i.qty, i.unit].filter((x) => String(x ?? '').trim()).join(' ')

/**
 * What to use instead of one ingredient, with the amount for the portions
 * being cooked. `onUse(swap)` puts it in the recipe; `onRestore` goes back to
 * the ingredient it replaced.
 */
export default function SwapSheet({ ingredient, onUse, onRestore, onClose }) {
  const { match } = useCatalog()
  const swaps = swapsFor(match(ingredient.name))
  const was = ingredient.swappedFrom

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={`Instead of ${ingredient.name}`} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" aria-hidden="true" />
        <h2>Instead of {ingredient.name}</h2>
        {amountText(ingredient) && <p className="hint">The recipe uses {amountText(ingredient)}{onUse ? '. Amounts below are for the portions you are cooking.' : '.'}</p>}
        {was && onRestore && (
          <button className="secondary swap-restore" onClick={onRestore}>
            <Icon name="undo" size={16} /> Back to {was.name}
          </button>
        )}
        {swaps.length === 0 ? (
          <p className="hint">No common swaps known for this one.</p>
        ) : (
          <ul className="swap-list">
            {swaps.map((s) => {
              const next = swapIngredient(ingredient, s)
              return (
                <li key={s.name}>
                  <IngredientIcon entry={match(s.name)} size={36} />
                  <div className="grow">
                    <div>
                      {amountText(next) && <strong>{amountText(next)} </strong>}
                      {s.name}
                    </div>
                    {s.note && <div className="note">{s.note}</div>}
                  </div>
                  {onUse && (
                    <button className="secondary" onClick={() => onUse(s)}>
                      Use
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
