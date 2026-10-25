import { useEffect, useRef, useState } from 'react'
import { IngredientIcon, useCatalog } from './catalog.jsx'
import { findTimers, formatClock, splitSteps, stepIngredients } from './lib/cook.js'

const amount = (i) => [i.qty, i.unit].filter((x) => String(x ?? '').trim()).join(' ')

function beep() {
  try {
    const ctx = new AudioContext()
    for (let n = 0; n < 3; n++) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = 880
      gain.gain.value = 0.25
      osc.connect(gain).connect(ctx.destination)
      osc.start(ctx.currentTime + n * 0.4)
      osc.stop(ctx.currentTime + n * 0.4 + 0.25)
    }
    setTimeout(() => ctx.close(), 1600)
  } catch {
    // no sound available
  }
  navigator.vibrate?.([300, 150, 300, 150, 300])
}

/** One step at a time in big text, with the step's ingredients and timers. Keeps the screen on. */
export default function CookMode({ title, ingredients, steps: stepsText, stockPlan = [], onUseStock, onClose }) {
  const { match } = useCatalog()
  const steps = splitSteps(stepsText)
  const [at, setAt] = useState(0) // steps.length means "done"
  const [showAll, setShowAll] = useState(at === 0)
  const [timers, setTimers] = useState([]) // { id, label, endsAt, done }
  const [now, setNow] = useState(Date.now())
  const [stockDone, setStockDone] = useState(null) // null, 'saving', 'done', or an error
  const touch = useRef(null)

  // Screen stays on while cooking
  useEffect(() => {
    let lock = null
    const take = async () => {
      try {
        lock = await navigator.wakeLock?.request('screen')
      } catch {
        lock = null
      }
    }
    take()
    const onVisible = () => document.visibilityState === 'visible' && take()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      lock?.release().catch(() => {})
    }
  }, [])

  useEffect(() => {
    if (!timers.some((t) => !t.done)) return
    const id = setInterval(() => {
      const t = Date.now()
      setNow(t)
      setTimers((list) => {
        if (!list.some((x) => !x.done && x.endsAt <= t)) return list
        beep()
        return list.map((x) => (!x.done && x.endsAt <= t ? { ...x, done: true } : x))
      })
    }, 500)
    return () => clearInterval(id)
  }, [timers])

  const goTo = (n) => setAt(Math.max(0, Math.min(steps.length, n)))
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') setAt((n) => Math.min(steps.length, n + 1))
      if (e.key === 'ArrowLeft') setAt((n) => Math.max(0, n - 1))
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [steps.length, onClose])

  const step = steps[at]
  const used = step ? stepIngredients(step, ingredients, match) : []
  const startTimer = (t) => setTimers((list) => [...list, { id: Date.now(), label: t.label, endsAt: Date.now() + t.seconds * 1000, done: false }])

  return (
    <div
      className="cook"
      role="dialog"
      aria-label={`Cooking ${title}`}
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - (touch.current ?? 0)
        if (Math.abs(dx) > 70) goTo(at + (dx < 0 ? 1 : -1))
      }}
    >
      <div className="cook-top">
        <button className="icon-button" aria-label="Close cooking mode" onClick={onClose}>
          ✕
        </button>
        <div className="cook-title">{title || 'Recipe'}</div>
        <button className="link" onClick={() => setShowAll((v) => !v)}>
          {showAll ? 'Hide ingredients' : 'Ingredients'}
        </button>
      </div>
      <div className="cook-progress" aria-hidden="true">
        <div style={{ width: `${steps.length ? (Math.min(at + 1, steps.length) / steps.length) * 100 : 0}%` }} />
      </div>

      {timers.length > 0 && (
        <div className="cook-timers">
          {timers.map((t) => (
            <button key={t.id} className={`timer${t.done ? ' done' : ''}`} onClick={() => setTimers((l) => l.filter((x) => x.id !== t.id))} aria-label={`${t.label} timer, tap to remove`}>
              ⏱ {t.done ? `${t.label} done` : formatClock((t.endsAt - now) / 1000)} <span aria-hidden="true">✕</span>
            </button>
          ))}
        </div>
      )}

      <div className="cook-body">
        {showAll && step && (
          <ul className="cook-ingredients all">
            {ingredients.filter((i) => i.name?.trim()).map((i, n) => (
              <li key={n}>
                <IngredientIcon entry={match(i.name)} size={32} />
                <span>
                  {amount(i) && <strong>{amount(i)} </strong>}
                  {i.name}
                </span>
              </li>
            ))}
          </ul>
        )}

        {steps.length === 0 ? (
          <p className="cook-step">This recipe has no steps yet. Add them with Edit.</p>
        ) : step ? (
          <>
            <div className="cook-count">
              Step {at + 1} of {steps.length}
            </div>
            <p className="cook-step">{step}</p>
            {findTimers(step).length > 0 && (
              <div className="row">
                {findTimers(step).map((t, n) => (
                  <button key={n} className="secondary" onClick={() => startTimer(t)}>
                    ⏱ Start {t.label} timer
                  </button>
                ))}
              </div>
            )}
            {used.length > 0 && (
              <ul className="cook-ingredients">
                {used.map((n) => (
                  <li key={n}>
                    <IngredientIcon entry={match(ingredients[n].name)} size={32} />
                    <span>
                      {amount(ingredients[n]) && <strong>{amount(ingredients[n])} </strong>}
                      {ingredients[n].name}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <div className="cook-done">
            <div className="cook-step">Enjoy your meal!</div>
            {stockPlan.length > 0 && onUseStock && (
              <div className="card stock-plan">
                <h2>Take it out of the stock?</h2>
                <ul>
                  {stockPlan.map((p) => (
                    <li key={p.item.id}>
                      <span>{p.item.name}</span>
                      <span className="note">
                        {p.item.amount} − {p.used} → <strong>{p.next}</strong>
                      </span>
                    </li>
                  ))}
                </ul>
                {stockDone === 'done' ? (
                  <p className="hint">Stock updated.</p>
                ) : (
                  <button
                    className="secondary"
                    disabled={stockDone === 'saving'}
                    onClick={async () => {
                      setStockDone('saving')
                      try {
                        await onUseStock(stockPlan)
                        setStockDone('done')
                      } catch (e) {
                        setStockDone(e?.message ?? String(e))
                      }
                    }}
                  >
                    {stockDone === 'saving' ? 'Updating…' : 'Update the stock'}
                  </button>
                )}
                {stockDone && !['saving', 'done'].includes(stockDone) && <p className="hint error">{stockDone}</p>}
              </div>
            )}
            <button onClick={onClose}>Back to the recipe</button>
          </div>
        )}
      </div>

      <div className="cook-nav">
        <button className="secondary" disabled={at === 0} onClick={() => goTo(at - 1)}>
          ← Back
        </button>
        {at < steps.length && <button onClick={() => goTo(at + 1)}>{at === steps.length - 1 ? 'Finish' : 'Next →'}</button>}
      </div>
    </div>
  )
}
