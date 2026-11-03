import { useEffect, useRef } from 'react'
import NumberField from './NumberField.jsx'
import Select from './Select.jsx'
import { ACTIVITY, GOALS, dailyTargets, hasProfile } from './lib/goals.js'

// Settings card for one person's daily targets. Saved on this phone, so each
// of you keeps your own; recipe pages measure portions against them.

const fmt = (n) => Math.round(n).toLocaleString('cs-CZ')

export default function GoalsSettings({ body = {}, onChange, focus = false }) {
  const ref = useRef(null)
  useEffect(() => {
    if (focus) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [focus])
  const set = (patch) => onChange({ meals: 3, activity: 'light', goal: 'maintain', ...body, ...patch })
  const t = dailyTargets(body)
  const ready = hasProfile(body)
  const goal = GOALS[body.goal ?? 'maintain']
  const act = ACTIVITY[body.activity ?? 'light']

  return (
    <section className="card goals" id="goals" ref={ref}>
      <h3>Your daily goals</h3>
      <p className="hint">Recipe pages then show each portion against your own day instead of a general 2000 kcal one. Saved on this phone only, so each of you sets your own.</p>

      <span className="settings-label">Body</span>
      <div className="segmented" role="group" aria-label="Sex">
        {[
          ['female', 'Woman'],
          ['male', 'Man'],
        ].map(([k, label]) => (
          <button key={k} type="button" className={body.sex === k ? 'on' : ''} aria-pressed={body.sex === k} onClick={() => set({ sex: k })}>
            {label}
          </button>
        ))}
      </div>
      <div className="goals-body">
        <label>
          Age (years)
          <NumberField min={15} max={100} value={body.age ?? ''} onChange={(v) => set({ age: v })} aria-label="Age in years" />
        </label>
        <label>
          Height (cm)
          <NumberField min={120} max={230} value={body.height ?? ''} onChange={(v) => set({ height: v })} aria-label="Height in cm" />
        </label>
        <label>
          Weight (kg)
          <NumberField min={35} max={250} step={0.5} value={body.weight ?? ''} onChange={(v) => set({ weight: v })} aria-label="Weight in kg" />
        </label>
      </div>

      <label>
        How active you are{' '}
        <Select aria-label="How active you are" value={body.activity ?? 'light'} onChange={(e) => set({ activity: e.target.value })}>
          {Object.entries(ACTIVITY).map(([k, a]) => (
            <option key={k} value={k}>
              {a.label}
            </option>
          ))}
        </Select>
      </label>
      <p className="hint">{act.hint}.</p>

      <span className="settings-label">Goal</span>
      <div className="segmented" role="group" aria-label="Goal">
        {Object.entries(GOALS).map(([k, g]) => (
          <button key={k} type="button" className={(body.goal ?? 'maintain') === k ? 'on' : ''} aria-pressed={(body.goal ?? 'maintain') === k} onClick={() => set({ goal: k })}>
            {g.label}
          </button>
        ))}
      </div>

      <label className="goals-meals">
        Meals a day
        <NumberField min={1} max={6} value={body.meals ?? 3} onChange={(v) => set({ meals: v })} aria-label="Meals a day" />
      </label>
      <p className="hint">A recipe portion is measured against one meal: your day divided by this.</p>

      {ready ? (
        <>
          <div className="goals-result">
            <div className="goal-kcal">
              <strong>{fmt(t.kcal)}</strong>
              <span>kcal a day</span>
            </div>
            <dl>
              <div>
                <dt>Protein</dt>
                <dd>{t.protein} g</dd>
              </div>
              <div>
                <dt>Carbs</dt>
                <dd>{t.carbs} g</dd>
              </div>
              <div>
                <dt>Fat</dt>
                <dd>{t.fat} g</dd>
              </div>
              <div>
                <dt>Fibre</dt>
                <dd>{t.fibre} g+</dd>
              </div>
              <div>
                <dt>Sugars</dt>
                <dd>max {t.sugar} g</dd>
              </div>
              <div>
                <dt>Salt</dt>
                <dd>max {t.salt} g</dd>
              </div>
            </dl>
          </div>
          <p className="hint">
            At rest you burn about {fmt(t.resting)} kcal; with your activity (× {String(act.pal).replace('.', ',')}) about {fmt(t.maintenance)} kcal keeps your weight.
            {goal.energy < 0 && ` Eating ${Math.round(-goal.energy * 100)} % less loses about ${Math.abs(t.weekly).toString().replace('.', ',')} kg a week.`}
            {goal.energy > 0 && ` Eating ${Math.round(goal.energy * 100)} % more, with strength training, gains about ${t.weekly.toString().replace('.', ',')} kg a week, mostly muscle.`} Protein is{' '}
            {goal.protein.toString().replace('.', ',')} g per kg{goal.energy < 0 ? ', high to keep your muscle while losing fat' : goal.energy > 0 ? ' for building muscle' : ''}. Per meal that is about{' '}
            {fmt(t.kcal / t.meals)} kcal and {Math.round(t.protein / t.meals)} g protein.
          </p>
          <details className="goals-how">
            <summary>How it is worked out</summary>
            <ul>
              <li>
                Resting energy: Mifflin-St Jeor, 10 × kg + 6,25 × cm − 5 × age, +5 for men, −161 for women. The most accurate of the common formulas (Frankenfield 2005
                review), usually within 10 %.
              </li>
              <li>Activity: physical activity levels of FAO/WHO/UNU 2001 (1,4 sitting to 2,2 athlete; above 2,4 is hard to keep up).</li>
              <li>Lose fat: 20 % under maintenance, never under resting energy. Build muscle: 10 % over (Iraki 2019: 10-20 %, 0,25-0,5 % of body weight a week).</li>
              <li>
                Protein: 1,4 g/kg to keep, 1,8 to build, 2,0 to lose (EFSA minimum 0,83; muscle gain levels off at 1,6, up to 2,2, Morton 2018). Counted on weight up to
                BMI 27 and at most 35 % of calories.
              </li>
              <li>Fat 25-30 % of calories (EFSA 20-35 %, WHO up to 30 %), carbs the rest. Fibre 30 g (EFSA 25+, EU 30). Salt under 5 g (WHO).</li>
              <li>Sugars: WHO says free sugars under 10 % of calories; the app counts all sugars, so it uses the EU limit of 90 g per 2000 kcal, scaled to your day.</li>
              <li>A guide for healthy adults, not for pregnancy, illness or teenagers. Your weight over a few weeks tells you more than any formula.</li>
            </ul>
          </details>
          <button type="button" className="link" onClick={() => onChange(null)}>
            Clear my goals
          </button>
        </>
      ) : (
        <p className="hint">Fill in sex, age, height and weight to see your day.</p>
      )}
    </section>
  )
}
