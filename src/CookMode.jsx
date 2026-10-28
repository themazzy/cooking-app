import { Fragment, useEffect, useRef, useState } from 'react'
import { IngredientIcon, useCatalog } from './catalog.jsx'
import StockReview from './StockReview.jsx'
import Stars from './Stars.jsx'
import { allowAlarms, audio, cancelAlarm, nativeAlarms, ring, scheduleAlarm } from './lib/alarm.js'
import { canListen, canSpeak, listen, speak, voiceCommand } from './lib/voice.js'
import { scrollByBlock } from './lib/blockScroll.js'
import { toast } from './lib/toast.js'
import { adjustTimer, findTimers, formatClock, newTimer, pauseTimer, restartTimer, resumeTimer, splitSteps, stepIngredients, stepParts, stepTextScale, timeLeft } from './lib/cook.js'
import Icon from './Icon.jsx'
import NumberField from './NumberField.jsx'

const amount = (i) => [i.qty, i.unit].filter((x) => String(x ?? '').trim()).join(' ')
const RING_EVERY = 4000 // ms between alarm rounds while a finished timer is not stopped
const RING_FOR = 2 * 60 * 1000 // then it stays red but quiet
const VOICE_KEY = 'cooking-app:voice' // listening was on last time, so it starts again
const TEXT_KEY = 'cooking-app:cook-text' // text size picked on this phone
const TEXT_SIZES = [
  [1, 'Normal text'],
  [1.15, 'Large text'],
  [1.3, 'Largest text'],
]
const SAID = { next: 'Next step', back: 'Back', timer: 'Timer', ingredients: 'Ingredients', steps: 'Steps', down: 'Scroll down', up: 'Scroll up', read: 'Reading', quiet: 'Quiet' }

const stored = (key) => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
const store = (key, value) => {
  try {
    localStorage.setItem(key, value)
  } catch {
    // not remembered; fine
  }
}
const voiceWanted = () => stored(VOICE_KEY) === 'on'
const rememberVoice = (on) => store(VOICE_KEY, on ? 'on' : 'off')

/** A tick box with the ingredient: ticked once it is measured out or in the pan. */
function Ingredient({ ing, match, done, onToggle }) {
  return (
    <li className={done ? 'done' : ''}>
      <button type="button" role="checkbox" aria-checked={done} onClick={onToggle}>
        <span className="cook-tick" aria-hidden="true">
          {done && <Icon name="check" size={14} strokeWidth={3} />}
        </span>
        <IngredientIcon entry={match(ing.name)} size={28} />
        <span className="cook-ing-text">
          {amount(ing) && <strong>{amount(ing)} </strong>}
          {ing.name}
        </span>
      </button>
    </li>
  )
}

/** The step's text with its amounts in bold and its times as buttons that start a timer. */
function StepText({ step, running, onTimer }) {
  return (
    <p className="cook-step" style={{ '--fit': stepTextScale(step) }}>
      {stepParts(step).map((p, k) =>
        p.timer ? (
          <button key={k} type="button" className={`cook-time${running(p.timer.label) ? ' on' : ''}`} aria-label={`Start ${p.timer.label} timer`} onClick={() => onTimer(p.timer)}>
            <Icon name="timer" size={15} />
            {p.text}
          </button>
        ) : p.amount ? (
          <strong key={k}>{p.text}</strong>
        ) : (
          <Fragment key={k}>{p.text}</Fragment>
        ),
      )}
    </p>
  )
}

/** A running timer as a small pill in the dock; a ringing one turns red with Stop. */
function TimerPill({ t, now, onOpen, onStop }) {
  const running = t.endsAt != null && !t.done
  return (
    <div className={`cook-pill${t.done ? ' done' : running ? '' : ' paused'}`}>
      <button type="button" className="cook-pill-main" onClick={onOpen} aria-label={`${t.label} timer${t.step != null ? `, step ${t.step + 1}` : ''}`}>
        <strong>{t.done ? 'Done' : formatClock(timeLeft(t, now))}</strong>
        <span>
          {t.label}
          {t.step != null && ` · step ${t.step + 1}`}
        </span>
      </button>
      {t.done && (
        <button type="button" className="cook-pill-stop" onClick={onStop}>
          Stop
        </button>
      )}
    </div>
  )
}

/** A sheet over cooking mode. Back and a tap outside close it. */
function Sheet({ label, onClose, children }) {
  return (
    <div className="sheet-backdrop cook-sheet" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={label} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" aria-hidden="true" />
        {children}
      </div>
    </div>
  )
}

/**
 * Cooking mode: a get-ready list of the ingredients to tick off, then each step on
 * its own card (its ingredients first, times to tap), swiped one at a time, with
 * running timers in a dock at the bottom. Keeps the screen on.
 */
export default function CookMode({
  title,
  ingredients,
  steps: stepsText,
  portions,
  servings,
  onPortions,
  notes = [],
  rating = null,
  onRate,
  alarm = {},
  stockPlan = [],
  onUseStock,
  onCooked,
  onClose,
}) {
  const { match } = useCatalog()
  const steps = splitSteps(stepsText)
  const [at, setAt] = useState(0) // steps.length means "done"
  const [view, setView] = useState(steps.length ? 'ingredients' : 'steps')
  const [ticked, setTicked] = useState(() => new Set()) // indexes of ingredients measured out or added
  const [timers, setTimers] = useState([])
  const [now, setNow] = useState(Date.now())
  const [sheet, setSheet] = useState(null) // 'timer' (new one), 'steps', or a timer id
  const [custom, setCustom] = useState('5') // minutes typed for a new timer
  const [customName, setCustomName] = useState('')
  const [textSize, setTextSize] = useState(() => Math.max(0, TEXT_SIZES.findIndex(([v]) => String(v) === stored(TEXT_KEY))))
  const [voice, setVoice] = useState(false) // listening for "next", "back"…
  const [reading, setReading] = useState(null) // stop() while a step is read aloud
  const [cookedNote, setCookedNote] = useState('')
  const [logIt, setLogIt] = useState(!!onCooked)
  const [stockRows, setStockRows] = useState([])
  const [saving, setSaving] = useState(false)
  const track = useRef(null)
  const listRef = useRef(null)
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
        if (was[t.id] !== t.endsAt)
          scheduleAlarm(t.id, t.endsAt, { title: `${t.label} timer is done`, text: [title || 'Cooking', t.step != null ? `step ${t.step + 1}` : null].filter(Boolean).join(', '), ...alarmRef.current })
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

  const showList = view === 'ingredients' && steps.length > 0
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
  const showStep = (n) => {
    setView('steps')
    if (showList) setAt(Math.max(0, Math.min(steps.length, n))) // the effect above scrolls there
    else goTo(n)
  }
  const goRef = useRef(goTo)
  goRef.current = goTo
  const sheetRef = useRef(sheet)
  sheetRef.current = sheet
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') return sheetRef.current != null ? setSheet(null) : onClose()
      if (e.target.closest?.('input, textarea') || sheetRef.current != null) return
      if (e.key === 'ArrowRight') goRef.current(at + 1)
      if (e.key === 'ArrowLeft') goRef.current(at - 1)
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

  const toggle = (n) =>
    setTicked((set) => {
      const next = new Set(set)
      if (!next.delete(n)) next.add(n)
      return next
    })

  const addTimer = (label, seconds, step = null) => {
    audio() // a tap lets the alarm play later
    allowAlarms()
    setTimers((list) => [...list, { ...newTimer(label, seconds), step }])
    setNow(Date.now())
  }
  const runningAt = (step) => (label) => timers.some((t) => t.step === step && t.label === label && !t.done)
  // A time tapped in a step starts its timer once; tapped again it shows the running one
  const stepTimer = (step, { label, seconds }) => {
    const running = timers.find((t) => t.step === step && t.label === label && !t.done)
    if (running) setSheet(running.id)
    else addTimer(label, seconds, step)
  }
  const setTimer = (t) => {
    if (!t.done) delete rang.current[t.id]
    setTimers((list) => list.map((x) => (x.id === t.id ? t : x)))
  }
  const removeTimer = (id) => {
    delete rang.current[id]
    setTimers((list) => list.filter((x) => x.id !== id))
    if (sheetRef.current === id) setSheet(null)
  }
  const startCustom = () => {
    const min = Number(String(custom).replace(',', '.'))
    const name = customName.trim()
    if (min > 0) addTimer(name ? `${name} · ${custom} min` : `${custom} min`, Math.round(min * 60))
    setSheet(null)
    setCustomName('')
  }
  const openTimer = timers.find((t) => t.id === sheet)

  const nextTextSize = () => {
    const n = (textSize + 1) % TEXT_SIZES.length
    setTextSize(n)
    store(TEXT_KEY, String(TEXT_SIZES[n][0]))
    toast(TEXT_SIZES[n][1], { kind: 'info', ms: 1000 })
  }

  // Read aloud: the step showing now, or the ingredient list while it is open
  const readingRef = useRef(null)
  readingRef.current = reading
  const stopReading = () => {
    readingRef.current?.()
    setReading(null)
  }
  const readAloud = (n = at) => {
    let text
    if (showList) {
      const list = ingredients.filter((i) => i.name?.trim()).map((i) => [amount(i), i.name].filter(Boolean).join(' '))
      text = list.length ? `Ingredients. ${list.join('. ')}.` : 'No ingredients.'
    } else if (steps.length === 0) text = 'This recipe has no steps yet.'
    else if (n >= steps.length) text = 'Enjoy your meal!'
    else text = `Step ${n + 1}. ${steps[n]}`
    const stop = speak(text, () => setReading((r) => (r === stop ? null : r)))
    setReading(() => stop)
  }
  useEffect(() => () => readingRef.current?.(), [])
  // Reading stops when the step changes by hand
  const readAt = useRef(at)
  useEffect(() => {
    if (readAt.current !== at) readingRef.current?.()
    readAt.current = at
  }, [at])

  // "Scroll down" / "scroll up" move what is showing by one piece of content
  const scrollStep = (dir) => {
    const el = showList ? listRef.current : track.current?.children[at]
    if (!scrollByBlock(el, dir)) toast(dir > 0 ? 'Already at the bottom' : 'Already at the top', { kind: 'info', ms: 1200 })
  }

  // Voice commands: what was heard acts on the step showing now
  const onCommandRef = useRef(null)
  onCommandRef.current = (command) => {
    if (readingRef.current && command !== 'quiet') return // the phone hearing itself read
    if (command === 'down' || command === 'up') return scrollStep(command === 'down' ? 1 : -1)
    if (command === 'read') readAloud()
    else if (command === 'quiet') stopReading()
    else if (command === 'next' || command === 'back') showStep(at + (command === 'next' ? 1 : -1))
    else if (command === 'ingredients') setView('ingredients')
    else if (command === 'steps') setView('steps')
    else if (command === 'timer') {
      const t = at < steps.length ? findTimers(steps[at])[0] : null
      if (!t) return toast('This step has no time to time', { kind: 'info' })
      addTimer(t.label, t.seconds, at)
    }
    toast(SAID[command], { kind: 'info', ms: 1200 })
  }
  const open = useRef(true)
  useEffect(() => {
    open.current = true
    return () => void (open.current = false)
  }, [])
  const startVoice = async () => {
    try {
      const stop = await listen(
        (text) => {
          const command = voiceCommand(text)
          if (command) onCommandRef.current(command)
        },
        (message) => {
          setVoice(false)
          if (message) toast(message, { kind: 'error' })
        },
      )
      if (!open.current) return stop() // closed while the microphone was being asked for
      setVoice(() => stop)
      rememberVoice(true)
    } catch (e) {
      setVoice(false)
      rememberVoice(false)
      toast(e?.code === 'denied' ? 'Allow the microphone to use voice commands' : (e?.message ?? 'Voice commands did not start'), { kind: 'error' })
    }
  }
  const stopVoice = () => {
    if (typeof voice === 'function') voice()
    setVoice(false)
    rememberVoice(false)
  }
  // Listening starts again if it was on last time, and stops when cooking mode closes
  const voiceRef = useRef(voice)
  voiceRef.current = voice
  useEffect(() => {
    if (canListen && voiceWanted()) startVoice()
    return () => typeof voiceRef.current === 'function' && voiceRef.current()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Done on the last card: the cooking history and what came out of the stock, then close
  const finish = async () => {
    setSaving(true)
    try {
      if (onUseStock && stockRows.length) await onUseStock(stockRows)
      if (onCooked && logIt) onCooked(cookedNote)
      const saved = [onCooked && logIt && 'cooking history', onUseStock && stockRows.length && 'At home'].filter(Boolean)
      if (saved.length) toast(`Saved to ${saved.join(' and ')}`)
      onClose()
    } catch (err) {
      setSaving(false)
      toast(err?.message ?? 'At home was not updated', { kind: 'error' })
    }
  }

  const named = ingredients.map((ing, n) => ({ ing, n })).filter(({ ing }) => ing.name?.trim())
  const readyCount = named.filter(({ n }) => ticked.has(n)).length
  // Ringing first, then the one that ends soonest
  const dock = [...timers].sort((a, b) => (b.done ? 1 : 0) - (a.done ? 1 : 0) || timeLeft(a, now) - timeLeft(b, now))

  return (
    <div className="cook" role="dialog" aria-label={`Cooking ${title}`} style={{ '--cook-text': TEXT_SIZES[textSize][0] }}>
      <div className="cook-top">
        <button className="icon-button" aria-label="Close cooking mode" onClick={onClose}>
          <Icon name="close" />
        </button>
        <div className="cook-title">{title || 'Recipe'}</div>
        {canListen && (
          <button
            className={`icon-button voice${voice ? ' on' : ''}`}
            aria-label={voice ? 'Stop voice commands' : 'Voice commands'}
            aria-pressed={!!voice}
            onClick={() => (voice ? stopVoice() : startVoice())}
          >
            <Icon name={voice ? 'mic' : 'micOff'} />
          </button>
        )}
        {canSpeak && (
          <button
            className={`icon-button voice${reading ? ' on' : ''}`}
            aria-label={reading ? 'Stop reading' : 'Read aloud'}
            aria-pressed={!!reading}
            onClick={() => (reading ? stopReading() : readAloud())}
          >
            <Icon name={reading ? 'quiet' : 'speak'} />
          </button>
        )}
        <button className="icon-button" aria-label="New timer" onClick={() => setSheet('timer')}>
          <Icon name="timer" />
        </button>
        <button className={`icon-button${textSize ? ' on' : ''}`} aria-label={`Text size: ${TEXT_SIZES[textSize][1]}`} onClick={nextTextSize}>
          <Icon name="textSize" />
        </button>
      </div>

      {steps.length > 0 && (
        <div className="segmented cook-switch" role="group" aria-label="Show">
          <button className={showList ? 'on' : ''} aria-pressed={showList} onClick={() => setView('ingredients')}>
            Ingredients
          </button>
          <button className={showList ? '' : 'on'} aria-pressed={!showList} onClick={() => setView('steps')}>
            Steps
          </button>
        </div>
      )}
      {!showList && steps.length > 0 && (
        <div className="cook-progress" aria-hidden="true">
          {steps.map((_, n) => (
            <i key={n} className={n < at ? 'done' : n === at ? 'now' : ''} />
          ))}
        </div>
      )}

      {voice && <p className="cook-voice">Listening: “next”, “back”, “scroll down”, “read”, “timer”, “ingredients”.</p>}

      {showList && (
        <div className="cook-all" ref={listRef}>
          {notes.map((note) => (
            <div key={note.label} className="cook-note">
              <span>{note.label}</span>
              <p>{note.text}</p>
            </div>
          ))}
          {onPortions && (
            <div className="cook-portions">
              <span>{servings ? 'Portions' : 'Recipe'}</span>
              <div className="stepper">
                <button className="secondary round" aria-label="Fewer portions" disabled={portions <= 1} onClick={() => onPortions(Math.max(1, portions - 1))}>
                  <Icon name="minus" />
                </button>
                <span className="count">{servings ? portions : `×${portions}`}</span>
                <button className="secondary round" aria-label="More portions" onClick={() => onPortions(Math.min(99, portions + 1))}>
                  <Icon name="plus" />
                </button>
              </div>
            </div>
          )}
          <ul className="cook-ingredients all">
            {named.map(({ ing, n }, k) => (
              <Fragment key={n}>
                {ing.group && ing.group !== named[k - 1]?.ing.group && <li className="group-title">{ing.group}</li>}
                <Ingredient ing={ing} match={match} done={ticked.has(n)} onToggle={() => toggle(n)} />
              </Fragment>
            ))}
          </ul>
          {named.length > 0 && (
            <p className="cook-ready">
              {readyCount === named.length ? 'Everything is ready' : `${readyCount} of ${named.length} ready`}
              {readyCount === 0 && <span>Tap to tick what you have out</span>}
            </p>
          )}
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
            return (
              <section key={n} className={`cook-card${n === at ? ' current' : ''}`} aria-label={`Step ${n + 1} of ${steps.length}`} onClick={() => n !== at && goTo(n)}>
                <div className="cook-count">
                  <span>
                    Step {n + 1} of {steps.length}
                  </span>
                  <button type="button" className="link" onClick={() => setSheet('steps')}>
                    <Icon name="list" size={16} /> All steps
                  </button>
                </div>
                {used.length > 0 && (
                  <ul className="cook-ingredients">
                    {used.map((k) => (
                      <Ingredient key={k} ing={ingredients[k]} match={match} done={ticked.has(k)} onToggle={() => toggle(k)} />
                    ))}
                  </ul>
                )}
                <StepText step={step} running={runningAt(n)} onTimer={(t) => stepTimer(n, t)} />
                <p className="cook-next">
                  <strong>Up next:</strong> {n + 1 < steps.length ? steps[n + 1] : 'Finish and enjoy'}
                </p>
              </section>
            )
          })
        )}
        {steps.length > 0 && (
          <section className={`cook-card cook-finish${at === steps.length ? ' current' : ''}`} aria-label="Finished">
            <h2 className="cook-done-title">Enjoy your meal</h2>
            {(onRate || onCooked) && (
              <div className="cook-finish-card">
                {onRate && (
                  <div className="cook-rate">
                    <strong>Your rating</strong>
                    <Stars value={rating} onChange={onRate} />
                  </div>
                )}
                {onCooked && (
                  <>
                    <textarea rows="2" placeholder="A note for next time (optional)" value={cookedNote} onChange={(e) => setCookedNote(e.target.value)} aria-label="Note for next time" />
                    <label className="check-row">
                      <input type="checkbox" checked={logIt} onChange={(e) => setLogIt(e.target.checked)} />
                      Add to the cooking history (today)
                    </label>
                  </>
                )}
              </div>
            )}
            {onUseStock && stockPlan.length > 0 && (
              <div className="cook-finish-card">
                <StockReview rows={stockPlan} onApply={onUseStock} embedded onChoose={setStockRows} />
              </div>
            )}
          </section>
        )}
      </div>

      {dock.length > 0 && (
        <div className="cook-dock" aria-label="Timers">
          {dock.map((t) => (
            <TimerPill key={t.id} t={t} now={now} onOpen={() => setSheet(t.id)} onStop={() => removeTimer(t.id)} />
          ))}
        </div>
      )}

      <div className="cook-nav">
        {showList ? (
          <button onClick={() => showStep(at)}>{at > 0 && at < steps.length ? `Back to step ${at + 1}` : 'Start cooking'}</button>
        ) : at >= steps.length && steps.length > 0 ? (
          <>
            <button className="secondary" onClick={() => goTo(at - 1)}>
              <Icon name="back" /> Back
            </button>
            <button disabled={saving} onClick={finish}>
              {saving ? 'Saving…' : 'Done'}
            </button>
          </>
        ) : (
          <>
            <button className="secondary" disabled={at === 0} onClick={() => goTo(at - 1)}>
              <Icon name="back" /> Back
            </button>
            {steps.length > 0 && (
              <button onClick={() => goTo(at + 1)}>
                {at === steps.length - 1 ? (
                  'Finish'
                ) : (
                  <>
                    Next <Icon name="next" />
                  </>
                )}
              </button>
            )}
          </>
        )}
      </div>

      {sheet === 'timer' && (
        <Sheet label="New timer" onClose={() => setSheet(null)}>
          <h2>New timer</h2>
          <form
            className="cook-custom"
            onSubmit={(e) => {
              e.preventDefault()
              startCustom()
            }}
          >
            <input placeholder="Name (optional)" value={customName} onChange={(e) => setCustomName(e.target.value)} aria-label="Timer name" />
            <div className="cook-custom-time">
              <NumberField min={1} max={999} label="minutes" value={custom} onChange={setCustom} aria-label="Minutes" />
              <span>min</span>
            </div>
            <div className="cook-custom-quick">
              {[1, 3, 5, 10, 15, 30].map((m) => (
                <button key={m} type="button" className={String(m) === String(custom) ? '' : 'secondary'} onClick={() => setCustom(String(m))}>
                  {m}
                </button>
              ))}
            </div>
            <button type="submit">
              <Icon name="timer" /> Start
            </button>
          </form>
        </Sheet>
      )}

      {openTimer && (
        <Sheet label={`${openTimer.label} timer`} onClose={() => setSheet(null)}>
          <div className={`cook-timer-big${openTimer.done ? ' done' : openTimer.endsAt == null ? ' paused' : ''}`}>
            <strong>{openTimer.done ? 'Done' : formatClock(timeLeft(openTimer, now))}</strong>
            <span>
              {openTimer.label}
              {openTimer.step != null && ` · step ${openTimer.step + 1}`}
            </span>
          </div>
          <div className="cook-timer-actions">
            <button className="secondary" disabled={openTimer.done} onClick={() => setTimer(adjustTimer(openTimer, -60))}>
              −1 min
            </button>
            <button className="secondary" onClick={() => setTimer(adjustTimer(openTimer, 60))}>
              +1 min
            </button>
            {openTimer.done ? (
              <button className="secondary" onClick={() => setTimer(restartTimer(openTimer))}>
                <Icon name="redo" /> Again
              </button>
            ) : (
              <button className="secondary" onClick={() => setTimer(openTimer.endsAt != null ? pauseTimer(openTimer) : resumeTimer(openTimer))}>
                <Icon name={openTimer.endsAt != null ? 'pause' : 'play'} /> {openTimer.endsAt != null ? 'Pause' : 'Resume'}
              </button>
            )}
          </div>
          <div className="sheet-actions">
            {openTimer.step != null && (
              <button
                className="secondary"
                onClick={() => {
                  setSheet(null)
                  showStep(openTimer.step)
                }}
              >
                Go to step {openTimer.step + 1}
              </button>
            )}
            <button className="danger" onClick={() => removeTimer(openTimer.id)}>
              {openTimer.done ? 'Stop' : 'Remove timer'}
            </button>
          </div>
        </Sheet>
      )}

      {sheet === 'steps' && (
        <Sheet label="All steps" onClose={() => setSheet(null)}>
          <h2>All steps</h2>
          <ol className="cook-step-list">
            {steps.map((step, n) => {
              const times = findTimers(step)
              return (
                <li key={n} className={n < at ? 'done' : n === at ? 'now' : ''}>
                  <button
                    type="button"
                    onClick={() => {
                      setSheet(null)
                      showStep(n)
                    }}
                  >
                    <span className="cook-step-no">{n < at ? <Icon name="check" size={13} strokeWidth={3} /> : n + 1}</span>
                    <span className="cook-step-line">
                      {step}
                      {times.length > 0 && <span className="cook-step-times"> {times.map((t) => t.label).join(', ')}</span>}
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
        </Sheet>
      )}
    </div>
  )
}
