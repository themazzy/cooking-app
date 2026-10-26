import { useEffect, useRef, useState } from 'react'
import { IngredientIcon, useCatalog } from './catalog.jsx'
import StockReview from './StockReview.jsx'
import { allowAlarms, audio, cancelAlarm, nativeAlarms, ring, scheduleAlarm } from './lib/alarm.js'
import { adjustTimer, findTimers, formatClock, newTimer, pauseTimer, restartTimer, resumeTimer, splitSteps, stepIngredients, timeLeft } from './lib/cook.js'
import Icon from './Icon.jsx'

const amount = (i) => [i.qty, i.unit].filter((x) => String(x ?? '').trim()).join(' ')
const RING_EVERY = 4000 // ms between alarm rounds while a finished timer is not stopped
const RING_FOR = 2 * 60 * 1000 // then it stays red but quiet

function Ingredient({ ing, match }) {
  return (
    <li>
      <IngredientIcon entry={match(ing.name)} size={32} />
      <span>
        {amount(ing) && <strong>{amount(ing)} </strong>}
        {ing.name}
      </span>
    </li>
  )
}

function Timer({ t, now, onChange, onRemove }) {
  const running = t.endsAt != null && !t.done
  return (
    <div className={`cook-timer${t.done ? ' done' : running ? '' : ' paused'}`} role="group" aria-label={`${t.label} timer`}>
      <div className="cook-timer-time">
        <span className="cook-timer-clock">{t.done ? 'Done' : formatClock(timeLeft(t, now))}</span>
        <span className="cook-timer-label">{t.label}</span>
      </div>
      <button className="secondary" aria-label="One minute less" disabled={t.done} onClick={() => onChange(adjustTimer(t, -60))}>
        −1
      </button>
      <button className="secondary" aria-label="One minute more" onClick={() => onChange(adjustTimer(t, 60))}>
        +1
      </button>
      {t.done ? (
        <button className="secondary" aria-label="Start again" onClick={() => onChange(restartTimer(t))}>
          ↻
        </button>
      ) : (
        <button className="secondary" aria-label={running ? 'Pause' : 'Resume'} onClick={() => onChange(running ? pauseTimer(t) : resumeTimer(t))}>
          {running ? '❚❚' : '▶'}
        </button>
      )}
      <button className={t.done ? 'stop' : 'secondary'} aria-label="Stop timer" onClick={onRemove}>
        {t.done ? 'Stop' : '✕'}
      </button>
    </div>
  )
}

/** Each step on its own card, swiped one at a time, with the step's ingredients and timers. Keeps the screen on. */
export default function CookMode({ title, ingredients, steps: stepsText, alarm = {}, stockPlan = [], onUseStock, onCooked, onClose }) {
  const { match } = useCatalog()
  const steps = splitSteps(stepsText)
  const [at, setAt] = useState(0) // steps.length means "done"
  const [showAll, setShowAll] = useState(true)
  const [timers, setTimers] = useState([])
  const [now, setNow] = useState(Date.now())
  const [custom, setCustom] = useState(null) // minutes typed for a new timer, while the form is open
  const [cookedNote, setCookedNote] = useState('')
  const [logged, setLogged] = useState(false)
  const track = useRef(null)
  const rang = useRef({}) // timer id → { first, last } alarm times
  const alarmRef = useRef(alarm)
  alarmRef.current = alarm
  const scheduled = useRef({}) // timer id → the time Android is set to ring it

  // Android rings each running timer at its end, even with the phone locked or
  // another app open; pausing or removing a timer takes its alarm off
  useEffect(() => {
    if (!nativeAlarms) return
    const was = scheduled.current
    const next = {}
    for (const t of timers) {
      if (t.done) {
        if (was[t.id]) next[t.id] = was[t.id] // ringing until stopped
      } else if (t.endsAt != null) {
        if (was[t.id] !== t.endsAt) scheduleAlarm(t.id, t.endsAt, { title: `${t.label} timer is done`, text: title || 'Cooking', ...alarmRef.current })
        next[t.id] = t.endsAt
      }
    }
    for (const id of Object.keys(was)) if (!next[id]) cancelAlarm(id)
    scheduled.current = next
  }, [timers, title])
  // Closing cooking mode removes its timers, and their alarms with them
  useEffect(() => () => Object.keys(scheduled.current).forEach(cancelAlarm), [])

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

  // Ticks while a timer runs or rings
  const active = timers.some((t) => t.endsAt != null)
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => {
      const t = Date.now()
      setNow(t)
      setTimers((list) => {
        let ringNow = false
        const next = list.map((x) => {
          if (!x.done && x.endsAt != null && x.endsAt <= t) {
            rang.current[x.id] = { first: t, last: 0 }
            return { ...x, done: true }
          }
          return x
        })
        for (const x of next) {
          const r = x.done && rang.current[x.id]
          if (r && t - r.first < RING_FOR && t - r.last >= RING_EVERY) {
            r.last = t
            ringNow = true
          }
        }
        // The Android app rings from its own notification instead
        if (ringNow && !nativeAlarms) ring(alarmRef.current)
        return next.some((x, n) => x !== list[n]) ? next : list
      })
    }, 500)
    return () => clearInterval(id)
  }, [active])

  const showList = showAll && steps.length > 0
  // Back from the ingredients list, the track shows the step you were on
  useEffect(() => {
    if (!showList) track.current?.children[at]?.scrollIntoView({ inline: 'center', block: 'nearest' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showList])

  const goTo = (n) => {
    const to = Math.max(0, Math.min(steps.length, n))
    setAt(to)
    track.current?.children[to]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }
  const goRef = useRef(goTo)
  goRef.current = goTo
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.('input, textarea')) return
      if (e.key === 'ArrowRight') goRef.current(at + 1)
      if (e.key === 'ArrowLeft') goRef.current(at - 1)
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [at, onClose])

  // The card nearest the middle is the current step, whether swiped or tapped to
  const onScroll = () => {
    const el = track.current
    if (!el) return
    const mid = el.scrollLeft + el.clientWidth / 2
    let best = 0
    ;[...el.children].forEach((c, n) => {
      const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid)
      const b = el.children[best]
      if (d < Math.abs(b.offsetLeft + b.offsetWidth / 2 - mid)) best = n
    })
    if (best !== at) setAt(best)
  }

  const addTimer = (label, seconds) => {
    audio() // a tap lets the alarm play later
    allowAlarms()
    setTimers((list) => [...list, newTimer(label, seconds)])
    setNow(Date.now())
  }
  const setTimer = (t) => {
    if (!t.done) delete rang.current[t.id]
    setTimers((list) => list.map((x) => (x.id === t.id ? t : x)))
  }
  const removeTimer = (id) => {
    delete rang.current[id]
    setTimers((list) => list.filter((x) => x.id !== id))
  }
  const startCustom = () => {
    const min = Number(String(custom).replace(',', '.'))
    if (min > 0) addTimer(`${custom} min`, Math.round(min * 60))
    setCustom(null)
  }

  return (
    <div className="cook" role="dialog" aria-label={`Cooking ${title}`}>
      <div className="cook-top">
        <button className="icon-button" aria-label="Close cooking mode" onClick={onClose}>
          ✕
        </button>
        <div className="cook-title">{title || 'Recipe'}</div>
        <button className="link" onClick={() => setCustom((c) => (c == null ? '5' : null))}>
          <Icon name="timer" /> Timer
        </button>
        <button className="link" onClick={() => setShowAll((v) => !v)}>
          {showAll ? 'Hide' : 'Ingredients'}
        </button>
      </div>
      <div className="cook-progress" aria-hidden="true">
        <div style={{ width: `${steps.length ? (Math.min(at + 1, steps.length) / steps.length) * 100 : 0}%` }} />
      </div>

      {custom != null && (
        <form
          className="cook-custom"
          onSubmit={(e) => {
            e.preventDefault()
            startCustom()
          }}
        >
          <input type="number" inputMode="decimal" min="0.1" step="any" value={custom} onChange={(e) => setCustom(e.target.value)} aria-label="Minutes" autoFocus />
          <span>min</span>
          {[1, 3, 5, 10, 15].map((m) => (
            <button key={m} type="button" className="secondary" onClick={() => setCustom(String(m))}>
              {m}
            </button>
          ))}
          <button type="submit">Start</button>
        </form>
      )}

      {timers.length > 0 && (
        <div className="cook-timers">
          {timers.map((t) => (
            <Timer key={t.id} t={t} now={now} onChange={setTimer} onRemove={() => removeTimer(t.id)} />
          ))}
        </div>
      )}

      {showList && (
        <div className="cook-all">
          <ul className="cook-ingredients all">
            {ingredients.filter((i) => i.name?.trim()).map((i, n) => (
              <Ingredient key={n} ing={i} match={match} />
            ))}
          </ul>
          <button className="secondary" onClick={() => setShowAll(false)}>
            Go to the steps
          </button>
        </div>
      )}

      <div className="cook-track" ref={track} onScroll={onScroll} style={showList ? { display: 'none' } : undefined}>
        {steps.length === 0 ? (
          <section className="cook-card current">
            <p className="cook-step">This recipe has no steps yet. Add them with Edit.</p>
          </section>
        ) : (
          steps.map((step, n) => {
            const used = stepIngredients(step, ingredients, match)
            const found = findTimers(step)
            return (
              <section key={n} className={`cook-card${n === at ? ' current' : ''}`} aria-label={`Step ${n + 1} of ${steps.length}`} onClick={() => n !== at && goTo(n)}>
                <div className="cook-count">
                  Step {n + 1} of {steps.length}
                </div>
                <p className="cook-step">{step}</p>
                {found.length > 0 && (
                  <div className="row">
                    {found.map((t, k) => (
                      <button key={k} className="secondary" onClick={() => addTimer(t.label, t.seconds)}>
                        <Icon name="timer" /> Start {t.label} timer
                      </button>
                    ))}
                  </div>
                )}
                {used.length > 0 && (
                  <ul className="cook-ingredients">
                    {used.map((k) => (
                      <Ingredient key={k} ing={ingredients[k]} match={match} />
                    ))}
                  </ul>
                )}
              </section>
            )
          })
        )}
        {steps.length > 0 && (
          <section className={`cook-card${at === steps.length ? ' current' : ''}`}>
          <div className="cook-done">
            <div className="cook-step">Enjoy your meal!</div>
            {onCooked && (
              <div className="card stock-plan">
                <h2>Add to the cooking history?</h2>
                {logged ? (
                  <p className="hint">Saved as cooked today.</p>
                ) : (
                  <>
                    <textarea rows="2" placeholder="A note for next time (optional)" value={cookedNote} onChange={(e) => setCookedNote(e.target.value)} />
                    <button
                      className="secondary"
                      onClick={() => {
                        onCooked(cookedNote)
                        setLogged(true)
                      }}
                    >
                      ✓ Cooked it today
                    </button>
                  </>
                )}
              </div>
            )}
            {onUseStock && <StockReview rows={stockPlan} onApply={onUseStock} />}
            <button onClick={onClose}>Back to the recipe</button>
            </div>
          </section>
        )}
      </div>

      <div className="cook-nav" style={showList ? { display: 'none' } : undefined}>
        <button className="secondary" disabled={at === 0} onClick={() => goTo(at - 1)}>
          ← Back
        </button>
        {at < steps.length && <button onClick={() => goTo(at + 1)}>{at === steps.length - 1 ? 'Finish' : 'Next →'}</button>}
      </div>
    </div>
  )
}
