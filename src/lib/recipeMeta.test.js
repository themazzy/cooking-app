import { describe, expect, it } from 'vitest'
import { categoriesFrom, cuisineFrom, durationMinutes, formatMinutes, tagsFromHashtags, textDuration, timeFromSteps, timesFromText, totalMinutes } from './recipeMeta.js'
import { draftFromImport } from './recipeDraft.js'
import { recipeJsonLdMeta } from './reel/web.js'

describe('recipe times', () => {
  it('reads schema.org durations', () => {
    expect(durationMinutes('PT1H30M')).toBe(90)
    expect(durationMinutes('P0DT0H20M')).toBe(20)
    expect(durationMinutes('PT45M')).toBe(45)
    expect(durationMinutes('PT0S')).toBe(null)
    expect(durationMinutes('20 min')).toBe(20)
    expect(durationMinutes(undefined)).toBe(null)
  })

  it('reads written durations', () => {
    expect(textDuration('1 h 30 min')?.minutes).toBe(90)
    expect(textDuration('1 hour and 15 minutes')?.minutes).toBe(75)
    expect(textDuration('20–25 minut')?.minutes).toBe(25)
    expect(textDuration('1,5 hodiny')?.minutes).toBe(90)
    expect(textDuration('2 hodiny')?.minutes).toBe(120)
    expect(textDuration('45 мин')?.minutes).toBe(45)
    expect(textDuration('500 ml')).toBe(null)
  })

  it('finds labelled times in a caption', () => {
    expect(timesFromText('Pasta\nPrep time: 15 min\nCook time: 1 hour\nTotal time: 1 h 15 min')).toEqual({ prepMin: 15, cookMin: 60, totalMin: 75 })
    expect(timesFromText('⏱ Prep 10 min | Cook 20 min')).toEqual({ prepMin: 10, cookMin: 20, totalMin: null })
    expect(timesFromText('Doba přípravy: 20 minut\nDoba pečení: 45 minut')).toEqual({ prepMin: 20, cookMin: 45, totalMin: null })
    expect(timesFromText('Ready in 30 minutes!')).toEqual({ prepMin: null, cookMin: null, totalMin: 30 })
  })

  it('does not take a step for the recipe time', () => {
    expect(timesFromText('Cook 20 minutes until soft, stirring now and then so nothing sticks.').cookMin).toBe(null)
    expect(timesFromText('3 eggs\n200 g flour').prepMin).toBe(null)
  })

  it('adds up the step times', () => {
    expect(timeFromSteps('Fry the onion for 5 minutes.\nSimmer 1 hour.\nBake 25-30 min.')).toBe(95)
    expect(timeFromSteps('Vaříme 20 minut.\nNecháme odpočinout půl hodiny.')).toBe(50)
    expect(timeFromSteps('Mix everything.')).toBe(null)
  })

  it('formats and totals', () => {
    expect(formatMinutes(95)).toBe('1 h 35 min')
    expect(formatMinutes(60)).toBe('1 h')
    expect(formatMinutes(20)).toBe('20 min')
    expect(totalMinutes({ prepMin: 10, cookMin: 20 })).toBe(30)
    expect(totalMinutes({ prepMin: 10, cookMin: 20, totalMin: 45 })).toBe(45)
    expect(totalMinutes({})).toBe(null)
  })
})

describe('categories and cuisine', () => {
  it('maps site names to ours', () => {
    expect(categoriesFrom(['Hlavní jídla', 'Dessert'])).toEqual(['Main', 'Dessert'])
    expect(categoriesFrom('Main Course, Side Dish')).toEqual(['Main', 'Side'])
    expect(categoriesFrom('Recepty')).toEqual([])
    expect(cuisineFrom('Česká kuchyně')).toBe('Czech')
    expect(cuisineFrom(['Italian'])).toBe('Italian')
    expect(cuisineFrom('Georgian')).toBe('Georgian')
  })

  it('reads hashtags', () => {
    expect(tagsFromHashtags('Best cake #dessert #baking #italianfood #foodie')).toEqual({ categories: ['Dessert', 'Baking'], cuisine: 'Italian' })
  })

  it('fills a website draft', () => {
    const meta = recipeJsonLdMeta({ prepTime: 'PT15M', cookTime: 'PT2H', recipeCategory: 'Hlavní jídla', recipeCuisine: 'Česká' })
    expect(meta).toEqual({ servings: null, prepMin: 15, cookMin: 120, totalMin: null, categories: ['Main'], cuisine: 'Czech' })
    const d = draftFromImport({ platform: 'web', description: 'Svíčková\n\nIngredients:\n- 500 g hovězí', meta })
    expect([d.prepMin, d.cookMin, d.cuisine, d.categories, d.timesEstimated]).toEqual([15, 120, 'Czech', ['Main'], false])
  })

  it('estimates a reel draft from its steps', () => {
    const d = draftFromImport({ platform: 'instagram', description: 'Quick soup #soup\nIngredients:\n- 2 carrots\n- 1 onion\nSteps:\n1. Fry the onion 5 minutes.\n2. Add carrots and simmer for 20 minutes.' })
    expect(d.categories).toEqual(['Soup'])
    expect(d.cookMin).toBe(25)
    expect(d.timesEstimated).toBe(true)
  })
})
