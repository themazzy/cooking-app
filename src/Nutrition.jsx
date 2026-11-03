import { useState } from 'react'
import Icon from './Icon.jsx'
import { formatGrams, formatKcal } from './lib/calories.js'
import { DAY, DAY_KCAL, KCAL_PER_G, mealHealth } from './lib/health.js'

// Recipe page nutrition card: a donut of where the energy comes from
// (protein, carbs, fat), a balance rating with its checks, and a second
// donut of the ingredients that bring the most calories.

const MACRO_LABEL = { protein: 'Protein', carbs: 'Carbs', fat: 'Fat' }
const LEVEL_ICON = { good: 'check', ok: 'minus', poor: 'alert', high: 'alert', low: 'alert' }
const TOP = 5
/** "Salt, pepper and sugar" */
const listNames = (names) => (names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0])
const EXTRA_LABEL = { sugar: 'Sugar', fibre: 'Fibre', salt: 'Salt' }

/** Donut of `parts` ([{ key, value, color }]); `active` key is drawn thicker. */
function Donut({ parts, active, onPick, size = 132, label, children }) {
  const r = 40
  const c = 2 * Math.PI * r
  const total = parts.reduce((s, p) => s + p.value, 0)
  const gap = parts.filter((p) => p.value > 0).length > 1 ? 1.6 : 0
  let at = 0
  return (
    <div className="donut" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" role="img" aria-label={label}>
        <circle cx="50" cy="50" r={r} className="donut-track" />
        {parts.map((p) => {
          const len = total > 0 ? (p.value / total) * c : 0
          const start = at
          at += len
          if (len <= 0) return null
          const dash = Math.max(len - gap, 0.6)
          return (
            <circle
              key={p.key}
              cx="50"
              cy="50"
              r={r}
              className={`donut-seg${active === p.key ? ' on' : ''}${active && active !== p.key ? ' off' : ''}`}
              style={{ stroke: p.color }}
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-start - gap / 2}
              onClick={() => onPick?.(active === p.key ? null : p.key)}
            >
              <title>{p.title}</title>
            </circle>
          )
        })}
      </svg>
      <div className="donut-center">{children}</div>
    </div>
  )
}

export default function Nutrition({ kcal, perPortion, approx, macros, macroShare, rows, missing }) {
  const [activeMacro, setActiveMacro] = useState(null)
  const [activeRow, setActiveRow] = useState(null)
  const grams = {
    protein: macros.protein * macroShare,
    carbs: macros.carbs * macroShare,
    fat: macros.fat * macroShare,
    sugar: (macros.sugar ?? 0) * macroShare,
    fibre: (macros.fibre ?? 0) * macroShare,
    salt: (macros.salt ?? 0) * macroShare,
  }
  const saltToTaste = (macros.unweighed ?? []).length > 0
  // Rows "to taste" counted as a usual amount, once each
  const guessed = [...new Set(macros.guessed ?? [])]
  const health = mealHealth({ kcal: perPortion ? kcal : null, ...grams, saltToTaste })
  const check = Object.fromEntries((health?.checks ?? []).map((c) => [c.key, c]))
  const energyChecks = (health?.checks ?? []).filter((c) => !EXTRA_LABEL[c.key])
  const split = health?.split
  const per = perPortion ? 'per portion' : 'in total'
  const tilde = approx ? '~' : ''

  const macroParts = Object.keys(MACRO_LABEL).map((k) => ({
    key: k,
    value: grams[k] * KCAL_PER_G[k],
    color: `var(--macro-${k})`,
    title: `${MACRO_LABEL[k]}: ${formatGrams(grams[k])} g`,
  }))

  const sorted = rows.filter((r) => r.kcal > 0).sort((a, b) => b.kcal - a.kcal)
  const top = sorted.slice(0, TOP)
  const rest = sorted.slice(TOP).reduce((s, r) => s + r.kcal, 0)
  const sumKcal = sorted.reduce((s, r) => s + r.kcal, 0)
  const shade = [100, 78, 60, 45, 32]
  const rowParts = [
    ...top.map((r, n) => ({
      key: String(n),
      name: r.name,
      value: r.kcal,
      color: `color-mix(in srgb, var(--accent) ${shade[n]}%, var(--card))`,
      title: `${r.name}: ${formatKcal(r.kcal)} kcal`,
    })),
    ...(rest > 0 ? [{ key: 'rest', name: `${sorted.length - TOP} more`, value: rest, color: 'var(--donut-rest)', title: `Others: ${formatKcal(rest)} kcal` }] : []),
  ]
  const activePart = rowParts.find((p) => p.key === activeRow)

  return (
    <section className={`card nutrition${health ? ` health-${health.level}` : ''}`}>
      <div className="nutrition-head">
        <h2>Nutrition</h2>
        {health && (
          <span className={`health-badge ${health.level}`}>
            <Icon name={LEVEL_ICON[health.level]} size={14} /> {health.label}
          </span>
        )}
      </div>

      <div className="nutrition-main">
        <Donut parts={macroParts} active={activeMacro} onPick={setActiveMacro} label="Energy from protein, carbs and fat">
          {activeMacro ? (
            <>
              <strong>{Math.round((split?.[activeMacro] ?? 0) * 100)} %</strong>
              <span>{MACRO_LABEL[activeMacro].toLowerCase()}</span>
            </>
          ) : (
            <>
              <strong>
                {tilde}
                {formatKcal(kcal)}
              </strong>
              <span>kcal</span>
            </>
          )}
        </Donut>
        <ul className="macro-legend">
          {macroParts.map((p) => (
            <li key={p.key} className={activeMacro && activeMacro !== p.key ? 'off' : ''}>
              <button type="button" onClick={() => setActiveMacro(activeMacro === p.key ? null : p.key)}>
                <i className="swatch" style={{ background: p.color }} />
                <span className="name">{MACRO_LABEL[p.key]}</span>
                <strong>
                  {tilde}
                  {formatGrams(grams[p.key])} g
                </strong>
                <span className="share">{split ? `${Math.round(split[p.key] * 100)} %` : ''}</span>
              </button>
            </li>
          ))}
          <li className="per">
            {per}
            {perPortion ? ` · ${Math.round((kcal / DAY_KCAL) * 100)} % of a day` : ''}
          </li>
        </ul>
      </div>

      {health && (
        <div className="extras">
          {Object.keys(EXTRA_LABEL).map((k) => {
            const c = check[k]
            const share = grams[k] / DAY[k]
            return (
              <div key={k} className={`extra ${c?.level ?? ''}`} title={c ? `${c.title}: ${c.text}` : undefined}>
                <div className="extra-top">
                  <span>{EXTRA_LABEL[k]}</span>
                  {c && (
                    <span className="dot">
                      <Icon name={LEVEL_ICON[c.level]} size={10} />
                    </span>
                  )}
                </div>
                <strong>
                  {tilde}
                  {formatGrams(grams[k])} g{k === 'salt' && saltToTaste ? '+' : ''}
                </strong>
                <div className="meter" role="img" aria-label={`${Math.round(share * 100)} % of a day`}>
                  <i style={{ width: `${Math.min(share, 1) * 100}%` }} />
                </div>
                <span className="extra-sub">
                  {Math.round(share * 100)} % of a day
                </span>
              </div>
            )
          })}
        </div>
      )}

      {health && (
        <ul className="health-checks">
          {[...energyChecks, ...['sugar', 'fibre', 'salt'].map((k) => check[k]).filter(Boolean)].map((c) => (
            <li key={c.key} className={c.level}>
              <span className="dot">
                <Icon name={LEVEL_ICON[c.level]} size={12} />
              </span>
              <span>
                <strong>{c.title}</strong> {c.text}
              </span>
            </li>
          ))}
        </ul>
      )}

      {sorted.length > 0 && (
        <details className="kcal-sum">
          <summary>
            <Icon name="flame" size={15} /> Where the calories come from
          </summary>
          <div className="kcal-sources">
            <Donut parts={rowParts} active={activeRow} onPick={setActiveRow} size={112} label="Calories by ingredient">
              {activePart ? (
                <>
                  <strong>{Math.round((activePart.value / sumKcal) * 100)} %</strong>
                  <span>of kcal</span>
                </>
              ) : (
                <>
                  <strong>{top.length > 0 ? `${Math.round((top[0].kcal / sumKcal) * 100)} %` : ''}</strong>
                  <span>top one</span>
                </>
              )}
            </Donut>
            <ul>
              {rowParts.map((p) => (
                <li key={p.key} className={activeRow && activeRow !== p.key ? 'off' : ''} onClick={() => setActiveRow(activeRow === p.key ? null : p.key)}>
                  <i className="swatch" style={{ background: p.color }} />
                  <span className="name">{p.name}</span>
                  <span>{formatKcal(p.value)} kcal</span>
                </li>
              ))}
            </ul>
          </div>
          {sorted.length > TOP && (
            <ul className="kcal-all">
              {sorted.slice(TOP).map((r, n) => (
                <li key={n}>
                  <span>{r.name}</span>
                  <span>{formatKcal(r.kcal)} kcal</span>
                </li>
              ))}
            </ul>
          )}
          {missing.length > 0 && (
            <p className="note">Not counted (no amount or calories known): {missing.join(', ')}. Calories of your own ingredients can be set on the Ingredients tab.</p>
          )}
        </details>
      )}
      <p className="note nutrition-foot">
        An estimate from typical values for raw ingredients. Days are the EU reference intakes (2000 kcal, 90 g sugars, 30 g fibre, 6 g salt).
        {guessed.length > 0 ? ` ${listNames(guessed)} ${guessed.length === 1 ? 'has' : 'have'} no amount, so ${guessed.length === 1 ? 'it counts' : 'they count'} as a usual pinch or spoon per portion (1 g salt, 0.2 g pepper, 2 g sugar, 5 g oil).` : ''}
        {saltToTaste ? ' Salt added to taste is not counted.' : ''}
      </p>
    </section>
  )
}
