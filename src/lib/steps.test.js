import { describe, expect, it } from 'vitest'
import { findTimers } from './cook.js'
import { scaleSteps } from './scale.js'
import { convertTemperatures } from './units.js'
import { timeFromSteps } from './recipeMeta.js'

describe('timers in steps', () => {
  const secs = (t) => findTimers(t).map((x) => x.seconds)
  it('reads hours with minutes as one timer', () => {
    expect(findTimers('Simmer for 1 hour 30 minutes')).toEqual([{ label: '1 h 30 min', seconds: 5400 }])
    expect(secs('Pečte 1 hodinu a 20 minut')).toEqual([4800])
    expect(secs('Варете 1 час и 15 минути')).toEqual([4500])
  })
  it('reads fractions and words', () => {
    expect(findTimers('Cook 1 1/2 hours')).toEqual([{ label: '1 h 30 min', seconds: 5400 }])
    expect(secs('simmer for 1/2 hr')).toEqual([1800])
    expect(secs('Bake 1½ hours')).toEqual([5400])
    expect(secs('rest for half an hour, then an hour more')).toEqual([1800, 3600])
    expect(secs('Bake 1.5 h')).toEqual([5400])
  })
  it('reads Czech and Bulgarian units', () => {
    expect(secs('Vařte 20 minut')).toEqual([1200])
    expect(secs('Pečte 2 hod.')).toEqual([7200])
    expect(secs('Печете 15 минути')).toEqual([900])
    expect(secs('Оставете 1 час')).toEqual([3600])
    expect(secs('Варете 10–15 мин.')).toEqual([900])
  })
  it('does not take a teaspoon for hours', () => {
    expect(findTimers('Добавете 1 ч.л. сол')).toEqual([])
    expect(timeFromSteps('Добавете 1 ч.л. сол')).toBe(null)
  })
  it('keeps plain labels', () => {
    expect(findTimers('Bake 25–30 minutes')).toEqual([{ label: '25–30 min', seconds: 1800 }])
    expect(findTimers('Fry 30 seconds')).toEqual([{ label: '30 s', seconds: 30 }])
  })
})

describe('step scaling', () => {
  const ings = [{ name: 'chicken breasts' }, { name: 'eggs' }]
  it('keeps how many pieces each thing is cut into', () => {
    expect(scaleSteps('Cut 2 chicken breasts into 4 pieces each.', 2, ings)).toBe('Cut 4 chicken breasts into 4 pieces each.')
    expect(scaleSteps('Beat in 2 eggs.', 2, ings)).toBe('Beat in 4 eggs.')
  })
})

describe('oven temperatures', () => {
  it('keeps one of two written scales', () => {
    expect(convertTemperatures('Preheat to 180°C / 355°F.', 'metric')).toBe('Preheat to 180°C.')
    expect(convertTemperatures('Preheat to 180°C / 355°F.', 'imperial')).toBe('Preheat to 355°F.')
    expect(convertTemperatures('Bake at 425°F (220°C) for 20 min', 'metric')).toBe('Bake at 220°C for 20 min')
    expect(convertTemperatures('Bake at 425°F (220°C) for 20 min', 'imperial')).toBe('Bake at 425°F for 20 min')
  })
  it('rounds to oven steps', () => {
    expect(convertTemperatures('180 °C', 'imperial')).toBe('350 °F')
    expect(convertTemperatures('220 °C', 'imperial')).toBe('425 °F')
    expect(convertTemperatures('350°F', 'metric')).toBe('180 °C')
    expect(convertTemperatures('375 F', 'metric')).toBe('190 °C')
    expect(convertTemperatures('Cook to 165°F inside', 'metric')).toBe('Cook to 74 °C inside')
  })
  it('reads Czech, Bulgarian, bare degrees and gas marks', () => {
    expect(convertTemperatures('Pečte na 180 stupňů', 'imperial')).toBe('Pečte na 350 °F')
    expect(convertTemperatures('Печете на 200 градуса', 'imperial')).toBe('Печете на 400 °F')
    expect(convertTemperatures('Bake at 400 degrees', 'metric')).toBe('Bake at 200 °C')
    expect(convertTemperatures('Bake at 220°', 'imperial')).toBe('Bake at 425 °F')
    expect(convertTemperatures('Gas mark 4', 'metric')).toBe('180 °C')
    expect(convertTemperatures('180 °C (gas mark 4)', 'metric')).toBe('180 °C')
    expect(convertTemperatures('Bake at 350-375°F', 'metric')).toBe('Bake at 180–190 °C')
  })
  it('leaves sizes and amounts alone', () => {
    expect(convertTemperatures('Use a 20 cm tin and 2 C flour', 'imperial')).toBe('Use a 20 cm tin and 2 C flour')
  })
})
